"use client"

import type { Meal } from "@/lib/local-storage"
import { getMealTypeLabel } from "@/lib/utils"

interface MealThumbnailProps {
  meal: Meal
  onClick: () => void
}

export default function MealThumbnail({ meal, onClick }: MealThumbnailProps) {
  return (
    <div
      className="flex items-center p-2 border rounded-md bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      {meal.photo_url && (
        <div className="w-16 h-16 flex-shrink-0 mr-3 overflow-hidden rounded-md">
          <img
            src={meal.photo_url || "/placeholder.svg"}
            alt={meal.description}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{meal.description}</p>
        <p className="text-xs text-teal-600">{getMealTypeLabel(meal.meal_type)}</p>
      </div>
    </div>
  )
}
