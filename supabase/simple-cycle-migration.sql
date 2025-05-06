-- Check if user_settings table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
  ) THEN
    CREATE TABLE public.user_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT UNIQUE,
      cycle_duration INTEGER NOT NULL DEFAULT 7,
      sweet_dessert_limit INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id)
    );
    
    -- Enable RLS
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can read their own settings" 
    ON public.user_settings 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own settings" 
    ON public.user_settings 
    FOR UPDATE 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own settings" 
    ON public.user_settings 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
    -- Create index
    CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
  END IF;
END
$$;

-- Add cycle_start_day column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
    AND column_name = 'cycle_start_day'
  ) THEN
    ALTER TABLE public.user_settings 
    ADD COLUMN cycle_start_day INTEGER NOT NULL DEFAULT 1;
    
    COMMENT ON COLUMN public.user_settings.cycle_start_day IS 'Day of week to start cycle (0=Sunday, 1=Monday, ..., 6=Saturday)';
    
    -- Update existing rows to default to Monday (1)
    UPDATE public.user_settings
    SET cycle_start_day = 1;
  END IF;
END
$$;

-- Create helper functions if they don't exist
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = check_table_exists.table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = check_column_exists.table_name
    AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;

-- Grant access to these functions
GRANT EXECUTE ON FUNCTION public.check_table_exists TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_column_exists TO authenticated;
