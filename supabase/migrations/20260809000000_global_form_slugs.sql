-- Public form URLs are keyed only by slug, so slugs must be globally unique.
-- Existing duplicates were already inaccessible through /f/[slug]; preserve the
-- oldest URL and give later forms a deterministic, collision-safe suffix.
DO $$
DECLARE
  duplicate_form RECORD;
  candidate_slug TEXT;
  suffix INTEGER;
BEGIN
  FOR duplicate_form IN
    SELECT id, slug
    FROM (
      SELECT
        id,
        slug,
        ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS slug_rank
      FROM forms
    ) ranked_forms
    WHERE slug_rank > 1
  LOOP
    candidate_slug := duplicate_form.slug || '-' || SUBSTRING(duplicate_form.id::TEXT FROM 1 FOR 8);
    suffix := 1;

    WHILE EXISTS (
      SELECT 1 FROM forms
      WHERE slug = candidate_slug AND id <> duplicate_form.id
    ) LOOP
      candidate_slug := duplicate_form.slug || '-' || SUBSTRING(duplicate_form.id::TEXT FROM 1 FOR 8) || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;

    UPDATE forms SET slug = candidate_slug WHERE id = duplicate_form.id;
  END LOOP;
END
$$;

ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_user_id_slug_key;
DROP INDEX IF EXISTS idx_forms_slug;
ALTER TABLE forms ADD CONSTRAINT forms_slug_key UNIQUE (slug);

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
