"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useMealService } from "@/lib/meal-service"
import MealCard from "./meal-card"
import MealEditor from "./meal-editor"
import CycleSection from "./cycle-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Grid3X3, List, Clock, Utensils } from "lucide-react"
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns"
import type { Meal } from "@/lib/types"
import { groupMealsByCycle } from "@/lib/cycle-utils"
import ShareDropdown from "./share-dropdown"

type ViewMode = "cycle" | "list" | "grid"

export default function MealHistory() {
  const { user } = useAuth()
  const { meals, deleteMeal, updateMeal, loading, error } = useMealService()
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("cycle")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })

  // Group meals by cycle
  const cycleGroups = groupMealsByCycle(meals)

  // Filter meals based on date range
  const filteredMeals =
    selectedDateRange.start && selectedDateRange.end
      ? meals.filter((meal) => {
          if (!meal.created_at) return false
          const mealDate = parseISO(meal.created_at)
          return isWithinInterval(mealDate, {
            start: startOfDay(selectedDateRange.start!),
            end: endOfDay(selectedDateRange.end!),
          })
        })
      : meals

  const handleDeleteMeal = async (meal: Meal) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta comida?")) {
      try {
        await deleteMeal(meal.id)
      } catch (error) {
        console.error("Error deleting meal:", error)
      }
    }
  }

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal)
  }

  const handleUpdateMeal = async (updatedMeal: Meal) => {
    try {
      await updateMeal(updatedMeal.id, updatedMeal)
      setEditingMeal(null)
    } catch (error) {
      console.error("Error updating meal:", error)
    }
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const getMealStats = () => {
    const total = filteredMeals.length
    const today = new Date()
    const todayMeals = filteredMeals.filter((meal) => {
      if (!meal.created_at) return false
      const mealDate = parseISO(meal.created_at)
      return format(mealDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
    }).length

    return { total, today: todayMeals }
  }

  const stats = getMealStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <p className="text-red-600">Error al cargar las comidas: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (meals.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border-0 shadow-lg">
        <CardContent className="p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Comienza tu diario de comidas!</h3>
            <p className="text-gray-600 mb-6">
              Aún no has registrado ninguna comida. Agrega tu primera comida para comenzar a llevar un registro de tus
              hábitos alimenticios.
            </p>
            <div className="bg-white/80 rounded-lg p-4 border border-teal-200">
              <p className="text-sm text-teal-700 font-medium">
                💡 Consejo: Toma una foto de tu comida y agrega notas para recordar mejor tus experiencias culinarias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 meal-history-container mobile-safe-bottom">
      {/* Stats and Controls */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Tu Historial de Comidas</CardTitle>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Hoy: {stats.today}
                </Badge>
                <Badge variant="outline" className="border-gray-300">
                  Total: {stats.total}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ShareDropdown />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 overflow-x-auto">
              <Button
                variant={viewMode === "cycle" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cycle")}
                className="flex-shrink-0 h-9 px-3"
              >
                <Calendar className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Por Ciclos</span>
                <span className="sm:hidden">Ciclos</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="flex-shrink-0 h-9 px-3"
              >
                <List className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Lista</span>
                <span className="sm:hidden">Lista</span>
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="flex-shrink-0 h-9 px-3"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cuadrícula</span>
                <span className="sm:hidden">Grid</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      {viewMode === "cycle" && (
        <div className="space-y-4 sm:space-y-6">
          {cycleGroups.map((cycleGroup) => (
            <CycleSection
              key={cycleGroup.cycleNumber}
              cycleGroup={cycleGroup}
              onEditMeal={handleEditMeal}
              onDeleteMeal={handleDeleteMeal}
              isExpanded={expandedSections.has(`cycle-${cycleGroup.cycleNumber}`)}
              onToggle={() => toggleSection(`cycle-${cycleGroup.cycleNumber}`)}
            />
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-3 sm:space-y-4">
          {filteredMeals.map((meal) => (
            <div key={meal.id} className="fade-in">
              <MealCard meal={meal} onEdit={handleEditMeal} onDelete={handleDeleteMeal} showTime={true} />
            </div>
          ))}
        </div>
      )}

      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredMeals.map((meal) => (
            <div key={meal.id} className="fade-in">
              <MealCard meal={meal} onEdit={handleEditMeal} onDelete={handleDeleteMeal} showTime={true} />
            </div>
          ))}
        </div>
      )}

      {/* Meal Editor Modal */}
      {editingMeal && <MealEditor meal={editingMeal} onSave={handleUpdateMeal} onCancel={() => setEditingMeal(null)} />}
    </div>
  )
}
