-- This is the only SQL you need to run in your Supabase project
-- It allows public read access to the meals table, which is necessary for the sharing feature

-- Add a policy to allow public read access to meals
CREATE POLICY IF NOT EXISTS "Public read access to meals for sharing"
  ON public.meals
  FOR SELECT
  USING (true);
