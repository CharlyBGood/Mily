-- Add a policy to allow public read access to meals
-- This is needed for the direct sharing feature
CREATE POLICY IF NOT EXISTS "Public read access to meals for sharing"
  ON public.meals
  FOR SELECT
  USING (true);
