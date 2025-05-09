-- Helper functions to check if tables and columns exist
CREATE OR REPLACE FUNCTION check_table_exists(table_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = table_name
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name 
        AND column_name = column_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to execute SQL safely
CREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error executing SQL: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create user_settings table if it doesn't exist
DO $$
BEGIN
    IF NOT check_table_exists('user_settings') THEN
        EXECUTE '
            CREATE TABLE public.user_settings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                username TEXT,
                full_name TEXT,
                bio TEXT,
                avatar_url TEXT,
                cycle_duration INTEGER DEFAULT 7,
                cycle_start_day INTEGER DEFAULT 1,
                sweet_dessert_limit INTEGER DEFAULT 3,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
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
        ';
    END IF;
END
$$;

-- Add cycle_start_day column if it doesn't exist
DO $$
BEGIN
    IF check_table_exists('user_settings') AND NOT check_column_exists('user_settings', 'cycle_start_day') THEN
        EXECUTE 'ALTER TABLE public.user_settings ADD COLUMN cycle_start_day INTEGER DEFAULT 1';
    END IF;
END
$$;

-- Fix any null values in cycle_start_day
UPDATE public.user_settings 
SET cycle_start_day = 1 
WHERE cycle_start_day IS NULL;

-- Create function to get user cycle settings
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
    FROM 
        public.user_settings us
    WHERE 
        us.user_id = get_user_cycle_settings.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_user_cycle_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_cycle_settings TO anon;
GRANT EXECUTE ON FUNCTION get_user_cycle_settings TO service_role;

-- Create or update the meals table
DO $$
BEGIN
    IF NOT check_table_exists('meals') THEN
        EXECUTE '
            CREATE TABLE public.meals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                photo_url TEXT NOT NULL,
                meal_type TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Add RLS policies
            ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view their own meals" 
            ON public.meals FOR SELECT 
            USING (auth.uid() = user_id);
            
            CREATE POLICY "Users can insert their own meals" 
            ON public.meals FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY "Users can update their own meals" 
            ON public.meals FOR UPDATE 
            USING (auth.uid() = user_id);
            
            CREATE POLICY "Users can delete their own meals" 
            ON public.meals FOR DELETE 
            USING (auth.uid() = user_id);
        ';
    END IF;
END
$$;

-- Add photo_url NOT NULL constraint if it doesn't have it
DO $$
BEGIN
    -- First check if the column exists and is nullable
    IF check_table_exists('meals') AND check_column_exists('meals', 'photo_url') THEN
        -- Check if the column is nullable
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meals' 
            AND column_name = 'photo_url'
            AND is_nullable = 'YES'
        ) THEN
            -- Update any NULL values to a placeholder
            EXECUTE 'UPDATE public.meals SET photo_url = ''/placeholder.svg?height=300&width=300'' WHERE photo_url IS NULL';
            
            -- Add NOT NULL constraint
            EXECUTE 'ALTER TABLE public.meals ALTER COLUMN photo_url SET NOT NULL';
        END IF;
    END IF;
END
$$;

-- Make description nullable if it's not already
DO $$
BEGIN
    -- Check if the column exists and is not nullable
    IF check_table_exists('meals') AND check_column_exists('meals', 'description') THEN
        -- Check if the column is not nullable
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meals' 
            AND column_name = 'description'
            AND is_nullable = 'NO'
        ) THEN
            -- Make the column nullable
            EXECUTE 'ALTER TABLE public.meals ALTER COLUMN description DROP NOT NULL';
        END IF;
    END IF;
END
$$;

-- Create or update the shared_meals table for sharing functionality
DO $$
BEGIN
    IF NOT check_table_exists('shared_meals') THEN
        EXECUTE '
            CREATE TABLE public.shared_meals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                share_id TEXT UNIQUE NOT NULL,
                title TEXT,
                description TEXT,
                is_public BOOLEAN DEFAULT true,
                password TEXT,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Add RLS policies
            ALTER TABLE public.shared_meals ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view their own shared meals" 
            ON public.shared_meals FOR SELECT 
            USING (auth.uid() = user_id);
            
            CREATE POLICY "Users can insert their own shared meals" 
            ON public.shared_meals FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY "Users can update their own shared meals" 
            ON public.shared_meals FOR UPDATE 
            USING (auth.uid() = user_id);
            
            CREATE POLICY "Users can delete their own shared meals" 
            ON public.shared_meals FOR DELETE 
            USING (auth.uid() = user_id);
            
            CREATE POLICY "Public can view public shared meals" 
            ON public.shared_meals FOR SELECT 
            USING (is_public = true);
        ';
    END IF;
END
$$;

-- Create or update the shared_meal_items table
DO $$
BEGIN
    IF NOT check_table_exists('shared_meal_items') THEN
        EXECUTE '
            CREATE TABLE public.shared_meal_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                shared_meal_id UUID REFERENCES public.shared_meals(id) ON DELETE CASCADE,
                meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Add RLS policies
            ALTER TABLE public.shared_meal_items ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view their own shared meal items" 
            ON public.shared_meal_items FOR SELECT 
            USING (
                EXISTS (
                    SELECT 1 FROM public.shared_meals sm 
                    WHERE sm.id = shared_meal_id AND sm.user_id = auth.uid()
                )
            );
            
            CREATE POLICY "Users can insert their own shared meal items" 
            ON public.shared_meal_items FOR INSERT 
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.shared_meals sm 
                    WHERE sm.id = shared_meal_id AND sm.user_id = auth.uid()
                )
            );
            
            CREATE POLICY "Users can delete their own shared meal items" 
            ON public.shared_meal_items FOR DELETE 
            USING (
                EXISTS (
                    SELECT 1 FROM public.shared_meals sm 
                    WHERE sm.id = shared_meal_id AND sm.user_id = auth.uid()
                )
            );
            
            CREATE POLICY "Public can view public shared meal items" 
            ON public.shared_meal_items FOR SELECT 
            USING (
                EXISTS (
                    SELECT 1 FROM public.shared_meals sm 
                    WHERE sm.id = shared_meal_id AND sm.is_public = true
                )
            );
        ';
    END IF;
END
$$;

-- Create or update the view_logs table for tracking views
DO $$
BEGIN
    IF NOT check_table_exists('view_logs') THEN
        EXECUTE '
            CREATE TABLE public.view_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                shared_meal_id UUID REFERENCES public.shared_meals(id) ON DELETE CASCADE,
                viewer_ip TEXT,
                viewer_user_id UUID,
                viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Add RLS policies
            ALTER TABLE public.view_logs ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view logs of their shared meals" 
            ON public.view_logs FOR SELECT 
            USING (
                EXISTS (
                    SELECT 1 FROM public.shared_meals sm 
                    WHERE sm.id = shared_meal_id AND sm.user_id = auth.uid()
                )
            );
            
            CREATE POLICY "Anyone can insert view logs" 
            ON public.view_logs FOR INSERT 
            WITH CHECK (true);
        ';
    END IF;
END
$$;

-- Create or update the profiles table
DO $$
BEGIN
    IF NOT check_table_exists('profiles') THEN
        EXECUTE '
            CREATE TABLE public.profiles (
                id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                email TEXT,
                username TEXT UNIQUE,
                full_name TEXT,
                avatar_url TEXT,
                bio TEXT,
                website TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Add RLS policies
            ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Public profiles are viewable by everyone" 
            ON public.profiles FOR SELECT 
            USING (true);
            
            CREATE POLICY "Users can insert their own profile" 
            ON public.profiles FOR INSERT 
            WITH CHECK (auth.uid() = id);
            
            CREATE POLICY "Users can update their own profile" 
            ON public.profiles FOR UPDATE 
            USING (auth.uid() = id);
        ';
    END IF;
END
$$;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND c.column_name = 'updated_at'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
        ', table_name, table_name);
    END LOOP;
END
$$;

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Database setup and fixes completed successfully';
END
$$;
