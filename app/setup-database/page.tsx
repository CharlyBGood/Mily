"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Check, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase-client"

export default function SetupDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
  }

  const setupDatabase = async () => {
    setIsLoading(true)
    setSuccess(false)
    setError(null)
    setLogs([])

    try {
      const supabase = getSupabaseClient()

      // Step 1: Check if user_settings table exists
      addLog("Verificando tabla user_settings...")

      const { data: tableExists, error: tableCheckError } = await supabase.rpc("check_table_exists", {
        table_name: "user_settings",
      })

      if (tableCheckError) {
        throw new Error(`Error al verificar tabla: ${tableCheckError.message}`)
      }

      if (!tableExists) {
        addLog("Creando tabla user_settings...")

        const { error: createTableError } = await supabase.rpc("execute_sql", {
          sql_query: `
            CREATE TABLE public.user_settings (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              username TEXT UNIQUE,
              cycle_duration INTEGER NOT NULL DEFAULT 7,
              cycle_start_day INTEGER NOT NULL DEFAULT 1,
              sweet_dessert_limit INTEGER NOT NULL DEFAULT 3,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              UNIQUE(user_id)
            );
            
            COMMENT ON COLUMN public.user_settings.cycle_start_day IS 'Day of week to start cycle (0=Sunday, 1=Monday, ..., 6=Saturday)';
          `,
        })

        if (createTableError) {
          throw new Error(`Error al crear tabla: ${createTableError.message}`)
        }

        addLog("Tabla user_settings creada correctamente")
      } else {
        addLog("Tabla user_settings ya existe")

        // Check if cycle_start_day column exists
        addLog("Verificando columna cycle_start_day...")

        const { data: columnExists, error: columnCheckError } = await supabase.rpc("check_column_exists", {
          table_name: "user_settings",
          column_name: "cycle_start_day",
        })

        if (columnCheckError) {
          throw new Error(`Error al verificar columna: ${columnCheckError.message}`)
        }

        if (!columnExists) {
          addLog("Añadiendo columna cycle_start_day...")

          const { error: addColumnError } = await supabase.rpc("execute_sql", {
            sql_query: `
              ALTER TABLE public.user_settings 
              ADD COLUMN cycle_start_day INTEGER NOT NULL DEFAULT 1;
              
              COMMENT ON COLUMN public.user_settings.cycle_start_day IS 'Day of week to start cycle (0=Sunday, 1=Monday, ..., 6=Saturday)';
              
              UPDATE public.user_settings
              SET cycle_start_day = 1
              WHERE cycle_start_day IS NULL;
            `,
          })

          if (addColumnError) {
            throw new Error(`Error al añadir columna: ${addColumnError.message}`)
          }

          addLog("Columna cycle_start_day añadida correctamente")
        } else {
          addLog("Columna cycle_start_day ya existe")
        }
      }

      // Step 2: Set up RLS policies
      addLog("Configurando políticas de seguridad...")

      const { error: rlsError } = await supabase.rpc("execute_sql", {
        sql_query: `
          -- Enable RLS on user_settings
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
        `,
      })

      if (rlsError) {
        throw new Error(`Error al configurar políticas: ${rlsError.message}`)
      }

      addLog("Políticas de seguridad configuradas correctamente")

      // Step 3: Create indexes for performance
      addLog("Creando índices para optimizar rendimiento...")

      const { error: indexError } = await supabase.rpc("execute_sql", {
        sql_query: `
          CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
        `,
      })

      if (indexError) {
        throw new Error(`Error al crear índices: ${indexError.message}`)
      }

      addLog("Índices creados correctamente")

      // Step 4: Create helper functions
      addLog("Creando funciones auxiliares...")

      const { error: functionError } = await supabase.rpc("execute_sql", {
        sql_query: `
          -- Function to update updated_at timestamp
          CREATE OR REPLACE FUNCTION public.update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
          
          -- Trigger to update updated_at on user_settings
          DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
          CREATE TRIGGER update_user_settings_updated_at
          BEFORE UPDATE ON public.user_settings
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
        `,
      })

      if (functionError) {
        throw new Error(`Error al crear funciones: ${functionError.message}`)
      }

      addLog("Funciones auxiliares creadas correctamente")

      setSuccess(true)
      addLog("¡Configuración de base de datos completada con éxito!")
    } catch (err) {
      console.error("Error setting up database:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al configurar la base de datos")
      addLog(`ERROR: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Base de Datos</CardTitle>
          <CardDescription>
            Esta herramienta configurará la base de datos para soportar la gestión de ciclos nutricionales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">Base de datos configurada correctamente</AlertDescription>
            </Alert>
          )}

          {logs.length > 0 && (
            <div className="bg-black text-white p-3 rounded text-xs font-mono mb-4 max-h-60 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={setupDatabase} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Configurando...
              </>
            ) : (
              "Configurar Base de Datos"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
