"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Calendar, Clock } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import MealCard from "./meal-card"
import type { Meal } from "@/lib/types"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import CommentButton from "./comment-button"
import NoteButton from "./note-button"

interface DaySectionProps {
  date: string
  displayDate: string
  meals: Meal[]
  onDeleteMeal?: (meal: Meal) => void
  onEditMeal?: (meal: Meal) => void
  onExpand?: (date: string) => void
  isExpanded?: boolean
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
  isExpanded = false,
  showEditButton = true,
  showDeleteButton = true,
  isSharedView = false,
}: DaySectionProps) {
  const [mounted, setMounted] = useState(false);
  const [formattedDate, setFormattedDate] = useState(displayDate);
  const [comment, setComment] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true)

    // Real-time date formatting
    try {
      const dateObj = parseISO(date)
      const formatted = format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
      setFormattedDate(formatted.charAt(0).toUpperCase() + formatted.slice(1))
    } catch (error) {
      console.error("Error formatting date:", error)
      setFormattedDate(displayDate)
    }
  }, [date, displayDate])

  const handleToggle = () => {
    if (onExpand) {
      onExpand(date)
    }
  }

  const getTimeRange = () => {
    if (!meals.length) return null

    const times = meals
      .map((meal) => meal.created_at)
      .filter(Boolean)
      .map((time) => new Date(time!))
      .sort((a, b) => a.getTime() - b.getTime())

    if (times.length === 0) return null

    const first = format(times[0], "HH:mm", { locale: es })
    const last = times.length > 1 ? format(times[times.length - 1], "HH:mm", { locale: es }) : null

    return last && last !== first ? `${first} - ${last}` : first
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

  const timeRange = getTimeRange()
  const today = new Date().toISOString().split("T")[0]
  const isToday = date === today

  return (
    <Card className="w-full bg-white border border-gray-200 overflow-x-auto rounded-lg max-w-full min-w-0">
      <Collapsible open={isExpanded} onOpenChange={handleToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 pb-3 w-full max-w-full min-w-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${isToday ? "bg-teal-500" : "bg-gray-400"}`}></div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{formattedDate}</h3>
                  {isToday && <Badge className="bg-teal-500 text-white text-xs px-2 py-1">Hoy</Badge>}
                </div>

                <div className="flex flex-wrap items-center gap-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {meals.length} comida{meals.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {timeRange && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{timeRange}</span>
                    </div>
                  )}
                  {isSharedView &&
                    <CommentButton
                      onSave={setComment}
                      onDelete={() => setComment(undefined)}
                      comment={comment} />}
                  {isSharedView && <NoteButton comment={comment} />}
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
            {meals.length > 0 ? (
              <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 w-full max-w-full min-w-0">
                {meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onDelete={onDeleteMeal}
                    onEdit={onEditMeal}
                    showDeleteButton={showDeleteButton}
                    showEditButton={showEditButton}
                    isSharedView={isSharedView}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay comidas registradas para este día</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
