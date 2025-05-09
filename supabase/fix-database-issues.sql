-- Create helper functions if they don't exist
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = $1
    AND column_name = $2
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION execute_sql(sql_command text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_command;
END;
$$ LANGUAGE plpgsql;

-- Check if user_settings table exists and create it if it doesn't
DO $$
BEGIN
  IF NOT check_table_exists('user_settings') THEN
    CREATE TABLE public.user_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT UNIQUE,
      cycle_duration INTEGER NOT NULL DEFAULT 7,
      cycle_start_day INTEGER NOT NULL DEFAULT 1,
      sweet_dessert_limit INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Add RLS policies
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own settings" 
      ON public.user_settings FOR SELECT 
      USING (auth.uid() = user_id);
      
    CREATE POLICY "Users can insert their own settings" 
      ON public.user_settings FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
      
    CREATE POLICY "Users can update their own settings" 
      ON public.user_settings FOR UPDATE 
      USING (auth.uid() = user_id);
  ELSE
    -- Table exists, check if cycle_start_day column exists
    IF NOT check_column_exists('user_settings', 'cycle_start_day') THEN
      ALTER TABLE public.user_settings ADD COLUMN cycle_start_day INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    -- Check if sweet_dessert_limit column exists
    IF NOT check_column_exists('user_settings', 'sweet_dessert_limit') THEN
      ALTER TABLE public.user_settings ADD COLUMN sweet_dessert_limit INTEGER NOT NULL DEFAULT 3;
    END IF;
  END IF;
END $$;

-- Fix any null values in cycle_start_day
UPDATE public.user_settings 
SET cycle_start_day = 1 
WHERE cycle_start_day IS NULL;

-- Ensure profiles table has username column
DO $$
BEGIN
  IF check_table_exists('profiles') AND NOT check_column_exists('profiles', 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Sync usernames between user_settings and profiles
DO $$
BEGIN
  -- Update profiles with usernames from user_settings where profile username is null
  EXECUTE '
    UPDATE public.profiles p
    SET username = us.username
    FROM public.user_settings us
    WHERE p.id = us.user_id AND p.username IS NULL AND us.username IS NOT NULL;
  ';
  
  -- Update user_settings with usernames from profiles where user_settings username is null
  EXECUTE '
    UPDATE public.user_settings us
    SET username = p.username
    FROM public.profiles p
    WHERE us.user_id = p.id AND us.username IS NULL AND p.username IS NOT NULL;
  ';
END $$;

-- Create or update function to get user cycle settings
CREATE OR REPLACE FUNCTION get_user_cycle_settings(user_id UUID)
RETURNS TABLE (
  cycle_duration INTEGER,
  cycle_start_day INTEGER,
  sweet_dessert_limit INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.cycle_duration, 7) as cycle_duration,
    COALESCE(us.cycle_start_day, 1) as cycle_start_day,
    COALESCE(us.sweet_dessert_limit, 3) as sweet_dessert_limit
  FROM user_settings us
  WHERE us.user_id = $1;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_user_settings_updated_at'
  ) THEN
    CREATE TRIGGER set_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  END IF;
END $$;
