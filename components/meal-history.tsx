"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, LayoutGrid, List, Calendar, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import type { Meal } from "@/lib/types"
import { groupMealsByDay } from "@/lib/utils"
import { groupMealsByCycle, getUserCycleSettings, type CycleGroup, getDayOfWeekName } from "@/lib/cycle-utils"
import DaySection from "./day-section"
import CycleSection from "./cycle-section"
import MealEditor from "./meal-editor"
import { useAuth } from "@/lib/auth-context"
import { useStorage } from "@/lib/storage-provider"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert } from "@/components/ui/alert"
import ShareDropdown from "./share-dropdown"

export default function MealHistory() {
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [cycleGroups, setCycleGroups] = useState<CycleGroup[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [cycleDuration, setCycleDuration] = useState(7)
  const [cycleStartDay, setCycleStartDay] = useState(1)
  const [viewMode, setViewMode] = useState<"days" | "cycles">("cycles")
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { getUserMeals, deleteMeal, storageType } = useStorage()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cycleSettingsLoaded, setCycleSettingsLoaded] = useState(false)
  const [dataInitialized, setDataInitialized] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const timer = setTimeout(() => {
      if (user || storageType === "local") {
        loadMeals()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [user, storageType, mounted])

  useEffect(() => {
    if (cycleSettingsLoaded && meals && meals.length > 0) {
      try {
        const cycles = groupMealsByCycle(meals, cycleDuration, cycleStartDay)
        setCycleGroups(cycles || [])
      } catch (error) {
        console.error("Error grouping meals by cycle:", error)
        setCycleGroups([])
      }
    }
  }, [cycleDuration, cycleStartDay, cycleSettingsLoaded, meals])

  const loadMeals = async () => {
    if (storageType === "supabase" && !user) {
      setLoading(false)
      setDataInitialized(true)
      return
    }

    setLoading(true)
    setLoadError(null)
    setCycleSettingsLoaded(false)

    try {
      if (user) {
        try {
          const settings = await getUserCycleSettings(user.id)
          if (settings && typeof settings.cycleDuration === "number" && typeof settings.cycleStartDay === "number") {
            setCycleDuration(settings.cycleDuration)
            setCycleStartDay(settings.cycleStartDay)
          } else {
            setCycleDuration(7)
            setCycleStartDay(1)
          }
          setCycleSettingsLoaded(true)
        } catch (error) {
          console.error("Error loading cycle settings:", error)
          setCycleDuration(7)
          setCycleStartDay(1)
          setCycleSettingsLoaded(true)
        }
      } else {
        setCycleSettingsLoaded(true)
      }

      const { success, data, error } = await getUserMeals()

      if (!success || !data) {
        setLoadError(error?.message || "Error al cargar el historial de comidas")
        toast({
          title: "Error",
          description: "Error al cargar el historial de comidas",
          variant: "destructive",
        })
        setLoading(false)
        setDataInitialized(true)
        return
      }

      const mealsArray = Array.isArray(data) ? data : []
      setMeals(mealsArray)

      try {
        const grouped = groupMealsByDay(mealsArray)
        setGroupedMeals(grouped || [])
      } catch (groupError) {
        console.error("Error grouping meals by day:", groupError)
        setGroupedMeals([])
      }

      try {
        const cycles = groupMealsByCycle(mealsArray, cycleDuration, cycleStartDay)
        setCycleGroups(cycles || [])
      } catch (cycleError) {
        console.error("Error grouping meals by cycle:", cycleError)
        setCycleGroups([])
      }

      setExpandedCycle(null)
      setDataInitialized(true)
    } catch (error) {
      console.error("Error in loadMeals:", error)
      setLoadError(error instanceof Error ? error.message : "Ocurrió un error al cargar el historial")
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar el historial",
        variant: "destructive",
      })
      setDataInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMeal = async (meal: Meal) => {
    if (!meal.id) return

    try {
      const { success, error } = await deleteMeal(meal.id)

      if (!success) {
        toast({
          title: "Error",
          description: "Error al eliminar la comida",
          variant: "destructive",
        })
        return
      }

      await loadMeals()

      toast({
        title: "Comida eliminada",
        description: "La comida ha sido eliminada exitosamente",
      })
    } catch (error) {
      console.error("Error deleting meal:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar la comida",
        variant: "destructive",
      })
    }
  }

  const handleRefresh = () => {
    loadMeals()
  }

  const handleDeleteClick = (meal: Meal) => {
    if (meal && meal.id) {
      setSelectedMeal(meal)
      setShowDeleteDialog(true)
    }
  }

  const handleEditClick = (meal: Meal) => {
    setEditingMeal(meal)
  }

  const handleEditCancel = () => {
    setEditingMeal(null)
  }

  const handleEditSaved = () => {
    setEditingMeal(null)
    loadMeals()
  }

  const handleSectionExpand = (date: string) => {
    if (!date || date === expandedSection) {
      setExpandedSection(null)
    } else {
      setExpandedSection(date)
    }
  }

  const handleCycleExpand = (cycleNumber: number) => {
    if (cycleNumber === expandedCycle) {
      setExpandedCycle(null)
    } else {
      setExpandedCycle(cycleNumber)
    }
  }

  if (editingMeal) {
    return <MealEditor meal={editingMeal} onCancel={handleEditCancel} onSaved={handleEditSaved} />
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando historial...</p>
      </div>
    )
  }

  if (storageType === "supabase" && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="mb-4 text-neutral-400">
          <Database className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium mb-1">Inicia sesión para ver tu historial</h3>
        <p className="text-neutral-500 mb-4">Debes iniciar sesión para ver tu historial de comidas</p>
        <Button variant="default" onClick={() => router.push("/login")}>
          Iniciar sesión
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando historial...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="mb-4 text-red-400">
          <AlertCircle className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium mb-1">Error al cargar el historial</h3>
        <p className="text-neutral-500 mb-4">{loadError}</p>
        <Button variant="default" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar nuevamente
        </Button>
      </div>
    )
  }

  if (!meals || meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="mb-4 text-neutral-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-1">No hay comidas registradas</h3>
        <p className="text-neutral-500 mb-4">Tus comidas registradas aparecerán aquí</p>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>
    )
  }

  if (!dataInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Inicializando datos...</p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 pb-40 max-w-full overflow-x-hidden">
          {cycleSettingsLoaded && (
            <Alert className="mb-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="font-medium">Ciclo actual:</span>
                <span className="ml-2">
                  Inicia cada {getDayOfWeekName(cycleStartDay)}, duración {cycleDuration} días
                </span>
              </div>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="flex-shrink-0">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            <div className="flex-shrink-0">
              <Button
                variant={viewMode === "cycles" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cycles")}
                className={`flex items-center ${viewMode === "cycles" ? "bg-orange-500 hover:bg-orange-600" : "text-orange-500 border-orange-500 hover:bg-orange-50"}`}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Ciclos</span>
              </Button>
            </div>

            <div className="flex-shrink-0">
              <Button
                variant={viewMode === "days" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("days")}
                className={`flex items-center ${viewMode === "days" ? "bg-green-500 hover:bg-green-600" : "text-green-500 border-green-500 hover:bg-green-50"}`}
              >
                <List className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Días</span>
              </Button>
            </div>

            <div className="flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/profile/settings")}
                className="flex items-center"
              >
                <Calendar className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Configurar ciclos</span>
              </Button>
            </div>

            <div className="flex-grow"></div>

            <div className="flex space-x-2">
              {storageType === "local" && user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/migrate")}
                  className="text-teal-600 border-teal-600 flex-shrink-0"
                >
                  <Database className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Migrar</span>
                </Button>
              )}
              <ShareDropdown meals={meals} />
            </div>
          </div>

          <div className="pdf-content">
            {viewMode === "days"
              ? (groupedMeals || []).map((group) => (
                  <DaySection
                    key={group.date}
                    date={group.date}
                    displayDate={group.displayDate}
                    meals={group.meals || []}
                    onDeleteMeal={handleDeleteClick}
                    onEditMeal={handleEditClick}
                    onExpand={handleSectionExpand}
                    isExpanded={expandedSection === group.date}
                  />
                ))
              : (cycleGroups || []).map((cycle) => (
                  <CycleSection
                    key={cycle.cycleNumber}
                    cycle={{
                      ...cycle,
                      days: cycle.days || [],
                    }}
                    onDeleteMeal={handleDeleteClick}
                    onEditMeal={handleEditClick}
                    onExpand={handleCycleExpand}
                    isExpanded={expandedCycle === cycle.cycleNumber}
                  />
                ))}
          </div>
        </div>
      </ScrollArea>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente esta comida de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (selectedMeal?.id) {
                  handleDeleteMeal(selectedMeal)
                }
                setShowDeleteDialog(false)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
