"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { type Meal, type MealType, saveMeal, savePhotoToLocalStorage } from "@/lib/local-storage"

export default function MealLogger() {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [mealType, setMealType] = useState<MealType | "">("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!mealType || !description || !photo) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Save photo to localStorage as base64
      const photoUrl = await savePhotoToLocalStorage(photo)

      // Save meal
      const meal: Meal = {
        description,
        meal_type: mealType as MealType,
        photo_url: photoUrl,
        notes: notes || undefined,
      }

      const { success, error } = await saveMeal(meal)

      if (!success) {
        toast({
          title: "Error",
          description: "Error al guardar la comida",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Reset form
      setPhoto(null)
      setPhotoPreview(null)
      setDescription("")
      setMealType("")
      setNotes("")

      toast({
        title: "Comida guardada",
        description: "Tu comida ha sido registrada exitosamente",
      })
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

  const currentDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })
  const currentTime = format(new Date(), "HH:mm")

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview || "/placeholder.svg"}
                alt="Foto de comida"
                className="w-full aspect-square object-cover"
              />
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
              className="flex flex-col items-center justify-center bg-neutral-100 aspect-square p-6 cursor-pointer"
              onClick={triggerFileInput}
            >
              <Camera className="h-12 w-12 text-neutral-400 mb-2" />
              <p className="text-neutral-500 text-center">Toca para tomar una foto de tu comida</p>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-neutral-500 mb-2">
          {currentDate} • {currentTime}
        </div>

        <div className="space-y-2">
          <Label htmlFor="meal-type">Tipo de comida</Label>
          <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)} required>
            <SelectTrigger id="meal-type">
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
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            placeholder="¿Qué comiste?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas adicionales (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Agrega cualquier nota adicional aquí..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700"
          disabled={!photoPreview || !description || !mealType || isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar comida"}
        </Button>
      </form>
    </div>
  )
}

