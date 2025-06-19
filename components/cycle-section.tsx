"use client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Calendar, Clock } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
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
  const handleExpand = () => {
    onExpand(cycle.cycleNumber)
  }

  // Filter out days with no meals - this is the key fix
  const daysWithMeals = cycle.days.filter((day) => day.meals && day.meals.length > 0)

  // Get all meals from days that have meals
  const allMeals = daysWithMeals.flatMap((day) => day.meals)
  const totalMeals = allMeals.length

  // If no meals in this cycle, don't render the cycle at all
  if (totalMeals === 0) {
    return null
  }

  // Get meal thumbnails for preview
  const mealThumbnails = allMeals
    .filter((meal) => meal.photo_url)
    .slice(0, 3)
    .map((meal) => meal.photo_url)

  return (
    <Card className="cycle-section mb-3 sm:mb-6 overflow-hidden border-0 shadow-md sm:shadow-lg bg-gradient-to-br from-orange-50 to-amber-50">
      <Collapsible open={isExpanded} onOpenChange={handleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gradient-to-br hover:from-orange-100 hover:to-amber-100 transition-all duration-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div className="flex-shrink-0 p-1.5 sm:p-2 bg-orange-500 rounded-full">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Ciclo {cycle.cycleNumber}</h3>
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800 border-orange-200 text-xs sm:text-sm flex-shrink-0"
                    >
                      {daysWithMeals.length} día{daysWithMeals.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 truncate">
                    {cycle.displayDateRange.replace(`Ciclo ${cycle.cycleNumber}: `, "")}
                  </p>
                  <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>
                        {totalMeals} comida{totalMeals !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                {!isExpanded && mealThumbnails.length > 0 && (
                  <div className="meal-thumbnails flex -space-x-1 sm:-space-x-2">
                    {mealThumbnails.map((photoUrl, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white border-2 border-white shadow-md"
                        style={{ zIndex: mealThumbnails.length - index }}
                      >
                        <img
                          src={photoUrl || "/placeholder.svg?height=48&width=48"}
                          alt="Meal thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg?height=48&width=48"
                          }}
                        />
                      </div>
                    ))}
                    {allMeals.filter((meal) => meal.photo_url).length > 3 && (
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-orange-500 border-2 border-white shadow-md flex items-center justify-center text-xs text-white font-semibold">
                        +{allMeals.filter((meal) => meal.photo_url).length - 3}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-full bg-white/50">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-4 sm:space-y-6">
              {daysWithMeals.map((day, dayIndex) => (
                <div key={day.date} className="relative">
                  {dayIndex > 0 && (
                    <div className="absolute left-4 sm:left-6 -top-2 sm:-top-3 w-0.5 h-4 sm:h-6 bg-gradient-to-b from-orange-200 to-transparent"></div>
                  )}
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-orange-200">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 sm:mb-3">
                        <h4 className="font-semibold text-gray-900 text-base sm:text-lg">{day.displayDate}</h4>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {day.meals.length} comida{day.meals.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        {day.meals.map((meal) => (
                          <div key={meal.id} className="ml-2 sm:ml-4">
                            <MealCard
                              meal={meal}
                              onDelete={showDeleteButton && !isSharedView ? onDeleteMeal : undefined}
                              onEdit={showEditButton && !isSharedView ? onEditMeal : undefined}
                              isSharedView={isSharedView}
                              showTime={true}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
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
