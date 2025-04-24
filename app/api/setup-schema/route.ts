import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase-client"

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // Create the setup_schema function if it doesn't exist
    const { error: functionError } = await supabase.rpc("create_setup_function")

    if (functionError) {
      // Function might not exist yet, create it directly
      const { error: createFunctionError } = await supabase.rpc("exec_sql", {
        sql_query: `
          CREATE OR REPLACE FUNCTION setup_schema()
          RETURNS void AS $$
          BEGIN
            -- Create meals table if it doesn't exist
            CREATE TABLE IF NOT EXISTS meals (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL,
              description TEXT NOT NULL,
              meal_type TEXT NOT NULL,
              photo_url TEXT,
              notes TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Create index on user_id for faster queries
            CREATE INDEX IF NOT EXISTS meals_user_id_idx ON meals(user_id);
            
            -- Create index on created_at for sorting
            CREATE INDEX IF NOT EXISTS meals_created_at_idx ON meals(created_at);
            
            -- Create RLS policies
            ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
            
            -- Drop policies if they exist (to avoid errors when recreating)
            DROP POLICY IF EXISTS "Users can view their own meals" ON meals;
            DROP POLICY IF EXISTS "Users can insert their own meals" ON meals;
            DROP POLICY IF EXISTS "Users can update their own meals" ON meals;
            DROP POLICY IF EXISTS "Users can delete their own meals" ON meals;
            
            -- Create policies
            CREATE POLICY "Users can view their own meals" 
              ON meals FOR SELECT 
              USING (auth.uid() = user_id);
              
            CREATE POLICY "Users can insert their own meals" 
              ON meals FOR INSERT 
              WITH CHECK (auth.uid() = user_id);
              
            CREATE POLICY "Users can update their own meals" 
              ON meals FOR UPDATE 
              USING (auth.uid() = user_id);
              
            CREATE POLICY "Users can delete their own meals" 
              ON meals FOR DELETE 
              USING (auth.uid() = user_id);
          END;
          $$ LANGUAGE plpgsql;
          
          -- Create a function to create the meals table
          CREATE OR REPLACE FUNCTION create_meals_table()
          RETURNS void AS $$
          BEGIN
            -- Create meals table if it doesn't exist
            CREATE TABLE IF NOT EXISTS meals (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL,
              description TEXT NOT NULL,
              meal_type TEXT NOT NULL,
              photo_url TEXT,
              notes TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Create index on user_id for faster queries
            CREATE INDEX IF NOT EXISTS meals_user_id_idx ON meals(user_id);
            
            -- Create index on created_at for sorting
            CREATE INDEX IF NOT EXISTS meals_created_at_idx ON meals(created_at);
            
            -- Create RLS policies
            ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
            
            -- Create policies
            CREATE POLICY "Users can view their own meals" 
              ON meals FOR SELECT 
              USING (auth.uid() = user_id);
              
            CREATE POLICY "Users can insert their own meals" 
              ON meals FOR INSERT 
              WITH CHECK (auth.uid() = user_id);
              
            CREATE POLICY "Users can update their own meals" 
              ON meals FOR UPDATE 
              USING (auth.uid() = user_id);
              
            CREATE POLICY "Users can delete their own meals" 
              ON meals FOR DELETE 
              USING (auth.uid() = user_id);
          END;
          $$ LANGUAGE plpgsql;
        `,
      })

      if (createFunctionError) {
        return NextResponse.json(
          {
            success: false,
            error: createFunctionError.message,
          },
          { status: 500 },
        )
      }
    }

    // Now call the setup_schema function
    const { error } = await supabase.rpc("setup_schema")

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Database schema set up successfully",
    })
  } catch (error) {
    console.error("Error setting up schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
