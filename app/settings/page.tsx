"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { UserProfile } from "@/lib/auth-context"

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error

        setProfile(data)
        setUsername(data.username || "")
        setFullName(data.full_name || "")
        setBio(data.bio || "")
        setWebsite(data.website || "")
        setAvatarUrl(data.avatar_url || null)
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar tu perfil",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [user, toast, router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Tipo de archivo no válido",
          description: "Por favor selecciona una imagen",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Archivo demasiado grande",
          description: "La imagen debe ser menor a 2MB",
          variant: "destructive",
        })
        return
      }

      setAvatarFile(file)
      // Create a preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateUsername = async (username: string): Promise<boolean> => {
    // Check if username is valid (alphanumeric and underscores only)
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("El nombre de usuario solo puede contener letras, números y guiones bajos")
      return false
    }

    // Check if username is already taken
    if (username && username !== profile?.username) {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.from("profiles").select("username").eq("username", username).single()

        if (data) {
          setUsernameError("Este nombre de usuario ya está en uso")
          return false
        }
      } catch (error) {
        // If error is not found, username is available
        // Otherwise, there was a different error
        if (error instanceof Error && !error.message.includes("No rows found")) {
          console.error("Error checking username:", error)
          setUsernameError("Error al verificar disponibilidad del nombre de usuario")
          return false
        }
      }
    }

    setUsernameError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      router.push("/login")
      return
    }

    // Validate username
    const isUsernameValid = await validateUsername(username)
    if (!isUsernameValid) return

    setIsSaving(true)
    try {
      const supabase = getSupabaseClient()
      let newAvatarUrl = avatarUrl

      // Upload new avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

        newAvatarUrl = urlData.publicUrl
      }

      // Update profile
      const { success, error } = await updateProfile({
        username: username || null,
        full_name: fullName || null,
        bio: bio || null,
        website: website || null,
        avatar_url: newAvatarUrl,
      })

      if (!success) throw error

      toast({
        title: "Perfil actualizado",
        description: "Tu perfil ha sido actualizado exitosamente",
      })

      // Redirect to profile page if username is set
      if (username) {
        router.push(`/profile/${username}`)
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar tu perfil",
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
            <CardTitle>Editar perfil</CardTitle>
            <CardDescription>Actualiza tu información personal</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || ""} alt={username || "Usuario"} />
                  <AvatarFallback>{(username?.[0] || fullName?.[0] || "U").toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="relative">
                  <input type="file" id="avatar" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("avatar")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Cambiar foto
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nombre_usuario"
                />
                {usernameError && <p className="text-sm text-red-500">{usernameError}</p>}
                <p className="text-xs text-neutral-500">Este será tu identificador único en la plataforma</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografía</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Cuéntanos sobre ti..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Sitio web</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://tusitio.com"
                  type="url"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
