-- Drop tables that are no longer needed for the direct sharing approach
DROP TABLE IF EXISTS public.share_links CASCADE;
DROP TABLE IF EXISTS public.share_link_meals CASCADE;
DROP TABLE IF EXISTS public.share_tokens CASCADE;

-- Drop any functions related to these tables
DROP FUNCTION IF EXISTS public.handle_new_share_link() CASCADE;
DROP FUNCTION IF EXISTS public.handle_share_link_access() CASCADE;

-- Create a policy to allow public read access to meals for sharing purposes
CREATE POLICY IF NOT EXISTS "Allow public read access to meals via share links" 
ON public.meals
FOR SELECT
USING (true);

-- Ensure the meals table has the necessary indexes for efficient querying
CREATE INDEX IF NOT EXISTS meals_user_id_idx ON public.meals (user_id);
CREATE INDEX IF NOT EXISTS meals_created_at_idx ON public.meals (created_at);
