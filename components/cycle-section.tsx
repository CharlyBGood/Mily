"use client"

import type React from "react"
import type { CycleGroup, Meal } from "../types"
import DaySection from "./day-section"

interface CycleSectionProps {
  cycle: CycleGroup
  onDeleteMeal: (id: string) => void
  onEditMeal: (meal: Meal) => void
  onExpand: (cycleNumber: number) => void
  isExpanded: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
  isSharedView?: boolean
}

const CycleSection: React.FC<CycleSectionProps> = ({
  cycle,
  onDeleteMeal,
  onEditMeal,
  onExpand,
  isExpanded,
  showEditButton = true,
  showDeleteButton = true,
  isSharedView = false,
}) => {
  return (
    <div className="cycle-section">
      <div className="cycle-header">
        <h3>Cycle {cycle.cycleNumber}</h3>
        <button onClick={() => onExpand(cycle.cycleNumber)}>{isExpanded ? "Collapse" : "Expand"}</button>
      </div>
      {isExpanded && (
        <div className="cycle-content">
          {cycle.days.map((day) => (
            <DaySection
              key={day.date}
              date={day.date}
              displayDate={day.displayDate}
              meals={day.meals}
              onDeleteMeal={showDeleteButton && !isSharedView ? onDeleteMeal : () => {}}
              onEditMeal={showEditButton && !isSharedView ? onEditMeal : () => {}}
              onExpand={() => {}}
              isExpanded={true}
              showEditButton={showEditButton && !isSharedView}
              showDeleteButton={showDeleteButton && !isSharedView}
              isSharedView={isSharedView}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CycleSection
