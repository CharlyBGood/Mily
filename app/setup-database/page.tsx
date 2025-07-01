"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { ArrowLeft, Loader2, Check, AlertCircle, Database } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SetupDatabasePage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/login")
    }
  }, [user, router, loading])

  const setupDatabase = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // Execute the SQL script to create tables
      const sql = `
      -- Create profiles table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
        email TEXT NOT NULL,
        username TEXT UNIQUE,
        full_name TEXT,
        avatar_url TEXT,
        bio TEXT,
        website TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create user_settings table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.user_settings (
        user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
        username TEXT UNIQUE,
        cycle_duration INTEGER DEFAULT 7,
        cycle_start_day INTEGER DEFAULT 1,
        sweet_dessert_limit INTEGER DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS (Row Level Security)
      ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      DO $$
      BEGIN
        -- Check if the policy exists before creating it
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Public profiles are viewable by everyone'
        ) THEN
          CREATE POLICY "Public profiles are viewable by everyone"
            ON profiles FOR SELECT
            USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Users can update their own profile'
        ) THEN
          CREATE POLICY "Users can update their own profile"
            ON profiles FOR UPDATE
            USING (auth.uid() = id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'user_settings' 
          AND policyname = 'Users can view any user settings'
        ) THEN
          CREATE POLICY "Users can view any user settings"
            ON user_settings FOR SELECT
            USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'user_settings' 
          AND policyname = 'Users can update their own settings'
        ) THEN
          CREATE POLICY "Users can update their own settings"
            ON user_settings FOR UPDATE
            USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'user_settings' 
          AND policyname = 'Users can insert their own settings'
        ) THEN
          CREATE POLICY "Users can insert their own settings"
            ON user_settings FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        END IF;
      END
      $$;
      `

      // Execute the SQL using a service role key (this would typically be done in a server-side function)
      // For this example, we'll use a client-side approach, but in production you should use a server endpoint
      const { error: sqlError } = await supabase.rpc("exec_sql", { sql_query: sql })

      if (sqlError) {
        console.error("Error executing SQL:", sqlError)
        throw new Error("No se pudo crear las tablas necesarias")
      }

      // Create initial profile and settings for the user
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          username: user.email?.split("@")[0] || "",
        },
        { onConflict: "id" },
      )

      if (profileError && profileError.code !== "23505") {
        // Ignore unique constraint violations
        console.error("Error creating profile:", profileError)
        throw profileError
      }

      // Create user_settings table entry
      const { error: settingsError } = await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          username: user.email?.split("@")[0] || "",
          cycle_duration: 7,
          cycle_start_day: 1,
          sweet_dessert_limit: 3,
        },
        { onConflict: "user_id" },
      )

      if (settingsError && settingsError.code !== "23505") {
        // Ignore unique constraint violations
        console.error("Error creating user settings:", settingsError)
        throw settingsError
      }

      setIsSuccess(true)
      toast({
        title: "Base de datos configurada",
        description: "La configuración inicial se ha completado correctamente",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/profile/settings")
      }, 2000)
    } catch (error) {
      console.error("Error setting up database:", error)
      setError(error instanceof Error ? error.message : "Error desconocido al configurar la base de datos")
      toast({
        title: "Error",
        description: "No se pudo configurar la base de datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <MilyLogo />
          </div>
          <div className="w-10"></div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center">
          <MilyLogo />
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Configuración de la base de datos</CardTitle>
            <CardDescription>Configuración inicial para Mily</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-center py-4">
              <Database className="h-16 w-16 mx-auto mb-4 text-teal-600" />
              <p className="text-lg font-medium">Configuración inicial de la base de datos</p>
              <p className="text-sm text-neutral-500 mt-2">
                Este proceso creará las tablas necesarias para que Mily funcione correctamente.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={setupDatabase} disabled={isLoading || isSuccess} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Configurando...
                </>
              ) : isSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Configuración completada
                </>
              ) : (
                "Configurar base de datos"
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
