"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { ArrowLeft, LogOut, Settings, AlertCircle, Database, RefreshCw } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import HeaderBar from "@/components/header-bar"

export default function ProfilePage() {
  const { user, signOut, ensureDbSetup, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [isSettingUpDatabase, setIsSettingUpDatabase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (loading) return

    if (!loading && !user) {
      router.push("/");
    };

    loadUserProfile()
  }, [user, loading, router, retryCount])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      setIsLoadingProfile(true)
      setError(null)

      const isDbSetup = await ensureDbSetup()
      if (!isDbSetup) {
        setSetupNeeded(true)
        setIsLoadingProfile(false)
        return
      }

      const supabase = getSupabaseClient()

      try {
        if (!supabase) {
          console.error("Supabase client is not initialized")
          setError("Error al cargar el perfil. Por favor, intenta de nuevo.")
          setIsLoadingProfile(false)
          return
        }
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()

        if (!profileError && typeof profileData?.username === "string") {
          setUsername(profileData.username)
          setSetupNeeded(false)
          setIsLoadingProfile(false)
          return
        }
      } catch (error) {
        console.error("Error checking profiles table:", error)
      }

      try {
        if (!supabase) {
          console.error("Supabase client is not initialized")
          setError("Error al cargar el perfil. Por favor, intenta de nuevo.")
          setIsLoadingProfile(false)
          return
        }
        const { data: settingsData, error: settingsError } = await supabase
          .from("user_settings")
          .select("username")
          .eq("user_id", user.id)
          .maybeSingle()

        if (
          !settingsError &&
          typeof settingsData?.username === "string"
        ) {
          setUsername(settingsData.username)
          setSetupNeeded(false)
          setIsLoadingProfile(false)
          return
        }
      } catch (error) {
        console.error("Error checking user_settings table:", error)
      }

      setSetupNeeded(true)
    } catch (error) {
      console.error("Error loading user profile:", error)
      setError("Error al cargar el perfil. Por favor, intenta de nuevo.")
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const setupProfile = async () => {
    setIsSettingUpDatabase(true)
    setError(null)

    try {
      const isDbSetup = await ensureDbSetup()
      if (isDbSetup) {
        router.push("/profile/settings")
      } else {
        setError("No se pudo configurar la base de datos. Por favor, intenta de nuevo.")
      }
    } catch (error) {
      console.error("Error setting up profile:", error)
      setError("Error al configurar el perfil. Por favor, intenta de nuevo.")
    } finally {
      setIsSettingUpDatabase(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      })
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cerrar sesión",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <HeaderBar backHref="/" ariaLabel="Volver" />

      <main className="flex-1 flex items-center justify-center pt-16 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Perfil de usuario</CardTitle>
            <CardDescription>Gestiona tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  <Button variant="outline" size="sm" className="ml-2" onClick={handleRetry}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {setupNeeded && (
              <Alert className="mb-4">
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Es necesario configurar tu perfil para acceder a todas las funciones.
                </AlertDescription>
              </Alert>
            )}

            {username && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Nombre de usuario</p>
                <p className="text-base font-medium">{username}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-neutral-500">Correo electrónico</p>
              <p className="text-base">{user.email}</p>
            </div>

            <Button
              variant={setupNeeded ? "default" : "outline"}
              onClick={() => {
                router.push(`/profile/settings`);
              }}
              className="w-full mb-2"
              disabled={isSettingUpDatabase}
            >
              {isSettingUpDatabase ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Configurando...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  {setupNeeded ? "Configurar perfil" : "Configuración de perfil"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/privacy-policy")}
              className="w-full mb-2"
            >
              Política de Privacidad
            </Button>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={handleSignOut} disabled={isLoading} className="w-full">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Cerrar sesión
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
