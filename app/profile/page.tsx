"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { ArrowLeft, LogOut, Settings, AlertCircle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Load user profile to get username
    loadUserProfile()
  }, [user, router])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      setIsLoadingProfile(true)
      const supabase = getSupabaseClient()

      // Try to get from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single()

      // If profiles table doesn't exist, try user_settings
      if (profileError && (profileError.code === "PGRST116" || profileError.message.includes("does not exist"))) {
        const { data: settingsData, error: settingsError } = await supabase
          .from("user_settings")
          .select("username")
          .eq("user_id", user.id)
          .single()

        if (settingsError && (settingsError.code === "PGRST116" || settingsError.message.includes("does not exist"))) {
          // Both tables don't exist or no data found
          setSetupNeeded(true)
          return
        }

        if (settingsData?.username) {
          setUsername(settingsData.username)
        }
      } else if (!profileError && profileData?.username) {
        setUsername(profileData.username)
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const setupProfile = () => {
    router.push("/profile/settings")
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

  if (!user || isLoadingProfile) {
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
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Perfil de usuario</CardTitle>
            <CardDescription>Gestiona tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {setupNeeded && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
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
            <div>
              <p className="text-sm font-medium text-neutral-500">ID de usuario</p>
              <p className="text-xs text-neutral-400 break-all">{user.id}</p>
            </div>

            <Button
              variant={setupNeeded ? "default" : "outline"}
              onClick={() => router.push("/profile/settings")}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              {setupNeeded ? "Configurar perfil" : "Configuración de perfil"}
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
