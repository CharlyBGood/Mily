"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import type { Meal, MealType } from "@/lib/types"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useStorage } from "@/lib/storage-provider"

export default function MealLogger() {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [mealType, setMealType] = useState<MealType | "">("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentDate, setCurrentDate] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const { saveMeal, uploadImage, storageType } = useStorage()

  useEffect(() => {
    setMounted(true)
    // Only format dates on the client side
    setCurrentDate(format(new Date(), "EEEE, d 'de' MMMM", { locale: es }))
    setCurrentTime(format(new Date(), "HH:mm"))
  }, [])

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size - warn if over 5MB
      if (file.size > 5 * 1024 * 1024) {
        setStorageWarning(
          "La imagen es grande y podría causar problemas de almacenamiento. Considera usar una imagen más pequeña.",
        )
      } else {
        setStorageWarning(null)
      }

      setPhoto(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const resetForm = () => {
    setPhoto(null)
    setPhotoPreview(null)
    setDescription("")
    setMealType("")
    setNotes("")
    setStorageWarning(null)

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!mealType || !description) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    // If using Supabase storage, we need to be logged in
    if (storageType === "supabase" && !user) {
      toast({
        title: "No autenticado",
        description: "Debes iniciar sesión para guardar comidas",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      console.log("Saving meal...")

      // Upload photo if provided
      let photoUrl = undefined
      if (photo) {
        photoUrl = await uploadImage(photo)
        console.log("Photo uploaded")
      }

      // Save meal
      const meal: Meal = {
        description,
        meal_type: mealType as MealType,
        photo_url: photoUrl,
        notes: notes || undefined,
      }

      const { success, data, error } = await saveMeal(meal)
      console.log("Meal save result:", success)

      if (!success) {
        toast({
          title: "Error",
          description: error?.message || "Error al guardar la comida",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Reset form
      resetForm()

      toast({
        title: "Comida guardada",
        description: "Tu comida ha sido registrada exitosamente",
      })

      // Force a refresh of the router to update the history tab
      router.refresh()

      // Navigate to history tab
      router.push("?tab=history")
    } catch (error) {
      console.error("Error saving meal:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la comida",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="mb-4 overflow-hidden w-full max-w-md mx-auto">
        <CardContent className="p-0">
          {photoPreview ? (
            <div className="bg-white flex justify-center w-full">
              <img src={photoPreview || "/placeholder.svg"} alt="Foto de comida" className="w-auto max-w-full" />
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
                onClick={triggerFileInput}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center bg-neutral-100 min-h-[200px] p-6 cursor-pointer"
              onClick={triggerFileInput}
            >
              <Camera className="h-12 w-12 text-neutral-400 mb-2" />
              <p className="text-neutral-500 text-center text-base">Toca para tomar una foto de tu comida</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
            ref={fileInputRef}
          />
        </CardContent>
      </Card>

      {storageWarning && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{storageWarning}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mounted && (
          <div className="text-base text-neutral-500 mb-2 font-medium">
            {currentDate} • {currentTime}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="meal-type" className="text-base">
            Tipo de comida
          </Label>
          <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)} required>
            <SelectTrigger id="meal-type" className="text-base">
              <SelectValue placeholder="Selecciona el tipo de comida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desayuno">Desayuno</SelectItem>
              <SelectItem value="colacion1">Colación</SelectItem>
              <SelectItem value="almuerzo">Almuerzo</SelectItem>
              <SelectItem value="postre1">Postre</SelectItem>
              <SelectItem value="merienda">Merienda</SelectItem>
              <SelectItem value="colacion2">Colación</SelectItem>
              <SelectItem value="cena">Cena</SelectItem>
              <SelectItem value="postre2">Postre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base">
            Descripción
          </Label>
          <Input
            id="description"
            placeholder="¿Qué comiste?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-base">
            Notas adicionales (opcional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Agrega cualquier nota adicional aquí..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none text-base"
            rows={3}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-base py-6"
          disabled={!description || !mealType || isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar comida"}
        </Button>
      </form>
    </div>
  )
}
