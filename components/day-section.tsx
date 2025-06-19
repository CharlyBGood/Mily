"use client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Calendar, Clock } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import MealCard from "./meal-card"
import type { Meal } from "@/lib/types"

interface DaySectionProps {
  date: string
  displayDate: string
  meals: Meal[]
  onDeleteMeal: (meal: Meal) => void
  onEditMeal: (meal: Meal) => void
  onExpand: (date: string) => void
  isExpanded: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
  isSharedView?: boolean
}

export default function DaySection({
  date,
  displayDate,
  meals,
  onDeleteMeal,
  onEditMeal,
  onExpand,
  isExpanded,
  showEditButton = true,
  showDeleteButton = true,
  isSharedView = false,
}: DaySectionProps) {
  const handleExpand = () => {
    onExpand(date)
  }

  const mealThumbnails = meals
    .filter((meal) => meal.photo_url)
    .slice(0, 3)
    .map((meal) => meal.photo_url)

  // Get today's date for comparison
  const today = new Date().toISOString().split("T")[0]
  const isToday = date === today
  const isPast = date < today

  return (
    <Card
      className={`day-section mb-3 sm:mb-4 overflow-hidden border-0 shadow-md transition-all duration-200 hover:shadow-lg ${
        isToday
          ? "bg-gradient-to-br from-teal-50 to-cyan-50 border-l-4 border-l-teal-500"
          : isPast
            ? "bg-gradient-to-br from-gray-50 to-slate-50"
            : "bg-gradient-to-br from-blue-50 to-indigo-50"
      }`}
    >
      <Collapsible open={isExpanded} onOpenChange={handleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className={`cursor-pointer transition-all duration-200 p-4 sm:p-5 ${
              isToday
                ? "hover:bg-gradient-to-br hover:from-teal-100 hover:to-cyan-100"
                : isPast
                  ? "hover:bg-gradient-to-br hover:from-gray-100 hover:to-slate-100"
                  : "hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div
                  className={`flex-shrink-0 p-1.5 sm:p-2 rounded-full ${
                    isToday ? "bg-teal-500" : isPast ? "bg-gray-500" : "bg-blue-500"
                  }`}
                >
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{displayDate}</h3>
                    {isToday && (
                      <Badge className="bg-teal-500 hover:bg-teal-600 text-white text-xs flex-shrink-0">Hoy</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>
                      {meals.length} comida{meals.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                {!isExpanded && mealThumbnails.length > 0 && (
                  <div className="meal-thumbnails flex -space-x-1 sm:-space-x-2">
                    {mealThumbnails.map((photoUrl, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white border-2 border-white shadow-sm"
                        style={{ zIndex: mealThumbnails.length - index }}
                      >
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
                    {meals.filter((meal) => meal.photo_url).length > 3 && (
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs text-white font-semibold ${
                          isToday ? "bg-teal-500" : isPast ? "bg-gray-500" : "bg-blue-500"
                        }`}
                      >
                        +{meals.filter((meal) => meal.photo_url).length - 3}
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
          <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
            <div className="space-y-2 sm:space-y-3">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onDelete={showDeleteButton && !isSharedView ? onDeleteMeal : undefined}
                  onEdit={showEditButton && !isSharedView ? onEditMeal : undefined}
                  isSharedView={isSharedView}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
