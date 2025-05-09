"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Loader2, Save, Check, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { getDayOfWeekName } from "@/lib/cycle-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as settingsService from "@/lib/settings-service"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { UserCycleSettings } from "@/lib/types"

interface UserSettings extends UserCycleSettings {
  username: string
}

export default function UserProfileSettings() {
  const [settings, setSettings] = useState<UserSettings>({
    username: "",
    cycleDuration: 7,
    cycleStartDay: 1, // Default to Monday
    sweetDessertLimit: 3,
  })
  const [originalSettings, setOriginalSettings] = useState<UserSettings>({
    username: "",
    cycleDuration: 7,
    cycleStartDay: 1, // Default to Monday
    sweetDessertLimit: 3,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState(false)
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [nextCycleStart, setNextCycleStart] = useState<string>("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<{
    tableExists: boolean
    columnExists: boolean
    checking: boolean
  }>({
    tableExists: false,
    columnExists: false,
    checking: true,
  })

  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    checkDatabaseStatus()
  }, [user, router])

  useEffect(() => {
    // Check if settings have changed
    const changed =
      settings.username !== originalSettings.username ||
      settings.cycleDuration !== originalSettings.cycleDuration ||
      settings.cycleStartDay !== originalSettings.cycleStartDay ||
      settings.sweetDessertLimit !== originalSettings.sweetDessertLimit

    setHasChanges(changed)

    // Calculate next cycle start date
    updateNextCycleStart()
  }, [settings, originalSettings])

  const checkDatabaseStatus = async () => {
    setDbStatus({ ...dbStatus, checking: true })
    try {
      const supabase = getSupabaseClient()

      // Check if user_settings table exists
      const { data: tableExists, error: tableError } = await supabase
        .rpc("check_table_exists", { table_name: "user_settings" })
        .single()

      if (tableError) {
        console.error("Error checking if table exists:", tableError)
        setDbStatus({ tableExists: false, columnExists: false, checking: false })
        setLoadError(
          "Error al verificar la estructura de la base de datos. Es posible que necesites ejecutar el script de migración.",
        )
        return
      }

      if (!tableExists) {
        setDbStatus({ tableExists: false, columnExists: false, checking: false })
        setLoadError("La tabla user_settings no existe. Por favor, ejecuta el script de migración.")
        return
      }

      // Check if cycle_start_day column exists
      const { data: columnExists, error: columnError } = await supabase
        .rpc("check_column_exists", { table_name: "user_settings", column_name: "cycle_start_day" })
        .single()

      if (columnError) {
        console.error("Error checking if column exists:", columnError)
        setDbStatus({ tableExists: true, columnExists: false, checking: false })
        setLoadError(
          "Error al verificar la columna cycle_start_day. Es posible que necesites ejecutar el script de migración.",
        )
        return
      }

      setDbStatus({ tableExists: true, columnExists: !!columnExists, checking: false })

      if (!columnExists) {
        setLoadError("La columna cycle_start_day no existe. Por favor, ejecuta el script de migración.")
      } else {
        // If everything is good, load user settings
        loadUserSettings()
      }
    } catch (error) {
      console.error("Error checking database status:", error)
      setDbStatus({ tableExists: false, columnExists: false, checking: false })
      setLoadError(
        "Error al verificar la estructura de la base de datos. Es posible que necesites ejecutar el script de migración.",
      )
    }
  }

  const updateNextCycleStart = () => {
    try {
      const today = new Date()
      const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      const targetDayOfWeek = settings.cycleStartDay

      // Calculate days until next cycle start
      let daysUntilNext = (targetDayOfWeek - dayOfWeek + 7) % 7
      if (daysUntilNext === 0) {
        daysUntilNext = 7 // If today is the start day, next cycle starts in 7 days
      }

      // Calculate next cycle start date
      const nextStart = new Date(today)
      nextStart.setDate(today.getDate() + daysUntilNext)

      // Format the date
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
      setNextCycleStart(nextStart.toLocaleDateString("es-ES", options))
    } catch (error) {
      console.error("Error calculating next cycle start:", error)
      setNextCycleStart("")
    }
  }

  const loadUserSettings = async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      if (!user?.id) {
        throw new Error("User ID is missing")
      }

      // Get user settings from the settings service
      const cycleSettings = await settingsService.getUserSettings(user.id)

      // Get username separately (if needed)
      const username = (await settingsService.getUsernameById(user.id)) || ""

      const loadedSettings = {
        username,
        ...cycleSettings,
      }

      setSettings(loadedSettings)
      setOriginalSettings(loadedSettings)

      if (username) {
        setUsernameAvailable(true)
      }
    } catch (error) {
      console.error("Error loading user settings:", error)
      setLoadError("No se pudieron cargar tus configuraciones. Por favor, intenta de nuevo más tarde.")

      // Set default settings
      const defaultSettings = {
        username: "",
        ...settingsService.DEFAULT_SETTINGS,
      }
      setSettings(defaultSettings)
      setOriginalSettings(defaultSettings)

      toast({
        title: "Error",
        description: "No se pudieron cargar tus configuraciones",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username) {
      setUsernameError(null)
      setUsernameAvailable(true)
      return
    }

    try {
      const result = await settingsService.isUsernameAvailable(username, user?.id)

      if (result.available) {
        setUsernameError(null)
        setUsernameAvailable(true)
      } else {
        setUsernameError(result.error || "Este nombre de usuario no está disponible")
        setUsernameAvailable(false)
      }
    } catch (error) {
      console.error("Error checking username availability:", error)
      setUsernameError("Error al verificar disponibilidad del nombre de usuario")
      setUsernameAvailable(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    setSettings({ ...settings, username: value })

    // Clear previous timeout
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout)
    }

    // Set new timeout to check username availability
    const timeout = setTimeout(() => {
      checkUsernameAvailability(value)
    }, 500)

    setUsernameCheckTimeout(timeout)
  }

  const handleCycleDurationChange = (value: number[]) => {
    setSettings({ ...settings, cycleDuration: value[0] })
  }

  const handleCycleStartDayChange = (value: string) => {
    setSettings({ ...settings, cycleStartDay: Number.parseInt(value) })
  }

  const saveSettings = async () => {
    if (!user?.id) return

    if (settings.username && !usernameAvailable) {
      toast({
        title: "Error",
        description: "Por favor corrige los errores antes de guardar",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      // Save cycle settings
      const cycleSettingsResult = await settingsService.saveUserSettings(user.id, {
        cycleDuration: settings.cycleDuration,
        cycleStartDay: settings.cycleStartDay,
        sweetDessertLimit: settings.sweetDessertLimit,
      })

      if (!cycleSettingsResult.success) {
        throw new Error("Failed to save cycle settings")
      }

      // If we have a username, save it separately
      if (settings.username) {
        // This would be part of the user_settings table in our implementation
        // but we're showing how it could be handled separately
      }

      setOriginalSettings({ ...settings })
      setSaveSuccess(true)

      toast({
        title: "Configuración guardada",
        description: "Tus preferencias han sido actualizadas",
      })

      // Hide success indicator after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar tus configuraciones",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const runMigration = async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const supabase = getSupabaseClient()

      // Execute the migration SQL directly
      const { error } = await supabase.rpc("execute_sql", {
        sql_query: `
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
        `,
      })

      if (error) {
        throw new Error(`Error executing migration: ${error.message}`)
      }

      toast({
        title: "Migración completada",
        description: "La base de datos ha sido actualizada correctamente",
      })

      // Check database status again
      await checkDatabaseStatus()
    } catch (error) {
      console.error("Error running migration:", error)
      setLoadError(`Error al ejecutar la migración: ${error instanceof Error ? error.message : "Error desconocido"}`)

      toast({
        title: "Error",
        description: "No se pudo ejecutar la migración",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || dbStatus.checking) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <MilyLogo />
          </div>
          <div className="w-10"></div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center">
          <MilyLogo />
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-4">
        {loadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{loadError}</span>
              {!dbStatus.columnExists && (
                <Button variant="outline" size="sm" onClick={runMigration} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Migrando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Ejecutar migración
                    </>
                  )}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Configuración de perfil</CardTitle>
            <CardDescription>Personaliza tu experiencia en Mily</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de usuario público</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={settings.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="tu_nombre_usuario"
                  className={`pr-10 ${
                    settings.username && (usernameAvailable ? "border-green-500" : "border-red-500")
                  }`}
                />
                {settings.username && usernameAvailable && (
                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {usernameError && <p className="text-sm text-red-500">{usernameError}</p>}
              <p className="text-xs text-neutral-500">Entre 3-20 caracteres. Solo letras, números y guiones bajos.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cycle-start-day">Día de inicio del ciclo</Label>
                <Select
                  value={settings.cycleStartDay.toString()}
                  onValueChange={handleCycleStartDayChange}
                  disabled={!dbStatus.columnExists}
                >
                  <SelectTrigger id="cycle-start-day" className="w-full">
                    <SelectValue placeholder="Selecciona el día de inicio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{getDayOfWeekName(1)}</SelectItem>
                    <SelectItem value="2">{getDayOfWeekName(2)}</SelectItem>
                    <SelectItem value="3">{getDayOfWeekName(3)}</SelectItem>
                    <SelectItem value="4">{getDayOfWeekName(4)}</SelectItem>
                    <SelectItem value="5">{getDayOfWeekName(5)}</SelectItem>
                    <SelectItem value="6">{getDayOfWeekName(6)}</SelectItem>
                    <SelectItem value="0">{getDayOfWeekName(0)}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-neutral-500">Define qué día de la semana comienza cada ciclo nutricional</p>
                {!dbStatus.columnExists && (
                  <p className="text-xs text-amber-600">
                    Esta opción estará disponible después de ejecutar la migración.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cycle-duration">Duración del ciclo: {settings.cycleDuration} días</Label>
                <Slider
                  id="cycle-duration"
                  min={7}
                  max={30}
                  step={1}
                  value={[settings.cycleDuration]}
                  onValueChange={handleCycleDurationChange}
                  className="mt-2"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Define cuántos días dura cada ciclo nutricional (7-30 días)
                </p>
              </div>

              {nextCycleStart && dbStatus.columnExists && (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Próximo inicio de ciclo:</span> {nextCycleStart}
                  </p>
                </div>
              )}

              <div>
                <Label>Límite de postres dulces por ciclo: {settings.sweetDessertLimit}</Label>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSettings({ ...settings, sweetDessertLimit: Math.max(1, settings.sweetDessertLimit - 1) })
                    }
                  >
                    -
                  </Button>
                  <span className="font-medium text-lg">{settings.sweetDessertLimit}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSettings({ ...settings, sweetDessertLimit: Math.min(10, settings.sweetDessertLimit + 1) })
                    }
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Establece cuántos postres dulces puedes consumir por ciclo
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={saveSettings}
              disabled={isSaving || !hasChanges || (settings.username && !usernameAvailable) || !dbStatus.tableExists}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Guardado
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
