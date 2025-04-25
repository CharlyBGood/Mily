-- Create share_links table
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    access_code TEXT,
    is_password_protected BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Add RLS policies
    CONSTRAINT share_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own share links
CREATE POLICY share_links_user_policy ON public.share_links
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policy for public access to active share links (read-only)
CREATE POLICY share_links_public_policy ON public.share_links
    FOR SELECT
    USING (is_active = true);

-- Create index for faster lookups
CREATE INDEX share_links_user_id_idx ON public.share_links (user_id);
CREATE INDEX share_links_is_active_idx ON public.share_links (is_active);
