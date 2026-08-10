-- The anon key ships in the browser bundle, and this policy let anyone SELECT
-- every published form of every tenant via PostgREST (title, questions JSONB,
-- owner user_id), defeating the "form URL is the sharing mechanism" model and
-- enabling enumeration of all formIds. The public form page and the response/
-- upload API routes fetch forms server-side with the service-role client
-- (filtered by slug), so anon no longer needs any direct SELECT on forms.
DROP POLICY IF EXISTS "Anyone can view published forms" ON forms;
