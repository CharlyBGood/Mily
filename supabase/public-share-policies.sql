-- This script creates the necessary policies to allow public access to shared data

-- Allow public access to meals for sharing
CREATE POLICY IF NOT EXISTS "Public can view meals for sharing" 
ON public.meals 
FOR SELECT 
USING (true);

-- Allow public access to user_settings for sharing
CREATE POLICY IF NOT EXISTS "Public can view user_settings for sharing" 
ON public.user_settings 
FOR SELECT 
USING (true);

-- Ensure the share page can access user data
CREATE POLICY IF NOT EXISTS "Public can view user profiles for sharing" 
ON public.profiles 
FOR SELECT 
USING (true);
