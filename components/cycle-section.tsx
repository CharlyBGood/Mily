"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Calendar, TrendingUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import DaySection from "./day-section"
import type { CycleGroup } from "@/lib/cycle-utils"
import type { Meal } from "@/lib/types"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface CycleSectionProps {
  cycle: CycleGroup
  onDeleteMeal?: (meal: Meal) => void
  onEditMeal?: (meal: Meal) => void
  onExpand?: (cycleNumber: number) => void
  isExpanded?: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
  isSharedView?: boolean
}

export default function CycleSection({
  cycle,
  onDeleteMeal,
  onEditMeal,
  onExpand,
  isExpanded = false,
  showEditButton = true,
  showDeleteButton = true,
  isSharedView = false,
}: CycleSectionProps) {
  const [mounted, setMounted] = useState(false)
  const [formattedDateRange, setFormattedDateRange] = useState(cycle.displayDateRange)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    // Enhanced date range formatting with real-time updates
    try {
      const startDate = parseISO(cycle.startDate)
      const endDate = parseISO(cycle.endDate)

      const startFormatted = format(startDate, "d MMM", { locale: es })
      const endFormatted = format(endDate, "d MMM", { locale: es })
      const year = format(endDate, "yyyy", { locale: es })

      setFormattedDateRange(`Ciclo ${cycle.cycleNumber}: ${startFormatted} - ${endFormatted} ${year}`)
    } catch (error) {
      console.error("Error formatting cycle date range:", error)
      setFormattedDateRange(cycle.displayDateRange)
    }
  }, [cycle.startDate, cycle.endDate, cycle.cycleNumber, cycle.displayDateRange])

  const handleToggle = () => {
    if (onExpand) {
      onExpand(cycle.cycleNumber)
    }
  }

  const handleDayExpand = (date: string) => {
    setExpandedDay(date === expandedDay ? null : date)
  }

  const getTotalMeals = () => {
    return cycle.days.reduce((total, day) => total + day.meals.length, 0)
  }

  const getMealTypeStats = () => {
    const allMeals = cycle.days.flatMap((day) => day.meals)
    const stats = allMeals.reduce(
      (acc, meal) => {
        const type = meal.meal_type || "other"
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(stats).map(([type, count]) => ({ type, count }))
  }

  const getActiveDays = () => {
    return cycle.days.filter((day) => day.meals.length > 0).length
  }

  const getCycleProgress = () => {
    const totalDays = cycle.days.length
    const activeDays = getActiveDays()
    return Math.round((activeDays / totalDays) * 100)
  }

  if (!mounted) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const totalMeals = getTotalMeals()
  const mealStats = getMealTypeStats()
  const activeDays = getActiveDays()
  const progress = getCycleProgress()

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-r from-white to-gray-50 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={handleToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50 transition-all duration-200 pb-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 truncate">{formattedDateRange}</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-teal-50 text-teal-700 border border-teal-200">
                      {totalMeals} comidas
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-600">
                      {activeDays}/{cycle.days.length} días
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-teal-400 to-blue-400 rounded-full"></div>
                    <span className="font-medium text-gray-600">{progress}% completado</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {mealStats.slice(0, 2).map(({ type, count }) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="ml-4 flex-shrink-0">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-6">
            <div className="space-y-4">
              {cycle.days
                .filter((day) => day.meals.length > 0)
                .map((day) => (
                  <DaySection
                    key={day.date}
                    date={day.date}
                    displayDate={day.displayDate}
                    meals={day.meals}
                    onDeleteMeal={onDeleteMeal}
                    onEditMeal={onEditMeal}
                    onExpand={handleDayExpand}
                    isExpanded={expandedDay === day.date}
                    showEditButton={showEditButton}
                    showDeleteButton={showDeleteButton}
                    isSharedView={isSharedView}
                  />
                ))}

              {cycle.days.every((day) => day.meals.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-semibold mb-2">No hay comidas en este ciclo</h4>
                  <p>Las comidas aparecerán aquí una vez que las registres</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
