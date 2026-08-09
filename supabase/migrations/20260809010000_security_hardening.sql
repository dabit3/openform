-- Remove client-side delete/write paths that bypass validation and R2 cleanup.
DROP POLICY IF EXISTS "Users can delete their own forms" ON forms;
DROP POLICY IF EXISTS "Form owners can delete responses" ON responses;
DROP POLICY IF EXISTS "Anyone can submit responses to published forms" ON responses;

CREATE TABLE uploads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  object_key TEXT UNIQUE NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE request_rate_limits (
  identifier_hash TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 1 NOT NULL,
  window_started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_uploads_form_id ON uploads(form_id);
CREATE INDEX idx_uploads_response_id ON uploads(response_id);
CREATE INDEX idx_uploads_pending ON uploads(created_at) WHERE response_id IS NULL;

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form owners can view uploads"
  ON uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = uploads.form_id
      AND forms.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_identifier_hash TEXT,
  p_limit_count INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO public.request_rate_limits (identifier_hash, request_count, window_started_at)
  VALUES (p_identifier_hash, 1, NOW())
  ON CONFLICT (identifier_hash) DO UPDATE SET
    request_count = CASE
      WHEN public.request_rate_limits.window_started_at <= NOW() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public.request_rate_limits.request_count + 1
    END,
    window_started_at = CASE
      WHEN public.request_rate_limits.window_started_at <= NOW() - make_interval(secs => p_window_seconds)
        THEN NOW()
      ELSE public.request_rate_limits.window_started_at
    END
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION submit_form_response(
  p_form_id UUID,
  p_answers JSONB,
  p_upload_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
  new_response_id UUID;
  claimed_uploads INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Form is not accepting responses';
  END IF;

  INSERT INTO public.responses (form_id, answers)
  VALUES (p_form_id, p_answers)
  RETURNING id INTO new_response_id;

  IF CARDINALITY(p_upload_ids) > 0 THEN
    UPDATE public.uploads
    SET response_id = new_response_id
    WHERE id = ANY(p_upload_ids)
      AND form_id = p_form_id
      AND response_id IS NULL;

    GET DIAGNOSTICS claimed_uploads = ROW_COUNT;
    IF claimed_uploads <> CARDINALITY(p_upload_ids) THEN
      RAISE EXCEPTION 'One or more uploads are invalid or already used';
    END IF;
  END IF;

  RETURN new_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION submit_form_response(UUID, JSONB, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_form_response(UUID, JSONB, UUID[]) TO service_role;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles AS profile (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profile.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profile.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
