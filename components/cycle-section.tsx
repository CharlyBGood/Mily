"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import MealCard from "./meal-card"
import MealThumbnail from "./meal-thumbnail"
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

  return (
    <Card className="mb-4 cycle-section">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CardHeader className="p-3 pb-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <h3 className="text-lg font-medium">
                Ciclo {cycle.cycleNumber}
                <span className="text-sm font-normal text-neutral-500 ml-2">
                  {cycle.startDate} - {cycle.endDate}
                </span>
              </h3>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-neutral-500 mr-2">{allMeals.length} comidas</span>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          {!open && (
            <div className="meal-thumbnails flex flex-wrap gap-1 mt-2">
              {allMeals.slice(0, 5).map((meal) => (
                <MealThumbnail key={meal.id} meal={meal} size="sm" />
              ))}
              {allMeals.length > 5 && <div className="text-xs text-neutral-500 ml-1">+{allMeals.length - 5} más</div>}
            </div>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0">
            <div className="space-y-4">
              {cycle.days.map((day) => (
                <div key={day.date} className="border-t pt-3 first:border-t-0 first:pt-0">
                  <h4 className="text-md font-medium mb-2">{day.displayDate}</h4>
                  <div className="space-y-3">
                    {day.meals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onDelete={() => onDeleteMeal(meal)}
                        onEdit={() => onEditMeal(meal)}
                        isPdfMode={isPdfMode}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
