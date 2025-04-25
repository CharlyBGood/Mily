"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react"
import type { Meal } from "@/lib/local-storage"
import MealCard from "./meal-card"
import MealThumbnail from "./meal-thumbnail"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog"

interface DaySectionProps {
  date: string
  displayDate: string
  meals: Meal[]
  onDeleteMeal: (meal: Meal) => void
  onEditMeal: (meal: Meal) => void
  onExpand: (date: string) => void
  isExpanded: boolean
  isPdfMode?: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
}

export default function DaySection({
  date,
  displayDate,
  meals,
  onDeleteMeal,
  onEditMeal,
  onExpand,
  isExpanded,
  isPdfMode = false,
  showEditButton = true,
  showDeleteButton = true,
}: DaySectionProps) {
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [open, setOpen] = useState(isExpanded)

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
      onExpand(date)
    } else {
      // When collapsing, notify parent by passing null or empty string
      onExpand("")
    }
  }

  return (
    <div className="mb-6 day-section" data-pdf-section={isPdfMode ? "true" : "false"}>
      <Collapsible open={open || isPdfMode} onOpenChange={handleToggle} className="w-full">
        <CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-semibold mb-3 bg-teal-50 p-2 rounded-md text-teal-800 hover:bg-teal-100 transition-colors day-header">
          <span>{displayDate}</span>
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </CollapsibleTrigger>

        <CollapsibleContent forceMount={isPdfMode} className={isPdfMode ? "!block pdf-section-content" : ""}>
          <div className="space-y-4">
            {meals.map((meal) => (
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
          <div className="grid grid-cols-2 gap-2 mt-2 meal-thumbnails">
            {meals.map((meal) => (
              <MealThumbnail key={meal.id} meal={meal} onClick={() => handleMealClick(meal)} />
            ))}
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
