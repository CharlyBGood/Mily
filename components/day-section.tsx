"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
  isPdfMode?: boolean
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
}: DaySectionProps) {
  const [open, setOpen] = useState(isExpanded)

  // Ensure meals is defined
  const safeMeals = meals || []

  // Handle open state change
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen !== open) {
      onExpand(date)
    }
  }

  // Update open state when isExpanded prop changes
  if (open !== isExpanded) {
    setOpen(isExpanded)
  }

  return (
    <Card className="mb-4 day-section">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CardHeader className="p-3 pb-0">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex justify-between items-center p-2 h-auto">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">{displayDate}</span>
                <span className="text-xs text-neutral-500">
                  {safeMeals.length} {safeMeals.length === 1 ? "comida" : "comidas"}
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

        <CollapsibleContent>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 gap-3">
              {safeMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onDelete={() => onDeleteMeal(meal)}
                  onEdit={() => onEditMeal(meal)}
                  isPdfMode={isPdfMode}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
