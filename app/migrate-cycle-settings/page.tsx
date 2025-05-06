"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Check, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { getSupabaseClient } from "@/lib/supabase-client"
import * as settingsService from "@/lib/settings-service"

export default function MigrateCycleSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [hasSettings, setHasSettings] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      checkSettings()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
  }

  const checkSettings = async () => {
    setIsLoading(true)
    setError(null)
    setLogs([])

    try {
      addLog("Verificando configuraciones existentes...")

      const supabase = getSupabaseClient()

      // Check if user has settings
      const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user?.id).single()

      if (error && error.code !== "PGRST116") {
        throw new Error(`Error al verificar configuraciones: ${error.message}`)
      }

      if (data) {
        setHasSettings(true)
        addLog("Configuraciones existentes encontradas")

        // Check if cycle_start_day is set
        if (data.cycle_start_day === undefined || data.cycle_start_day === null) {
          setNeedsMigration(true)
          addLog("Se requiere migración: cycle_start_day no está configurado")
        } else {
          setNeedsMigration(false)
          addLog("No se requiere migración: cycle_start_day ya está configurado")
        }
      } else {
        setHasSettings(false)
        setNeedsMigration(true)
        addLog("No se encontraron configuraciones existentes. Se crearán nuevas configuraciones.")
      }
    } catch (err) {
      console.error("Error checking settings:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al verificar configuraciones")
      addLog(`ERROR: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const migrateSettings = async () => {
    if (!user) return

    setIsProcessing(true)
    setSuccess(false)
    setError(null)

    try {
      addLog("Iniciando migración de configuraciones...")

      // Default settings to use
      const defaultSettings = {
        cycleDuration: 7,
        cycleStartDay: 1, // Monday
        sweetDessertLimit: 3,
      }

      if (hasSettings) {
        addLog("Actualizando configuraciones existentes...")

        // Get existing settings
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()

        if (error) {
          throw new Error(`Error al obtener configuraciones: ${error.message}`)
        }

        // Update with new cycle_start_day if needed
        const result = await settingsService.saveUserSettings(user.id, {
          cycleDuration: data.cycle_duration || defaultSettings.cycleDuration,
          cycleStartDay: defaultSettings.cycleStartDay, // Set to Monday by default
          sweetDessertLimit: data.sweet_dessert_limit || defaultSettings.sweetDessertLimit,
        })

        if (!result.success) {
          throw new Error("Error al actualizar configuraciones")
        }

        addLog("Configuraciones actualizadas correctamente")
      } else {
        addLog("Creando nuevas configuraciones...")

        // Create new settings
        const result = await settingsService.saveUserSettings(user.id, defaultSettings)

        if (!result.success) {
          throw new Error("Error al crear configuraciones")
        }

        addLog("Nuevas configuraciones creadas correctamente")
      }

      setSuccess(true)
      addLog("¡Migración completada con éxito!")
    } catch (err) {
      console.error("Error migrating settings:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al migrar configuraciones")
      addLog(`ERROR: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Migración de Configuraciones de Ciclo</CardTitle>
          <CardDescription>
            Esta herramienta migrará tus configuraciones para soportar el día de inicio del ciclo personalizado.
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
              <AlertDescription className="text-green-600">Configuraciones migradas correctamente</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm mb-2">
                  {hasSettings
                    ? needsMigration
                      ? "Tienes configuraciones existentes que necesitan ser actualizadas para soportar el día de inicio del ciclo personalizado."
                      : "Tus configuraciones ya están actualizadas y soportan el día de inicio del ciclo personalizado."
                    : "No tienes configuraciones existentes. Esta herramienta creará nuevas configuraciones con valores predeterminados."}
                </p>

                {needsMigration && (
                  <p className="text-sm text-amber-600">
                    La migración establecerá el Lunes como día de inicio del ciclo por defecto. Puedes cambiarlo después
                    en la configuración de tu perfil.
                  </p>
                )}
              </div>

              {logs.length > 0 && (
                <div className="bg-black text-white p-3 rounded text-xs font-mono mb-4 max-h-60 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={migrateSettings} disabled={isLoading || isProcessing || !needsMigration} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Migrando...
              </>
            ) : needsMigration ? (
              "Migrar Configuraciones"
            ) : (
              "No se requiere migración"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
