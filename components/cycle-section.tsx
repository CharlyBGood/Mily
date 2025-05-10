"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import MealCard from "./meal-card"
import type { CycleGroup } from "@/lib/cycle-utils"
import type { Meal } from "@/lib/types"

interface CycleSectionProps {
  cycle: CycleGroup
  onDeleteMeal: (meal: Meal) => void
  onEditMeal: (meal: Meal) => void
  onExpand: (cycleNumber: number) => void
  isExpanded: boolean
  isPdfMode?: boolean
}

export default function CycleSection({
  cycle,
  onDeleteMeal,
  onEditMeal,
  onExpand,
  isExpanded,
  isPdfMode = false,
}: CycleSectionProps) {
  const [open, setOpen] = useState(isExpanded)

  // Update open state when isExpanded prop changes
  if (open !== isExpanded) {
    setOpen(isExpanded)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      onExpand(cycle.cycleNumber)
    } else {
      onExpand(-1)
    }
  }

  // Get all meals from all days in the cycle
  const allMeals = cycle.days.flatMap((day) => day.meals)

  // Get thumbnails for preview (up to 4)
  const thumbnails: string[] = []
  if (!open) {
    for (const day of cycle.days) {
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

  return (
    <Card className="mb-4 cycle-section">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CardHeader className="p-3 pb-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <h3 className="text-lg font-medium">
                Ciclo {cycle.cycleNumber}
                <span className="text-sm font-normal text-neutral-500 ml-2">{cycle.displayDateRange}</span>
              </h3>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-neutral-500 mr-2">{allMeals.length} comidas</span>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          {!open && thumbnails.length > 0 && (
            <div className="meal-thumbnails flex flex-wrap gap-1 mt-2">
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
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0">
            <div className="space-y-4">
              {cycle.days.map((day) => {
                // Skip days with no meals
                if (!day.meals || day.meals.length === 0) return null

                return (
                  <div key={day.date} className="space-y-3">
                    {day.meals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onDelete={() => onDeleteMeal(meal)}
                        onEdit={() => onEditMeal(meal)}
                        isPdfMode={isPdfMode}
                        showTime={true}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
