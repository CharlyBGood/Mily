-- This SQL file contains all the necessary Supabase configurations for the direct sharing feature

-- 1. Create a policy to allow public read access to meals for sharing
CREATE POLICY "Allow public read access to meals for direct sharing" 
ON public.meals
FOR SELECT 
USING (true);

-- 2. Create an index to optimize meal retrieval by user_id
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals (user_id);

-- 3. Create a function to efficiently retrieve meals for a specific user
CREATE OR REPLACE FUNCTION public.get_user_meals_for_sharing(p_user_id UUID)
RETURNS SETOF meals
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.meals 
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
$$;

-- 4. Create a function to check if a user has sharing enabled
-- This is a placeholder - you can expand this based on your requirements
CREATE OR REPLACE FUNCTION public.is_sharing_enabled(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, we'll just check if the user exists
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id);
END;
$$;
