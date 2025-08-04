"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, AlertTriangle, ArrowLeft } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { type Meal, type MealType } from "@/lib/types"
import { uploadImage } from "@/lib/meal-service"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMealContext } from "@/lib/meal-context"

interface MealEditorProps {
  meal: Meal
  onCancel: () => void
  onSaved: () => void
}

export default function MealEditor({ meal, onCancel, onSaved }: MealEditorProps) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(meal.photo_url || null)
  const [description, setDescription] = useState(meal.description || "")
  const [mealType, setMealType] = useState<MealType | "">(meal.meal_type || "")
  const [notes, setNotes] = useState(meal.notes || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentDate, setCurrentDate] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [originalDate, setOriginalDate] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { addOrUpdateMeal } = useMealContext()

  useEffect(() => {
    setMounted(true)

    // Format the original creation date
    if (meal.created_at) {
      const date = parseISO(meal.created_at)
      setOriginalDate(format(date, "EEEE, d 'de' MMMM • HH:mm", { locale: es }))
    }

    // Current date/time for display
    setCurrentDate(format(new Date(), "EEEE, d 'de' MMMM", { locale: es }))
    setCurrentTime(format(new Date(), "HH:mm"))
  }, [meal])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Eliminar validación de foto obligatoria
    // if (!meal.photo_url || !mealType) {
    //   toast({
    //     title: "Campos requeridos",
    //     description: "Debes agregar una foto y seleccionar el tipo de comida",
    //     variant: "destructive",
    //   })
    //   return
    // }
    if (!mealType) {
      toast({
        title: "Tipo de comida requerido",
        description: "Por favor selecciona el tipo de comida",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Nunca permitir cambiar la foto en edición
      const updatedMeal: Meal = {
        ...meal,
        description: description || "",
        meal_type: mealType as MealType,
        photo_url: meal.photo_url,
        notes: notes || "",
      }

      await addOrUpdateMeal(updatedMeal)

      toast({
        title: "Comida actualizada",
        description: "Tu comida ha sido actualizada exitosamente",
      })

      // Notify parent component
      onSaved()
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar la comida",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={onCancel} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Volver</span>
        </Button>
        <h2 className="text-lg font-medium">Editar comida</h2>
      </div>

      <Card className="mb-4 overflow-hidden w-full max-w-md mx-auto">
        <CardContent className="p-0">
          {(!meal.photo_url && !photoPreview) ? (
            <div
              className="flex flex-col items-center justify-center bg-neutral-100 min-h-[160px] sm:min-h-[180px] p-4 sm:p-6 cursor-pointer"
              onClick={triggerFileInput}
            >
              <Camera className="h-10 w-10 sm:h-12 sm:w-12 mb-2 text-neutral-400" />
              <p className="text-center text-sm sm:text-base text-neutral-500">
                Toca para añadir una foto de tu comida
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 bg-white/90 hover:bg-white shadow-sm border-neutral-200 text-xs sm:text-sm"
                onClick={triggerFileInput}
              >
                Añadir foto
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
                ref={fileInputRef}
              />
            </div>
          ) : (
            <div className="bg-white relative flex justify-center w-full">
              <img src={photoPreview || "/placeholder.svg"} alt="Foto de comida" className="w-auto max-w-full max-h-72 sm:max-h-80" />
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-3 right-3 bg-white/90 hover:bg-white shadow-sm border-neutral-200 text-xs sm:text-sm"
                onClick={triggerFileInput}
              >
                {meal.photo_url ? "Cambiar" : "Añadir foto"}
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
                ref={fileInputRef}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {storageWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{storageWarning}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mounted && originalDate && (
          <div className="text-base text-neutral-500 mb-2 font-medium">Fecha original: {originalDate}</div>
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
              <SelectItem value="postre1">Postre (dulce)</SelectItem>
              <SelectItem value="postre2">Postre (fruta)</SelectItem>
              <SelectItem value="merienda">Merienda</SelectItem>
              <SelectItem value="colacion2">Colación</SelectItem>
              <SelectItem value="cena">Cena</SelectItem>
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

        <div className="flex space-x-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
