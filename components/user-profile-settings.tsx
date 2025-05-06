"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Loader2, Save, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { getSupabaseClient } from "@/lib/supabase-client"
import { getDayOfWeekName } from "@/lib/cycle-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserSettings {
  username: string
  cycleDuration: number
  cycleStartDay: number
  sweetDessertLimit: number
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

  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    loadUserSettings()
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
    calculateNextCycleStart()
  }, [settings, originalSettings])

  const calculateNextCycleStart = () => {
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
  }

  const loadUserSettings = async () => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user?.id).single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" error
        throw error
      }

      if (data) {
        const loadedSettings = {
          username: data.username || "",
          cycleDuration: data.cycle_duration || 7,
          cycleStartDay: data.cycle_start_day || 1,
          sweetDessertLimit: data.sweet_dessert_limit || 3,
        }
        setSettings(loadedSettings)
        setOriginalSettings(loadedSettings)

        if (data.username) {
          setUsernameAvailable(true)
        }
      } else {
        // No settings found, use defaults
        const defaultSettings = {
          username: "",
          cycleDuration: 7,
          cycleStartDay: 1,
          sweetDessertLimit: 3,
        }
        setSettings(defaultSettings)
        setOriginalSettings(defaultSettings)
      }
    } catch (error) {
      console.error("Error loading user settings:", error)
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
    if (!username || username.length < 3) {
      setUsernameError("El nombre de usuario debe tener al menos 3 caracteres")
      setUsernameAvailable(false)
      return
    }

    if (username.length > 20) {
      setUsernameError("El nombre de usuario no puede tener más de 20 caracteres")
      setUsernameAvailable(false)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("El nombre de usuario solo puede contener letras, números y guiones bajos")
      setUsernameAvailable(false)
      return
    }

    // If username is the same as original, it's available
    if (username === originalSettings.username) {
      setUsernameError(null)
      setUsernameAvailable(true)
      return
    }

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from("user_settings")
        .select("username")
        .eq("username", username)
        .not("user_id", "eq", user?.id)
        .single()

      if (error && error.code === "PGRST116") {
        // No rows returned
        setUsernameError(null)
        setUsernameAvailable(true)
      } else if (data) {
        setUsernameError("Este nombre de usuario ya está en uso")
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
    if (!user) return

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
      const supabase = getSupabaseClient()

      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        username: settings.username,
        cycle_duration: settings.cycleDuration,
        cycle_start_day: settings.cycleStartDay,
        sweet_dessert_limit: settings.sweetDessertLimit,
      })

      if (error) throw error

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

  if (isLoading) {
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
                <Select value={settings.cycleStartDay.toString()} onValueChange={handleCycleStartDayChange}>
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

              {nextCycleStart && (
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
              disabled={isSaving || !hasChanges || (settings.username && !usernameAvailable)}
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
