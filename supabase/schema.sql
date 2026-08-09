-- OpenForm Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE form_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE theme_preset AS ENUM ('midnight', 'ocean', 'sunset', 'forest', 'lavender', 'minimal');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Forms table
CREATE TABLE forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Form',
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  status form_status DEFAULT 'draft' NOT NULL,
  theme theme_preset DEFAULT 'minimal' NOT NULL,
  questions JSONB DEFAULT '[]'::jsonb NOT NULL,
  thank_you_message TEXT DEFAULT 'Thank you for your response!' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster slug lookups
CREATE INDEX idx_forms_user_id ON forms(user_id);
CREATE INDEX idx_forms_status ON forms(status);

-- Responses table
CREATE TABLE responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Private file metadata. R2 objects are addressed by object_key and never by a
-- public URL. Pending uploads have no response_id until submission succeeds.
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

-- Durable, privacy-preserving counters used by server-side rate limiting.
CREATE TABLE request_rate_limits (
  identifier_hash TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 1 NOT NULL,
  window_started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster response lookups
CREATE INDEX idx_responses_form_id ON responses(form_id);
CREATE INDEX idx_responses_submitted_at ON responses(submitted_at DESC);
CREATE INDEX idx_uploads_form_id ON uploads(form_id);
CREATE INDEX idx_uploads_response_id ON uploads(response_id);
CREATE INDEX idx_uploads_pending ON uploads(created_at) WHERE response_id IS NULL;

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_rate_limits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Forms policies
CREATE POLICY "Users can view their own forms"
  ON forms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forms"
  ON forms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms"
  ON forms FOR UPDATE
  USING (auth.uid() = user_id);

-- Public can view published forms (for form submissions)
CREATE POLICY "Anyone can view published forms"
  ON forms FOR SELECT
  USING (status = 'published');

-- Responses policies
CREATE POLICY "Form owners can view responses"
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Form owners can view uploads"
  ON uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = uploads.form_id
      AND forms.user_id = auth.uid()
    )
  );

-- Functions and Triggers

-- Function to handle new user signup
-- Handles both Google OAuth (uses 'name', 'picture') and email signups (uses 'full_name', 'avatar_url')
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles AS profile (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profile.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profile.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atomically consume a durable rate-limit counter. Only the service role can
-- call this function, so clients cannot reset or forge counters directly.
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

-- Insert a validated response and claim its pending uploads in one transaction.
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

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT, uid UUID)
RETURNS TEXT AS $$
DECLARE
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM forms WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
