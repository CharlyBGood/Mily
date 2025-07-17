"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CircleFadingPlus } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import HeaderBar from "@/components/header-bar"
import Loader from "@/components/ui/loader";


export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const { toast } = useToast()
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const [error, setError] = useState(null)
  const { user, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (activeTab === "login") {
        const { success, error } = await signIn(email, password)
        if (success) {
          toast({
            title: "Inicio de sesión exitoso",
            description: "Has iniciado sesión correctamente",
          })
          router.push("/")
        } else {
          // More specific error messages based on error code
          if (error?.message?.includes("Email not confirmed")) {
            toast({
              title: "Email no confirmado",
              description:
                "Por favor confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
              variant: "destructive",
            })
          } else if (error?.message?.includes("Invalid login credentials")) {
            toast({
              title: "Credenciales inválidas",
              description: "El correo o la contraseña son incorrectos",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Error",
              description: error?.message || "Error al iniciar sesión",
              variant: "destructive",
            })
          }
        }
      } else {
        const { success, error } = await signUp(email, password)
        if (success) {
          toast({
            title: "Registro exitoso",
            description: "Te has registrado correctamente. Revisa tu correo para confirmar tu cuenta.",
          })
          setActiveTab("login")
        } else {
          toast({
            title: "Error",
            description: error?.message || "Error al registrarse",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Auth error:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error durante la autenticación",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (error) throw error
      // Redirect happens automatically
    } catch (err) {

      console.error("Google login error:", err)

      setIsLoading(false)
    }
  }

  if (user) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <HeaderBar backHref="/login" />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {activeTab === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === "login"
                ? "Ingresa tus credenciales para acceder a tu cuenta"
                : "Crea una cuenta para comenzar a registrar tus comidas"}
            </CardDescription>
          </CardHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Contraseña</Label>
                      <Link href="/forgot-password" className="text-xs text-teal-600 hover:text-teal-800">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-md font-medium hover:bg-gray-100 disabled:opacity-70 border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    <CircleFadingPlus className="w-5 h-5" />
                    Continuar con Google
                  </button>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-neutral-500">La contraseña debe tener al menos 6 caracteres</p>
                  </div>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-md font-medium hover:bg-gray-100 disabled:opacity-70 border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    <CircleFadingPlus className="w-5 h-5" />
                    Continuar con Google
                  </button>
                </CardContent>

                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Registrando..." : "Registrarse"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  )
}
