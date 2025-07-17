"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useRouter, useSearchParams } from "next/navigation"
import HeaderBar from "@/components/header-bar"
import { useAuth } from "@/lib/auth-context"

export default function ResetPasswordClient() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updatePassword } = useAuth();

  useEffect(() => {
    // Check if the reset token is valid and set session if needed
    const checkToken = async () => {
      try {
        const supabase = getSupabaseClient()
        const access_token = searchParams.get("access_token")
        const refresh_token = searchParams.get("refresh_token")
        if (access_token && refresh_token) {
          // Set the session with the recovery tokens
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (setSessionError) {
            setIsTokenValid(false)
            return
          }
        }
        const { error } = await supabase.auth.getSession()
        setIsTokenValid(error ? false : true)
      } catch (error) {
        console.error("Error checking token:", error)
        setIsTokenValid(false)
      }
    }
    checkToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    if (isTokenValid !== true) return;
    setIsLoading(true)
    try {
      const { success, error } = await updatePassword(password)

      if (success) {
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido actualizada exitosamente",
        })
        router.push("/login")
      } else {
        toast({
          title: "Error",
          description: error?.message || "Error al actualizar la contraseña",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Password update error:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar la contraseña",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <HeaderBar backHref="/login" />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </main>
      </div>
    )
  }

  if (isTokenValid === null) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <HeaderBar backHref="/login" />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </main>
      </div>
    )
  }

  if (isTokenValid === false) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <HeaderBar backHref="/login" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Enlace inválido</CardTitle>
              <CardDescription className="text-center">
                El enlace para restablecer la contraseña es inválido o ha expirado.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push("/forgot-password")}>Solicitar nuevo enlace</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    )
  }

  // Renderiza el formulario solo si el token es válido
  if (isTokenValid === true) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <HeaderBar backHref="/login" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Restablecer contraseña</CardTitle>
              <CardDescription className="text-center">Ingresa tu nueva contraseña</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </main>
      </div>
    )
  }

  return null
}
