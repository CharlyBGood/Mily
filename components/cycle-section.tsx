"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Calendar } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import MealCard from "./meal-card"
import type { Meal } from "@/lib/types"
import type { CycleGroup } from "@/lib/cycle-utils"

interface CycleSectionProps {
  cycle: CycleGroup
  onDeleteMeal: (meal: Meal) => void
  onEditMeal: (meal: Meal) => void
  onExpand: (cycleNumber: number) => void
  isExpanded: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
  isSharedView?: boolean
}

export default function CycleSection({
  cycle,
  onDeleteMeal,
  onEditMeal,
  onExpand,
  isExpanded,
  showEditButton = true,
  showDeleteButton = true,
  isSharedView = false,
}: CycleSectionProps) {
  const [thumbnailsVisible, setThumbnailsVisible] = useState(true)

  const handleExpand = () => {
    onExpand(cycle.cycleNumber)
  }

  // Get all meals from all days in the cycle
  const allMeals = cycle.days.flatMap((day) => day.meals)
  const totalMeals = allMeals.length

  // Get meal thumbnails
  const mealThumbnails = allMeals
    .filter((meal) => meal.photo_url)
    .slice(0, 3)
    .map((meal) => meal.photo_url)

  return (
    <div className="cycle-section mb-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={handleExpand}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-4 justify-between hover:bg-gray-50 text-left h-auto"
            onClick={handleExpand}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div className="flex-shrink-0">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{cycle.displayDateRange}</h3>
                <p className="text-sm text-gray-500">
                  {totalMeals} comida{totalMeals !== 1 ? "s" : ""} • {cycle.days.length} día
                  {cycle.days.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {!isExpanded && mealThumbnails.length > 0 && thumbnailsVisible && (
              <div className="meal-thumbnails flex space-x-2">
                {mealThumbnails.map((photoUrl, index) => (
                  <div key={index} className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={photoUrl || "/placeholder.svg?height=40&width=40"}
                      alt="Meal thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=40&width=40"
                      }}
                    />
                  </div>
                ))}
                {allMeals.filter((meal) => meal.photo_url).length > 3 && (
                  <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                    +{allMeals.filter((meal) => meal.photo_url).length - 3}
                  </div>
                )}
              </div>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-4">
            {cycle.days.map((day) => (
              <div key={day.date} className="border-l-2 border-orange-200 pl-4">
                <h4 className="font-medium text-gray-800 mb-2">{day.displayDate}</h4>
                <div className="space-y-3">
                  {day.meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onDelete={showDeleteButton ? onDeleteMeal : undefined}
                      onEdit={showEditButton ? onEditMeal : undefined}
                      isSharedView={isSharedView}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
