"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Download, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { type Meal, getUserMeals, deleteMeal } from "@/lib/local-storage"
import { getMealTypeLabel, generateShareableImage, shareContent, downloadImage } from "@/lib/utils"
import MealShareCard from "./meal-share-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function MealHistory() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadMeals()
  }, [])

  const loadMeals = async () => {
    setLoading(true)
    try {
      const { success, data, error } = await getUserMeals()

      if (!success || !data) {
        toast({
          title: "Error",
          description: "Error al cargar el historial de comidas",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      setMeals(data)
    } catch (error) {
      console.error("Error loading meals:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar el historial",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const { success, error } = await deleteMeal(mealId)

      if (!success) {
        toast({
          title: "Error",
          description: "Error al eliminar la comida",
          variant: "destructive",
        })
        return
      }

      // Update the meals list
      setMeals(meals.filter((meal) => meal.id !== mealId))

      toast({
        title: "Comida eliminada",
        description: "La comida ha sido eliminada exitosamente",
      })
    } catch (error) {
      console.error("Error deleting meal:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar la comida",
        variant: "destructive",
      })
    }
  }

  const handleShareMeal = async (meal: Meal) => {
    setSelectedMeal(meal)
    setIsSharing(true)

    try {
      // Create a new div for the share card
      const shareCardContainer = document.createElement("div")
      shareCardContainer.style.position = "absolute"
      shareCardContainer.style.left = "-9999px"
      document.body.appendChild(shareCardContainer)

      // Render the share card into the container
      const shareCard = document.createElement("div")
      shareCardContainer.appendChild(shareCard)

      // Set the content of the share card
      shareCard.innerHTML = `
        <div class="card-container" style="width: 400px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: system-ui, sans-serif;">
          <div style="padding: 16px; background: #e6f7f5; border-bottom: 1px solid #d1e7e5;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; color: #0f766e; font-weight: 500;">NutriApp</h3>
              <div style="font-size: 14px; color: #0f766e;">
                ${format(parseISO(meal.created_at || new Date().toISOString()), "EEEE, d 'de' MMMM", { locale: es })} • 
                ${format(parseISO(meal.created_at || new Date().toISOString()), "HH:mm")}
              </div>
            </div>
          </div>
          ${
            meal.photo_url
              ? `
            <div style="width: 100%; height: 225px; overflow: hidden;">
              <img src="${meal.photo_url}" alt="${meal.description}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
            </div>
          `
              : ""
          }
          <div style="padding: 16px;">
            <div style="display: inline-block; padding: 4px 8px; background: #e6f7f5; color: #0f766e; font-size: 14px; border-radius: 4px; margin-bottom: 4px;">
              ${getMealTypeLabel(meal.meal_type)}
            </div>
            <h3 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 500;">${meal.description}</h3>
            ${meal.notes ? `<p style="margin: 8px 0 0 0; color: #4b5563;">${meal.notes}</p>` : ""}
          </div>
          <div style="padding: 12px 16px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 14px; color: #6b7280;">
            Registrado con NutriApp
          </div>
        </div>
      `

      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Generate image from the share card
      const imageUrl = await generateShareableImage(shareCard)

      // Clean up
      document.body.removeChild(shareCardContainer)

      if (!imageUrl) {
        throw new Error("Failed to generate image")
      }

      // Convert to blob and file
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "nutri-meal.png", { type: "image/png" })

      // Share or download
      const shareResult = await shareContent(
        "Mi comida en NutriApp",
        `${getMealTypeLabel(meal.meal_type)}: ${meal.description}`,
        undefined,
        [file],
      )

      if (!shareResult.success && !shareResult.fallback) {
        // If sharing failed and no fallback was used, download the image
        downloadImage(imageUrl, "nutri-meal.png")
      }
    } catch (error) {
      console.error("Error sharing meal:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al compartir la comida. Intentando descargar la imagen...",
        variant: "destructive",
      })

      // Fallback to direct download if sharing fails
      if (shareCardRef.current) {
        try {
          const imageUrl = await generateShareableImage(shareCardRef.current)
          if (imageUrl) {
            downloadImage(imageUrl, "nutri-meal.png")
          }
        } catch (e) {
          console.error("Fallback download failed:", e)
        }
      }
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownloadMeal = async (meal: Meal) => {
    setSelectedMeal(meal)
    setIsSharing(true)

    try {
      // Create a new div for the share card
      const shareCardContainer = document.createElement("div")
      shareCardContainer.style.position = "absolute"
      shareCardContainer.style.left = "-9999px"
      document.body.appendChild(shareCardContainer)

      // Render the share card into the container
      const shareCard = document.createElement("div")
      shareCardContainer.appendChild(shareCard)

      // Set the content of the share card
      shareCard.innerHTML = `
        <div class="card-container" style="width: 400px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: system-ui, sans-serif;">
          <div style="padding: 16px; background: #e6f7f5; border-bottom: 1px solid #d1e7e5;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; color: #0f766e; font-weight: 500;">NutriApp</h3>
              <div style="font-size: 14px; color: #0f766e;">
                ${format(parseISO(meal.created_at || new Date().toISOString()), "EEEE, d 'de' MMMM", { locale: es })} • 
                ${format(parseISO(meal.created_at || new Date().toISOString()), "HH:mm")}
              </div>
            </div>
          </div>
          ${
            meal.photo_url
              ? `
            <div style="width: 100%; height: 225px; overflow: hidden;">
              <img src="${meal.photo_url}" alt="${meal.description}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
            </div>
          `
              : ""
          }
          <div style="padding: 16px;">
            <div style="display: inline-block; padding: 4px 8px; background: #e6f7f5; color: #0f766e; font-size: 14px; border-radius: 4px; margin-bottom: 4px;">
              ${getMealTypeLabel(meal.meal_type)}
            </div>
            <h3 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 500;">${meal.description}</h3>
            ${meal.notes ? `<p style="margin: 8px 0 0 0; color: #4b5563;">${meal.notes}</p>` : ""}
          </div>
          <div style="padding: 12px 16px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 14px; color: #6b7280;">
            Registrado con NutriApp
          </div>
        </div>
      `

      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Generate image from the share card
      const imageUrl = await generateShareableImage(shareCard)

      // Clean up
      document.body.removeChild(shareCardContainer)

      if (!imageUrl) {
        throw new Error("Failed to generate image")
      }

      // Download the image
      downloadImage(imageUrl, "nutri-meal.png")
    } catch (error) {
      console.error("Error downloading meal:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al descargar la comida",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando historial...</p>
      </div>
    )
  }

  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="mb-4 text-neutral-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-1">No hay comidas registradas</h3>
        <p className="text-neutral-500 mb-4">Tus comidas registradas aparecerán aquí</p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {meals.map((meal) => {
            const date = meal.created_at ? parseISO(meal.created_at) : new Date()
            const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: es })
            const formattedTime = format(date, "HH:mm")

            return (
              <Card key={meal.id} className="overflow-hidden">
                {meal.photo_url && (
                  <div className="aspect-video relative">
                    <img
                      src={meal.photo_url || "/placeholder.svg"}
                      alt={meal.description}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{meal.description}</h3>
                      <div className="text-sm text-neutral-500">{getMealTypeLabel(meal.meal_type)}</div>
                    </div>
                    <div className="text-right text-sm text-neutral-500">
                      <div>{formattedDate}</div>
                      <div>{formattedTime}</div>
                    </div>
                  </div>

                  {meal.notes && <div className="mt-2 text-sm text-neutral-600">{meal.notes}</div>}
                </CardContent>
                <CardFooter className="px-4 py-2 border-t bg-neutral-50 flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setSelectedMeal(meal)
                      setShowDeleteDialog(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span>Eliminar</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-neutral-600">
                        <Share2 className="h-4 w-4 mr-1" />
                        <span>Compartir</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShareMeal(meal)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        <span>Compartir imagen</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadMeal(meal)}>
                        <Download className="h-4 w-4 mr-2" />
                        <span>Descargar imagen</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente esta comida de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (selectedMeal?.id) {
                  handleDeleteMeal(selectedMeal.id)
                }
                setShowDeleteDialog(false)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Share Card for fallback */}
      {isSharing && selectedMeal && (
        <div className="hidden">
          <div ref={shareCardRef}>
            <MealShareCard meal={selectedMeal} />
          </div>
        </div>
      )}
    </>
  )
}

