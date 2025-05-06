-- Add cycle_start_day column to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS cycle_start_day INTEGER NOT NULL DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN public.user_settings.cycle_start_day IS 'Day of week to start cycle (0=Sunday, 1=Monday, ..., 6=Saturday)';

-- Update existing rows to default to Monday (1)
UPDATE public.user_settings
SET cycle_start_day = 1
WHERE cycle_start_day IS NULL;
