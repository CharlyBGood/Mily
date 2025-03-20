"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Download, Trash2, RefreshCw } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { type Meal, getUserMeals, deleteMeal } from "@/lib/local-storage"
import { getMealTypeLabel, shareContent, downloadImage } from "@/lib/utils"
import ShareableImageGenerator from "./shareable-image-generator"
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [shareMode, setShareMode] = useState<"share" | "download" | null>(null)
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

      // Sort meals by date (newest first)
      const sortedMeals = [...data].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

      setMeals(sortedMeals)
      console.log(`Loaded ${sortedMeals.length} meals`)
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

  const handleShareMeal = (meal: Meal) => {
    setSelectedMeal(meal)
    setShareMode("share")
    setIsGeneratingImage(true)
  }

  const handleDownloadMeal = (meal: Meal) => {
    setSelectedMeal(meal)
    setShareMode("download")
    setIsGeneratingImage(true)
  }

  const handleImageGenerated = async (imageUrl: string) => {
    try {
      // Detect iOS/Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

      if (shareMode === "share") {
        // Convert to blob and file for sharing
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const file = new File([blob], "nutri-meal.png", { type: "image/png" })

        // For iOS/Safari, we need special handling
        if (isIOS || isSafari) {
          try {
            // First try native sharing if available
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: "Mi comida en NutriApp",
                text: selectedMeal ? `${getMealTypeLabel(selectedMeal.meal_type)}: ${selectedMeal.description}` : "",
                files: [file],
              })

              toast({
                title: "Compartido",
                description: "La imagen se ha compartido exitosamente",
              })
            } else {
              // Fallback to download for iOS/Safari if sharing not available
              downloadImage(imageUrl, "nutri-meal.png")

              toast({
                title: "Imagen guardada",
                description: "La imagen se ha guardado en tu dispositivo",
              })
            }
          } catch (error) {
            console.error("Error sharing on iOS/Safari:", error)

            // Fallback to download
            downloadImage(imageUrl, "nutri-meal.png")

            toast({
              title: "Imagen guardada",
              description: "La imagen se ha guardado en tu dispositivo",
            })
          }
        } else {
          // For other browsers, use our shareContent utility
          const shareResult = await shareContent(
            "Mi comida en NutriApp",
            selectedMeal ? `${getMealTypeLabel(selectedMeal.meal_type)}: ${selectedMeal.description}` : "",
            undefined,
            [file],
          )

          if (!shareResult.success && !shareResult.fallback) {
            // If sharing failed and no fallback was used, download the image
            downloadImage(imageUrl, "nutri-meal.png")

            toast({
              title: "Imagen guardada",
              description: "La imagen se ha guardado en tu dispositivo",
            })
          }
        }
      } else if (shareMode === "download") {
        // Download the image
        downloadImage(imageUrl, "nutri-meal.png")

        toast({
          title: "Imagen guardada",
          description: "La imagen se ha guardado en tu dispositivo",
        })
      }
    } catch (error) {
      console.error("Error processing image:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la imagen. Intentando descargar directamente...",
        variant: "destructive",
      })

      // Fallback to direct download
      try {
        downloadImage(imageUrl, "nutri-meal.png")
      } catch (e) {
        console.error("Fallback download failed:", e)
      }
    } finally {
      setIsGeneratingImage(false)
      setShareMode(null)
      setSelectedMeal(null)
    }
  }

  const handleImageError = (error: Error) => {
    console.error("Image generation error:", error)
    toast({
      title: "Error",
      description: "No se pudo generar la imagen para compartir",
      variant: "destructive",
    })
    setIsGeneratingImage(false)
    setShareMode(null)
    setSelectedMeal(null)
  }

  const handleRefresh = () => {
    loadMeals()
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
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {meals.map((meal) => {
            const date = meal.created_at ? parseISO(meal.created_at) : new Date()
            const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: es })
            const formattedTime = format(date, "HH:mm")

            return (
              <Card key={meal.id} className="overflow-hidden">
                {meal.photo_url && (
                  <div className="aspect-video relative bg-white">
                    <img
                      src={meal.photo_url || "/placeholder.svg"}
                      alt={meal.description}
                      className="w-full h-full object-contain"
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

      {/* Image Generator */}
      {isGeneratingImage && selectedMeal && (
        <ShareableImageGenerator
          meal={selectedMeal}
          onImageGenerated={handleImageGenerated}
          onError={handleImageError}
        />
      )}

      {/* Loading indicator for image generation */}
      {isGeneratingImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
            <p className="text-neutral-700">Generando imagen...</p>
          </div>
        </div>
      )}
    </>
  )
}

