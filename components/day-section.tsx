"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
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
  isPdfMode = false,
  showEditButton = true,
  showDeleteButton = true,
  isSharedView = false,
}: DaySectionProps) {
  const [open, setOpen] = useState(isExpanded)

  // Update open state when isExpanded prop changes
  if (open !== isExpanded) {
    setOpen(isExpanded)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      onExpand(date)
    } else {
      onExpand("")
    }
  }

  // Get thumbnails for preview (up to 4)
  const thumbnails: string[] = []
  if (!open) {
    for (const meal of meals) {
      if (meal.photo_url && thumbnails.length < 4) {
        thumbnails.push(meal.photo_url)
      }
      if (thumbnails.length >= 4) break
    }
  }

  return (
    <Card className="mb-4 day-section">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CardHeader className="p-3 pb-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <h3 className="text-lg font-medium">{displayDate}</h3>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-neutral-500 mr-2">{meals.length} comidas</span>
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
            <div className="space-y-3">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onDelete={showDeleteButton && !isSharedView ? () => onDeleteMeal(meal) : undefined}
                  onEdit={showEditButton && !isSharedView ? () => onEditMeal(meal) : undefined}
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
