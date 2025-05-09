"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MealCard from "./meal-card"
import type { Meal } from "@/lib/types"
import type { CycleGroup } from "@/lib/cycle-utils"

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
  const [open, setOpen] = useState(isExpanded)

  // Ensure cycle and days are defined
  const safeCycle = cycle || { cycleNumber: 0, startDate: "", endDate: "", displayDateRange: "", days: [] }
  const safeDays = safeCycle.days || []

  // Count total meals in this cycle
  const totalMeals = safeDays.reduce((total, day) => total + (day.meals?.length || 0), 0)

  // Get thumbnails for preview (up to 4)
  const thumbnails: string[] = []
  if (!open) {
    for (const day of safeDays) {
      if (!day.meals) continue
      for (const meal of day.meals) {
        if (meal.photo_url && thumbnails.length < 4) {
          thumbnails.push(meal.photo_url)
        }
        if (thumbnails.length >= 4) break
      }
      if (thumbnails.length >= 4) break
    }
  }

  // Handle open state change
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen !== open) {
      onExpand(safeCycle.cycleNumber)
    }
  }

  // Update open state when isExpanded prop changes
  if (open !== isExpanded) {
    setOpen(isExpanded)
  }

  return (
    <Card className="mb-4 cycle-section">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CardHeader className="p-3 pb-0">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex justify-between items-center p-2 h-auto">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">
                  Ciclo {safeCycle.cycleNumber} ({safeCycle.displayDateRange})
                </span>
                <span className="text-xs text-neutral-500">
                  {totalMeals} {totalMeals === 1 ? "comida" : "comidas"}
                </span>
              </div>
              {open ? (
                <ChevronUp className="h-4 w-4 text-neutral-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        {!open && thumbnails.length > 0 && (
          <div className="px-3 pb-3 meal-thumbnails">
            <div className="flex space-x-2 mt-2 overflow-x-auto pb-1">
              {thumbnails.map((url, index) => (
                <div key={index} className="w-16 h-16 rounded-md bg-neutral-100 flex-shrink-0 overflow-hidden">
                  <img
                    src={url || "/placeholder.svg"}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    crossOrigin="anonymous"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <CollapsibleContent>
          <CardContent className="p-3">
            {safeDays.map((day) => {
              // Skip days with no meals
              if (!day.meals || day.meals.length === 0) return null

              return (
                <div key={day.date} className="mb-4 last:mb-0">
                  <h4 className="text-sm font-medium mb-2">{day.displayDate}</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {(day.meals || []).map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onDelete={() => onDeleteMeal(meal)}
                        onEdit={() => onEditMeal(meal)}
                        isPdfMode={isPdfMode}
                        showEditButton={showEditButton}
                        showDeleteButton={showDeleteButton}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
