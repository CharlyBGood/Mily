"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import HeaderBar from "@/components/header-bar"
import Loader from "@/components/ui/loader";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()
  const { resetPassword } = useAuth()
  const router = useRouter()
  const { user, loading } = useAuth()

  // useEffect(() => {
  //   if (!loading && user) {
  //     router.replace("/");
  //   }
  // }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { success, error } = await resetPassword(email)

      if (success) {
        setIsSubmitted(true)
        toast({
          title: "Correo enviado",
          description: "Se ha enviado un correo con instrucciones para restablecer tu contraseña.",
        })
      } else {
        toast({
          title: "Error",
          description: error?.message || "Error al enviar el correo de restablecimiento",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Password reset error:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar tu solicitud",
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

  if (loading || user) {
      return <Loader />;
    }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <HeaderBar backHref="/login" />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Recuperar contraseña</CardTitle>
            <CardDescription className="text-center">
              Ingresa tu correo electrónico para recibir instrucciones de recuperación
            </CardDescription>
          </CardHeader>

          {isSubmitted ? (
            <CardContent className="space-y-4 pt-4">
              <div className="bg-green-50 p-4 rounded-md text-green-800 text-center">
                <p className="font-medium">Correo enviado</p>
                <p className="mt-2">
                  Hemos enviado un correo a <span className="font-medium">{email}</span> con instrucciones para
                  restablecer tu contraseña.
                </p>
              </div>
              <Button className="w-full" onClick={() => router.push("/login")}>
                Volver al inicio de sesión
              </Button>
            </CardContent>
          ) : (
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
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar instrucciones"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </main>
    </div>
  )
}
