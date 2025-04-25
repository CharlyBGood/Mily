"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageIcon, X, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import { v4 as uuidv4 } from "uuid"

interface CreatePostProps {
  onPostCreated?: () => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Archivo demasiado grande",
          description: "La imagen debe ser menor a 5MB",
          variant: "destructive",
        })
        return
      }

      setImage(file)
      // Create a preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!content.trim() && !image) {
      toast({
        title: "Contenido vacío",
        description: "Por favor escribe algo o agrega una imagen",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = getSupabaseClient()
      let imageUrl = null

      // Upload image if provided
      if (image) {
        const fileExt = image.name.split(".").pop()
        const fileName = `${uuidv4()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, image)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      // Create post
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
      })

      if (error) throw error

      // Reset form
      setContent("")
      setImage(null)
      setImagePreview(null)

      toast({
        title: "Publicación creada",
        description: "Tu publicación ha sido creada exitosamente",
      })

      // Notify parent component
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la publicación",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4 text-center">
          <p className="mb-2">Inicia sesión para compartir publicaciones</p>
          <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url || ""} alt={user.email || "Usuario"} />
            <AvatarFallback>{(user.email?.[0] || "U").toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué estás pensando?"
              className="resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              disabled={isSubmitting}
            />

            {imagePreview && (
              <div className="relative mt-2">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Vista previa"
                  className="max-h-60 rounded-md object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleRemoveImage}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-4">
        <div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
            ref={fileInputRef}
            disabled={isSubmitting}
          />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Imagen
          </Button>
        </div>
        <Button onClick={handleSubmit} disabled={(!content.trim() && !image) || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Publicando...
            </>
          ) : (
            "Publicar"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
