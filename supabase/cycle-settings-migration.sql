-- Add cycle_start_day column to user_settings table if it doesn't exist
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS cycle_start_day INTEGER NOT NULL DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN public.user_settings.cycle_start_day IS 'Day of week to start cycle (0=Sunday, 1=Monday, ..., 6=Saturday)';

-- Update existing rows to default to Monday (1)
UPDATE public.user_settings
SET cycle_start_day = 1
WHERE cycle_start_day IS NULL;

-- Create an index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Add RLS policies for the user_settings table
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own settings
DROP POLICY IF EXISTS "Users can read their own settings" ON public.user_settings;
CREATE POLICY "Users can read their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to update their own settings
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for users to insert their own settings
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
