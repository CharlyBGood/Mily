-- Allow public access to meals for sharing
CREATE POLICY "Public can view meals for sharing" ON public.meals
FOR SELECT USING (true);

-- Allow public access to user_settings for sharing
CREATE POLICY "Public can view user_settings for sharing" ON public.user_settings
FOR SELECT USING (true);
