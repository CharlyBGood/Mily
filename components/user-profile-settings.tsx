"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Loader2, Save, Check, AlertCircle, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { getSupabaseClient } from "@/lib/supabase-client"
import { getDayOfWeekName } from "@/lib/cycle-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCycleSettings } from "@/lib/cycle-settings-context"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import HeaderBar from "@/components/header-bar"

interface UserSettings {
  username: string
  cycleDuration: number
  cycleStartDay: number
  sweetDessertLimit: number
}

interface UserProfileSettingsProps { }

export default function UserProfileSettings({ }: UserProfileSettingsProps) {
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
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [isSettingUpDatabase, setIsSettingUpDatabase] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { user, refreshSession, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter();
  const { reloadSettings } = useCycleSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Solo cargar settings una vez al montar, no cada vez que cambia user/loading
  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadUserSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

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
    const targetDayOfWeek = Number(settings.cycleStartDay) // Asegura que es número

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

  const setupDatabase = async () => {
    if (!user) return

    setIsSettingUpDatabase(true)
    setLoadError(null)

    try {
      const supabase = getSupabaseClient()

      // LOG: Mostrar el valor de user.email y el resultado de split
      console.log('[setupDatabase] user.email:', user.email)
      const usernameDefault = typeof user.email === 'string' && user.email.includes('@')
        ? user.email.split('@')[0]
        : '';
      console.log('[setupDatabase] usernameDefault (antes de upsert):', usernameDefault)

      // Create tables if they don't exist
      const setupSql = `
      -- Create profiles table
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        username TEXT UNIQUE,
        full_name TEXT,
        avatar_url TEXT,
        bio TEXT,
        website TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Create user_settings table
      CREATE TABLE IF NOT EXISTS public.user_settings (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username TEXT UNIQUE,
        cycle_duration INTEGER DEFAULT 7,
        cycle_start_day INTEGER DEFAULT 1,
        sweet_dessert_limit INTEGER DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Enable Row Level Security
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

      -- Create policies for profiles table
      DO $$
      BEGIN
        -- Create policies if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Public profiles are viewable by everyone'
        ) THEN
          CREATE POLICY "Public profiles are viewable by everyone" 
            ON profiles FOR SELECT USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Users can insert their own profile'
        ) THEN
          CREATE POLICY "Users can insert their own profile" 
            ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Users can update their own profile'
        ) THEN
          CREATE POLICY "Users can update their own profile" 
            ON profiles FOR UPDATE USING (auth.uid() = id);
        END IF;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error creating policies for profiles: %', SQLERRM;
      END $$;

      -- Create policies for user_settings table
      DO $$
      BEGIN
        -- Create policies if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'user_settings' 
          AND policyname = 'Users can view any user settings'
        ) THEN
          CREATE POLICY "Users can view any user settings" 
            ON user_settings FOR SELECT USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'user_settings' 
          AND policyname = 'Users can insert their own settings'
        ) THEN
          CREATE POLICY "Users can insert their own settings" 
            ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'user_settings' 
          AND policyname = 'Users can update their own settings'
        ) THEN
          CREATE POLICY "Users can update their own settings" 
            ON user_settings FOR UPDATE USING (auth.uid() = user_id);
        END IF;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error creating policies for user_settings: %', SQLERRM;
      END $$;
      `

      try {
        if (!supabase) {
          throw new Error("Supabase client is not initialized")
        }
        // Try to execute the SQL using the exec_sql RPC function
        const { error: sqlError } = await supabase.rpc("exec_sql", { sql_query: setupSql })

        if (sqlError) {
          console.error("Error executing SQL:", sqlError)
          // Continue anyway, we'll try to create the records directly
        }
      } catch (error) {
        console.error("Error setting up database tables:", error)
        // Continue anyway, we'll try to create the records directly
      }

      // Create initial profile and settings for the user
      try {
        if (!supabase) {
          throw new Error("Supabase client is not initialized")
        }
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email || "",
            username: user.email?.split("@")[0] || "",
          },
          { onConflict: "id" },
        )

        if (profileError && !profileError.message.includes("duplicate key")) {
          console.error("Error creating profile:", profileError)
        }
      } catch (error) {
        console.error("Error creating profile record:", error)
      }

      // Create user_settings table entry
      try {
        if (!supabase) {
          throw new Error("Supabase client is not initialized");
        }
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

        if (settingsError && !settingsError.message.includes("duplicate key")) {
          console.error("Error creating user settings:", settingsError)
        }
      } catch (error) {
        console.error("Error creating user settings record:", error)
      }

      // Refresh the session to ensure we have the latest data
      await refreshSession()

      // Reload settings
      await loadUserSettings()

      setSetupNeeded(false)
      toast({
        title: "Configuración inicial completada",
        description: "Tu perfil ha sido configurado correctamente",
      })
    } catch (error) {
      console.error("Error setting up database:", error)
      setLoadError("No se pudo configurar la base de datos. Por favor, intenta de nuevo más tarde.")
      toast({
        title: "Error",
        description: "No se pudo configurar la base de datos",
        variant: "destructive",
      })
    } finally {
      setIsSettingUpDatabase(false)
    }
  }

  const loadUserSettings = async () => {
    if (!user) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Supabase client is not initialized")
      // Try to get user profile
      let profileData = null
      try {
        const { data, error } = await supabase.from("profiles").select("username").eq("id", user.id).single()
        if (!error) {
          profileData = data
        } else if (error.message && error.message.includes("does not exist")) {
          setSetupNeeded(true)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error("Error checking profiles table:", error)
      }
      // Try to get user settings
      let settingsData = null
      let settingsError = null
      try {
        const result = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()
        settingsData = result.data
        settingsError = result.error
        if (settingsError && settingsError.message && settingsError.message.includes("does not exist")) {
          setSetupNeeded(true)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error("Error checking user_settings table:", error)
        setLoadError("No se pudieron cargar tus configuraciones. Por favor, intenta de nuevo más tarde.")
        setIsLoading(false)
        return
      }
      // --- CORRECCIÓN DEL FLUJO DE USERNAME ---
      let username = ""
      if (settingsData && typeof settingsData.username === "string" && settingsData.username.length > 0) {
        username = settingsData.username
      } else if (profileData && typeof profileData.username === "string" && profileData.username.length > 0) {
        username = profileData.username
      } else if (user.email && typeof user.email === "string" && user.email.includes("@")) {
        username = user.email.split("@")[0]
      }
      // Nunca usar el email completo como username
      const loadedSettings: UserSettings = {
        username,
        cycleDuration: Number(settingsData?.cycle_duration ?? 7),
        cycleStartDay: settingsData?.cycle_start_day !== undefined && settingsData?.cycle_start_day !== null
          ? Number(settingsData.cycle_start_day)
          : 1,
        sweetDessertLimit: Number(settingsData?.sweet_dessert_limit ?? 3),
      }
      setSettings(loadedSettings)
      setOriginalSettings(loadedSettings)
      setUsernameAvailable(!!username)
      // Si no hay username, pedir setup
      if (!username) {
        setSetupNeeded(true)
      }
    } catch (error) {
      console.error("Error loading user settings:", error)
      setLoadError("No se pudieron cargar tus configuraciones. Por favor, intenta de nuevo más tarde.")
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

    if (username === originalSettings.username) {
      setUsernameError(null)
      setUsernameAvailable(true)
      return
    }

    try {
      const supabase = getSupabaseClient()
      try {
        if (!supabase) {
          throw new Error("Supabase client is not initialized")
        }
        const { data: settingsData, error: settingsError } = await supabase
          .from("user_settings")
          .select("username")
          .eq("username", username)
          .not("user_id", "eq", user?.id)
          .maybeSingle()

        if (!settingsError && settingsData) {
          setUsernameError("Este nombre de usuario ya está en uso")
          setUsernameAvailable(false)
          return
        }
      } catch (error) {
        console.error("Error checking username in user_settings:", error)
      }

      try {
        if (!supabase) {
          throw new Error("Supabase client is not initialized")
        }
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username)
          .not("id", "eq", user?.id)
          .maybeSingle()

        if (!profileError && profileData) {
          setUsernameError("Este nombre de usuario ya está en uso")
          setUsernameAvailable(false)
          return
        }
      } catch (error) {
        console.error("Error checking username in profiles:", error)
      }

      setUsernameError(null)
      setUsernameAvailable(true)
    } catch (error) {
      console.error("Error checking username availability:", error)
      setUsernameError("Error al verificar disponibilidad del nombre de usuario")
      setUsernameAvailable(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    setSettings({ ...settings, username: value })

    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout)
    }

    const timeout = setTimeout(() => {
      checkUsernameAvailability(value)
    }, 500)

    setUsernameCheckTimeout(timeout)
  }

  const handleCycleDurationChange = (value: number[]) => {
    setSettings({ ...settings, cycleDuration: value[0] })
  }

  const handleCycleStartDayChange = (value: string) => {
    const dayValue = Number(value)
    setSettings({ ...settings, cycleStartDay: dayValue })
  }

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setUsernameError(null);
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Supabase client is not initialized")
      if (!user) throw new Error("Usuario no autenticado")

      try {
        const upsertPayload = {
          user_id: user.id,
          username: settings.username,
          cycle_duration: settings.cycleDuration,
          cycle_start_day: settings.cycleStartDay,
          sweet_dessert_limit: settings.sweetDessertLimit,
        };
        console.log('[UserProfileSettings] Payload enviado a upsert user_settings:', upsertPayload);
        const { data: upsertData, error: settingsError } = await supabase.from("user_settings").upsert(
          [upsertPayload],
          { onConflict: "user_id" },
        );
        console.log('[UserProfileSettings] Respuesta upsert user_settings:', { upsertData, settingsError });
        if (settingsError) {
          console.error("Error saving settings:", settingsError)
          throw settingsError
        }

        await new Promise(res => setTimeout(res, 350));
      } catch (error) {
        console.error("Error upserting user_settings:", error)
        throw error
      }

      if (settings.username) {
        try {
          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: user.id,
              username: settings.username,
              email: user.email || "",
            },
            { onConflict: "id" },
          )
          if (profileError) {
            console.error("Error updating profile:", profileError)
          }
        } catch (error) {
          console.error("Error upserting profile:", error)
        }
      }

      try {
        const cycleUtils = await import("@/lib/cycle-utils")
        if (typeof cycleUtils.clearCycleSettingsCache === "function") {
          cycleUtils.clearCycleSettingsCache(user.id)
        }
      } catch (error) {
        console.error("Error clearing cycle settings cache:", error);
      }

      await loadUserSettings()
      console.log('[UserProfileSettings] Guardado: llamando reloadSettings()')
      await reloadSettings()

      localStorage.setItem("cycleSettingsUpdated", Date.now().toString())

      window.dispatchEvent(new Event("cycleSettingsUpdatedInternal"));
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      toast({
        title: "Cambios guardados",
        description: "La configuración del ciclo se actualizó correctamente.",
      });
    } catch (error) {
      setUsernameError("Error al guardar los cambios");
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  type DeleteState = "idle" | "loading" | "success" | "error"
  const [deleteState, setDeleteState] = useState<DeleteState>("idle")

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleteState("loading")
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Supabase client is not initialized")

      await supabase.from("user_settings").delete().eq("user_id", user.id)
      await supabase.from("profiles").delete().eq("id", user.id)
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      
      setDeleteState("success")
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta y todos tus datos han sido eliminados.",
        variant: "default",
      })
      router.push("/login")
    } catch (error) {
      setDeleteState("error")
      toast({
        title: "Error al eliminar cuenta",
        description: "No se pudo eliminar tu cuenta. Intenta de nuevo o contacta soporte.",
        variant: "destructive",
      })
    } finally {
      setDeleteState("idle")
    }
  }

  const handleBack = () => {
    router.push("/"); 
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <HeaderBar backHref="/profile" ariaLabel="Volver al perfil" />
        <main className="flex-1 flex items-center justify-center pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </main>
      </div>
    )
  }

  if (setupNeeded) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <HeaderBar backHref="/profile" ariaLabel="Volver al perfil" />
        <main className="flex-1 flex items-center justify-center pt-16 p-4">
          <Card className="max-w-md mx-auto w-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Configuración inicial
              </CardTitle>
              <CardDescription>Necesitamos configurar tu perfil para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Es necesario configurar tu perfil antes de continuar. Esto solo tomará un momento.
                </AlertDescription>
              </Alert>

              {loadError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={setupDatabase} className="w-full" disabled={isSettingUpDatabase}>
                {isSettingUpDatabase ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Configurar perfil
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <HeaderBar backHref="/profile" ariaLabel="Volver al perfil" />

      <main className="flex-1 pt-16 p-4">
        {loadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {loadError}
              <Button variant="outline" size="sm" className="ml-2" onClick={loadUserSettings}>
                Reintentar
              </Button>
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
                  autoComplete="off"
                  className={`pr-10 ${settings.username && (usernameAvailable ? "border-green-500" : "border-red-500")
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
                    <SelectItem value="0">{getDayOfWeekName(0)}</SelectItem>
                    <SelectItem value="1">{getDayOfWeekName(1)}</SelectItem>
                    <SelectItem value="2">{getDayOfWeekName(2)}</SelectItem>
                    <SelectItem value="3">{getDayOfWeekName(3)}</SelectItem>
                    <SelectItem value="4">{getDayOfWeekName(4)}</SelectItem>
                    <SelectItem value="5">{getDayOfWeekName(5)}</SelectItem>
                    <SelectItem value="6">{getDayOfWeekName(6)}</SelectItem>
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
          <CardFooter className="flex flex-col gap-2">
            <Button
              onClick={saveSettings}
              disabled={isSaving || !hasChanges || (!!settings.username && !usernameAvailable)}
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/reset-password")}
              type="button"
            >
              Cambiar contraseña
            </Button>
            {/* Botón eliminar cuenta y AlertDialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" type="button">
                  Eliminar cuenta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDescription>
                    Al eliminar tu cuenta se eliminarán <b>todos tus datos</b> y no podrás recuperarlos. Esta acción es irreversible.
                  </AlertDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    onClick={handleDeleteAccount}
                    disabled={deleteState === "loading"}
                  >
                    {deleteState === "loading" ? "Eliminando..." : "Sí, eliminar mi cuenta"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
