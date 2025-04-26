-- Create a new table for storing share links with short identifiers
CREATE TABLE IF NOT EXISTS public.share_links (
  id SERIAL PRIMARY KEY,
  short_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Add a constraint to ensure short_id is alphanumeric and between 6-12 chars
  CONSTRAINT short_id_format CHECK (short_id ~ '^[a-zA-Z0-9]{6,12}$')
);

-- Create an index for faster lookups by short_id
CREATE INDEX IF NOT EXISTS idx_share_links_short_id ON public.share_links (short_id);

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_share_links_user_id ON public.share_links (user_id);

-- Create a function to generate a random short ID
CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
  chars_length INTEGER := length(chars);
BEGIN
  -- Generate an 8-character random string
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * chars_length) + 1, 1);
  END LOOP;
  
  RETURN result;
END;
$$;

-- Create a function to create a new share link
CREATE OR REPLACE FUNCTION public.create_share_link(p_user_id UUID, p_expires_in_days INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_short_id TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE := NULL;
BEGIN
  -- Calculate expiration date if provided
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := now() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;
  
  -- Generate a unique short ID
  LOOP
    v_short_id := public.generate_short_id();
    
    -- Try to insert with this short_id
    BEGIN
      INSERT INTO public.share_links (short_id, user_id, expires_at)
      VALUES (v_short_id, p_user_id, v_expires_at);
      
      -- If we get here, the insert succeeded
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- If we get a unique violation, try again with a new short_id
      CONTINUE;
    END;
  END LOOP;
  
  RETURN v_short_id;
END;
$$;

-- Create a function to get user_id from short_id
CREATE OR REPLACE FUNCTION public.get_user_id_from_share_link(p_short_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.share_links
  WHERE short_id = p_short_id
    AND (expires_at IS NULL OR expires_at > now())
    AND is_active = true;
    
  RETURN v_user_id;
END;
$$;

-- Create a policy to allow public read access to share_links
CREATE POLICY "Allow public read access to share_links" 
ON public.share_links
FOR SELECT 
USING (true);

-- Create a policy to allow users to create their own share links
CREATE POLICY "Allow users to create their own share links" 
ON public.share_links
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a policy to allow users to update their own share links
CREATE POLICY "Allow users to update their own share links" 
ON public.share_links
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a policy to allow users to delete their own share links
CREATE POLICY "Allow users to delete their own share links" 
ON public.share_links
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on the share_links table
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
