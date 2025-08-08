"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Calendar, BarChart3 } from "lucide-react"
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

    // Real-time date range formatting
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

  const getActiveDays = () => {
    return cycle.days.filter((day) => day.meals.length > 0).length
  }

  if (!mounted) {
    return (
      <Card className="w-full">
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
  const activeDays = getActiveDays()

  return (
    <Card className="w-full bg-white border border-gray-200 overflow-x-auto rounded-lg max-w-full min-w-0">
      <Collapsible open={isExpanded} onOpenChange={handleToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 pb-3 w-full max-w-full min-w-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{formattedDateRange}</h3>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200 px-2 py-1">
                    {totalMeals} comidas
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {activeDays}/{cycle.days.length} días
                    </span>
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
          <CardContent className="pt-0 pb-4 w-full max-w-full min-w-0">
            <div className="space-y-2 sm:space-y-3 w-full max-w-full min-w-0">
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
                  <h4 className="text-lg font-medium mb-2">No hay comidas en este ciclo</h4>
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
