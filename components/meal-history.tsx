"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { type Meal, getUserMeals, deleteMeal } from "@/lib/local-storage"
import { groupMealsByDay } from "@/lib/utils"
import DaySection from "./day-section"
import MealEditor from "./meal-editor"
import ShareDropdown from "./share-dropdown"
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

export default function MealHistory() {
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [expandAllForPdf, setExpandAllForPdf] = useState(false)
  const [isPdfMode, setIsPdfMode] = useState(false)
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
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

      // Store raw meals for PDF export
      setMeals(data)

      // Group meals by day for display
      const grouped = groupMealsByDay(data)
      setGroupedMeals(grouped)
      console.log(`Loaded ${data.length} meals in ${grouped.length} days`)
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

  const handleDeleteMeal = async (meal: Meal) => {
    if (!meal.id) return

    try {
      const { success, error } = await deleteMeal(meal.id)

      if (!success) {
        toast({
          title: "Error",
          description: "Error al eliminar la comida",
          variant: "destructive",
        })
        return
      }

      // Reload meals to update the grouped structure
      await loadMeals()

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

  const handleRefresh = () => {
    loadMeals()
  }

  const handleDeleteClick = (meal: Meal) => {
    if (meal && meal.id) {
      setSelectedMeal(meal)
      setShowDeleteDialog(true)
    }
  }

  const handleEditClick = (meal: Meal) => {
    setEditingMeal(meal)
  }

  const handleEditCancel = () => {
    setEditingMeal(null)
  }

  const handleEditSaved = () => {
    setEditingMeal(null)
    loadMeals()
  }

  const handleSectionExpand = (date: string) => {
    // If we're in PDF export mode, don't change expanded sections
    if (expandAllForPdf) return

    // If date is empty or matches current expanded section, collapse it
    if (!date || date === expandedSection) {
      setExpandedSection(null)
    } else {
      setExpandedSection(date)
    }
  }

  // Prepare content for PDF export
  const prepareForPdfExport = async (): Promise<HTMLElement | null> => {
    console.log("Preparing content for PDF export")

    try {
      // Set PDF mode to true
      setIsPdfMode(true)
      setExpandAllForPdf(true)

      // Wait for state update and rendering
      console.log("Waiting for state update and rendering")
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Increased timeout for better rendering

      // Create a clone of the content for PDF export
      if (!contentRef.current) {
        console.error("Content ref is null")
        return null
      }

      // Create a new div for PDF content
      if (!pdfContentRef.current) {
        console.error("PDF content ref is null")
        return null
      }

      // Clear previous content
      pdfContentRef.current.innerHTML = ""

      // Clone the content
      const clone = contentRef.current.cloneNode(true) as HTMLElement

      // Append the clone to the PDF content div
      pdfContentRef.current.appendChild(clone)

      // Process the clone to ensure all sections are expanded and buttons are hidden
      const sections = pdfContentRef.current.querySelectorAll(".day-section")
      console.log(`Found ${sections.length} day sections`)

      sections.forEach((section) => {
        // Ensure all sections are expanded
        const collapsible = section.querySelector("[data-state]")
        if (collapsible) {
          collapsible.setAttribute("data-state", "open")
        }

        // Hide thumbnails
        const thumbnails = section.querySelector(".meal-thumbnails")
        if (thumbnails) {
          ;(thumbnails as HTMLElement).style.display = "none"
        }

        // Hide any buttons or interactive elements
        const buttons = section.querySelectorAll("button")
        buttons.forEach((button) => {
          ;(button as HTMLElement).style.display = "none"
        })

        // Make sure all content is visible
        const collapsibleContent = section.querySelector('[data-state="closed"]')
        if (collapsibleContent) {
          collapsibleContent.setAttribute("data-state", "open")
          ;(collapsibleContent as HTMLElement).style.display = "block"
        }
      })

      // Process all images to ensure they load properly
      const images = pdfContentRef.current.querySelectorAll("img")
      console.log(`Found ${images.length} images to process`)

      // Wait for all images to load
      const imagePromises = Array.from(images).map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
          } else {
            img.onload = () => resolve()
            img.onerror = () => resolve() // Continue even if image fails
          }

          // Force reload the image with crossOrigin
          if (img.src && !img.src.includes("placeholder")) {
            const originalSrc = img.src
            img.crossOrigin = "anonymous"
            img.src = originalSrc
          }
        })
      })

      // Wait for all images to process
      await Promise.all(imagePromises)
      console.log("All images processed")

      // Wait a bit more for any DOM updates to complete
      await new Promise((resolve) => setTimeout(resolve, 500))

      console.log("Content prepared successfully")
      return pdfContentRef.current
    } catch (error) {
      console.error("Error preparing content for PDF export:", error)
      return null
    }
  }

  // Restore state after PDF export
  const cleanupAfterPdfExport = () => {
    console.log("Cleaning up after PDF export")
    setExpandAllForPdf(false)
    setIsPdfMode(false)

    // Clear the PDF content
    if (pdfContentRef.current) {
      pdfContentRef.current.innerHTML = ""
    }
  }

  // If we're editing a meal, show the editor
  if (editingMeal) {
    return <MealEditor meal={editingMeal} onCancel={handleEditCancel} onSaved={handleEditSaved} />
  }

  if (!mounted) {
    // Return a placeholder with the same structure to prevent hydration mismatch
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando historial...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando historial...</p>
      </div>
    )
  }

  if (groupedMeals.length === 0) {
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
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <ShareDropdown meals={meals} disabled={true} />
        </div>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 pb-40">
          <div className="flex justify-between mb-4">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>

            <ShareDropdown
              meals={meals}
              disabled={loading}
              onBeforePdfExport={prepareForPdfExport}
              onAfterPdfExport={cleanupAfterPdfExport}
            />
          </div>

          <div id="pdf-content" ref={contentRef} className="pdf-content">
            {groupedMeals.map((group) => (
              <DaySection
                key={group.date}
                date={group.date}
                displayDate={group.displayDate}
                meals={group.meals}
                onDeleteMeal={handleDeleteClick}
                onEditMeal={handleEditClick}
                onExpand={handleSectionExpand}
                isExpanded={expandAllForPdf || expandedSection === group.date}
                isPdfMode={isPdfMode}
              />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Hidden div for PDF rendering */}
      <div ref={pdfContentRef} className="hidden pdf-render-container"></div>

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
                  handleDeleteMeal(selectedMeal)
                }
                setShowDeleteDialog(false)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
