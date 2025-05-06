"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react"
import type { Meal } from "@/lib/types"
import type { CycleGroup } from "@/lib/cycle-utils"
import MealCard from "./meal-card"
import MealThumbnail from "./meal-thumbnail"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface CycleSectionProps {
  cycle: CycleGroup
  onDeleteMeal: (meal: Meal) => void
  onEditMeal: (meal: Meal) => void
  onExpand: (cycleNumber: number) => void
  isExpanded: boolean
  isPdfMode?: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
}

export default function CycleSection({
  cycle,
  onDeleteMeal,
  onEditMeal,
  onExpand,
  isExpanded,
  isPdfMode = false,
  showEditButton = true,
  showDeleteButton = true,
}: CycleSectionProps) {
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [open, setOpen] = useState(false)

  // Sync internal state with prop
  useEffect(() => {
    setOpen(isExpanded)
  }, [isExpanded])

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal)
    setDialogOpen(true)
  }

  const handleToggle = (openState: boolean) => {
    setOpen(openState)
    if (openState) {
      onExpand(cycle.cycleNumber)
    } else {
      // When collapsing, notify parent by passing 0 or null
      onExpand(0)
    }
  }

  // Format dates for display
  const startDateFormatted = format(cycle.startDate, "d 'de' MMM", { locale: es })
  const endDateFormatted = format(cycle.endDate, "d 'de' MMM", { locale: es })

  return (
    <div className="mb-4 cycle-section" data-pdf-section={isPdfMode ? "true" : "false"}>
      <Collapsible open={open || isPdfMode} onOpenChange={handleToggle} className="w-full">
        <CollapsibleTrigger className="flex items-center justify-between w-full text-base sm:text-lg font-semibold mb-2 bg-white p-2 rounded-md text-neutral-800 hover:bg-neutral-50 transition-colors cycle-header border-t-4 border-t-orange-500 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <span className="mr-2">Ciclo {cycle.cycleNumber}</span>
            <span className="text-sm sm:text-base text-neutral-500">
              {startDateFormatted} - {endDateFormatted}
            </span>
          </div>
          {open ? (
            <ChevronDown className="h-5 w-5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent forceMount={isPdfMode} className={isPdfMode ? "!block pdf-section-content" : ""}>
          <div className="space-y-3 mt-2">
            {cycle.meals.map((meal) => (
              <div key={meal.id} className="meal-card">
                <MealCard
                  meal={meal}
                  onDelete={onDeleteMeal}
                  onEdit={onEditMeal}
                  showTime={true}
                  isPdfMode={isPdfMode}
                  showEditButton={showEditButton}
                  showDeleteButton={showDeleteButton}
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>

        {!open && !isPdfMode && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 meal-thumbnails">
            {cycle.meals.slice(0, 4).map((meal) => (
              <MealThumbnail key={meal.id} meal={meal} onClick={() => handleMealClick(meal)} />
            ))}
            {cycle.meals.length > 4 && (
              <div
                className="flex items-center justify-center p-2 border rounded-md bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(true)}
              >
                <span className="text-sm text-gray-500">+{cycle.meals.length - 4} más</span>
              </div>
            )}
          </div>
        )}
      </Collapsible>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 left-0 z-10 p-2">
            <DialogClose className="rounded-full opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 bg-white/80 p-1.5 shadow-sm">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </DialogClose>
          </div>
          {selectedMeal && (
            <MealCard
              meal={selectedMeal}
              onDelete={() => {
                setDialogOpen(false)
                if (selectedMeal.id) {
                  onDeleteMeal(selectedMeal)
                }
              }}
              onEdit={() => {
                setDialogOpen(false)
                onEditMeal(selectedMeal)
              }}
              showTime={true}
              showEditButton={showEditButton}
              showDeleteButton={showDeleteButton}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
