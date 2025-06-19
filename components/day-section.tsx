"use client"

import type React from "react"
import type { Meal } from "../types"
import MealCard from "./meal-card"

interface DaySectionProps {
  date: string
  displayDate: string
  meals: Meal[]
  onDeleteMeal: (id: string) => void
  onEditMeal: (meal: Meal) => void
  onExpand: (date: string) => void
  isExpanded: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
  isSharedView?: boolean
}

const DaySection: React.FC<DaySectionProps> = ({
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
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">{displayDate}</h2>
        <button onClick={() => onExpand(date)} className="text-blue-500 hover:underline">
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {isExpanded && (
        <div>
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onDelete={showDeleteButton && !isSharedView ? onDeleteMeal : undefined}
              onEdit={showEditButton && !isSharedView ? onEditMeal : undefined}
              showEditButton={showEditButton && !isSharedView}
              showDeleteButton={showDeleteButton && !isSharedView}
            />
          ))}
          {meals.length === 0 && <p className="text-gray-500">No meals for this day.</p>}
        </div>
      )}
    </div>
  )
}

export default DaySection
