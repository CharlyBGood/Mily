"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, AlertTriangle, Info } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import type { Meal, MealType } from "@/lib/types"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useStorage } from "@/lib/storage-provider"
import {
  countSweetDessertsInCurrentCycle,
  getUserCycleDuration,
  getUserSweetDessertLimit,
  calculateCycleInfo,
} from "@/lib/cycle-utils"

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
  const [cycleDuration, setCycleDuration] = useState(7)
  const [sweetDessertLimit, setSweetDessertLimit] = useState(3)
  const [sweetDessertsCount, setSweetDessertsCount] = useState(0)
  const [daysLeftInCycle, setDaysLeftInCycle] = useState(0)
  const [isDessertLimitReached, setIsDessertLimitReached] = useState(false)
  const [photoRequired, setPhotoRequired] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const { saveMeal, uploadImage, storageType, getUserMeals } = useStorage()

  useEffect(() => {
    setMounted(true)
    setCurrentDate(format(new Date(), "EEEE, d 'de' MMMM", { locale: es }))
    setCurrentTime(format(new Date(), "HH:mm"))
    loadUserSettings()
  }, [])

  useEffect(() => {
    if (sweetDessertsCount >= sweetDessertLimit) {
      setIsDessertLimitReached(true)
    } else {
      setIsDessertLimitReached(false)
    }
  }, [sweetDessertsCount, sweetDessertLimit])

  const loadUserSettings = async () => {
    if (!user && storageType !== "local") return

    try {
      const duration = await getUserCycleDuration(user?.id)
      const limit = await getUserSweetDessertLimit(user?.id)

      setCycleDuration(duration)
      setSweetDessertLimit(limit)

      const { success, data } = await getUserMeals()

      if (success && data && data.length > 0) {
        const sortedMeals = [...data].sort((a, b) => {
          return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
        })

        const firstMealDate = new Date(sortedMeals[0].created_at || "")
        const today = new Date()

        const cycleInfo = calculateCycleInfo(today, firstMealDate, duration)
        setDaysLeftInCycle(cycleInfo.daysLeft)

        const count = countSweetDessertsInCurrentCycle(data, duration)
        setSweetDessertsCount(count)
      }
    } catch (error) {
      console.error("Error loading user settings:", error)
    }
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStorageWarning(
          "La imagen es grande y podría causar problemas de almacenamiento. Considera usar una imagen más pequeña.",
        )
      } else {
        setStorageWarning(null)
      }

      setPhoto(file)
      setPhotoRequired(null)
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
    setPhotoRequired(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!photo) {
      setPhotoRequired("Por favor agrega una foto de tu comida")
      toast({
        title: "Foto requerida",
        description: "Por favor agrega una foto de tu comida",
        variant: "destructive",
      })
      return
    }

    if (!mealType) {
      toast({
        title: "Tipo de comida requerido",
        description: "Por favor selecciona el tipo de comida",
        variant: "destructive",
      })
      return
    }

    if (storageType === "supabase" && !user) {
      toast({
        title: "No autenticado",
        description: "Debes iniciar sesión para guardar comidas",
        variant: "destructive",
      })
      return
    }

    const isSweetDessert = mealType === "postre_dulce"

    if (isSweetDessert && sweetDessertsCount >= sweetDessertLimit) {
      toast({
        title: "Límite de postres alcanzado",
        description: `Has alcanzado el límite de ${sweetDessertLimit} postres dulces para este ciclo. Nuevo ciclo en ${daysLeftInCycle} días.`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let photoUrl = undefined
      if (photo) {
        photoUrl = await uploadImage(photo)
      }

      let finalMealType = mealType
      if (mealType === "postre_dulce") finalMealType = "postre1"
      if (mealType === "postre_fruta") finalMealType = "postre2"

      const meal: Meal = {
        description: description || "Sin descripción",
        meal_type: finalMealType as MealType,
        photo_url: photoUrl,
        notes: notes || undefined,
        metadata: mealType === "postre_dulce" || mealType === "postre_fruta" ? { dessert_type: mealType } : undefined,
      }

      const { success, error } = await saveMeal(meal)

      if (!success) {
        toast({
          title: "Error",
          description: error?.message || "Error al guardar la comida",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      resetForm()

      if (mealType === "postre_dulce") {
        setSweetDessertsCount((prev) => prev + 1)
      }

      toast({
        title: "Comida guardada",
        description: "Tu comida ha sido registrada exitosamente",
      })

      router.refresh()
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
      <div className="mb-4">
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          Photo <span className="text-red-500">*</span>
        </Label>
        <Card className={`mb-4 overflow-hidden w-full max-w-md mx-auto ${photoRequired ? "border-red-500" : ""}`}>
          <CardContent className="p-0">
            {photoPreview ? (
              <div className="bg-white relative flex justify-center w-full">
                <img src={photoPreview || "/placeholder.svg"} alt="Foto de comida" className="w-auto max-w-full" />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-3 right-3 bg-white/90 hover:bg-white shadow-sm border-neutral-200"
                  onClick={triggerFileInput}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div
                className={`flex flex-col items-center justify-center bg-neutral-100 min-h-[200px] p-6 cursor-pointer ${photoRequired ? "bg-red-50" : ""}`}
                onClick={triggerFileInput}
              >
                <Camera className={`h-12 w-12 mb-2 ${photoRequired ? "text-red-400" : "text-neutral-400"}`} />
                <p
                  className={`text-center text-base ${photoRequired ? "text-red-500 font-medium" : "text-neutral-500"}`}
                >
                  {photoRequired || "Toca para tomar una foto de tu comida"}
                </p>
                {photoRequired && <p className="text-red-500 text-sm mt-1">Este campo es obligatorio</p>}
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
      </div>

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
              <SelectItem value="postre_dulce" disabled={isDessertLimitReached}>
                Postre (dulce)
              </SelectItem>
              <SelectItem value="postre_fruta">Postre (fruta)</SelectItem>
              <SelectItem value="merienda">Merienda</SelectItem>
              <SelectItem value="colacion2">Colación</SelectItem>
              <SelectItem value="cena">Cena</SelectItem>
            </SelectContent>
          </Select>

          {mealType === "postre_dulce" && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span>
                Postres dulces: {sweetDessertsCount}/{sweetDessertLimit} en este ciclo
              </span>
            </div>
          )}

          {isDessertLimitReached && mealType === "postre_dulce" && (
            <Alert variant="warning" className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Has alcanzado el límite de postres dulces para este ciclo. Nuevo ciclo en {daysLeftInCycle} días.
                <span className="block mt-1 font-medium">Puedes seleccionar "Postre (fruta)" que no tiene límite.</span>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción <span className="text-gray-400">(opcional)</span>
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

        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-base py-6"
          disabled={!mealType || isSubmitting || (isDessertLimitReached && mealType === "postre_dulce")}
        >
          {isSubmitting ? "Guardando..." : "Guardar comida"}
        </Button>
      </form>
    </div>
  )
}
