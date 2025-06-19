"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, LayoutGrid, List, Calendar, AlertCircle, Settings } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
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
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-6"></div>
        <p className="text-neutral-600 text-lg">Cargando historial...</p>
      </div>
    )
  }

  if (storageType === "supabase" && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Card className="p-8 max-w-md mx-auto">
          <CardContent className="space-y-6">
            <div className="text-neutral-400">
              <Database className="h-20 w-20 mx-auto" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Inicia sesión para ver tu historial</h3>
              <p className="text-neutral-600 mb-6">Debes iniciar sesión para ver tu historial de comidas</p>
            </div>
            <Button
              variant="default"
              onClick={() => router.push("/login")}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-6"></div>
        <p className="text-neutral-600 text-lg">Cargando historial...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Card className="p-8 max-w-md mx-auto">
          <CardContent className="space-y-6">
            <div className="text-red-400">
              <AlertCircle className="h-20 w-20 mx-auto" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Error al cargar el historial</h3>
              <p className="text-neutral-600 mb-6">{loadError}</p>
            </div>
            <Button variant="default" onClick={handleRefresh} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar nuevamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!meals || meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Card className="p-8 max-w-md mx-auto">
          <CardContent className="space-y-6">
            <div className="text-neutral-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No hay comidas registradas</h3>
              <p className="text-neutral-600 mb-6">Tus comidas registradas aparecerán aquí</p>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dataInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-6"></div>
        <p className="text-neutral-600 text-lg">Inicializando datos...</p>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Historial de Comidas</h1>
            <p className="text-gray-600">Revisa y gestiona tu registro alimentario</p>
          </div>

          {/* Cycle Info Alert */}
          {cycleSettingsLoaded && (
            <Alert className="mb-6 border-teal-200 bg-teal-50">
              <Calendar className="h-4 w-4 text-teal-600" />
              <AlertDescription className="text-teal-800">
                <span className="font-medium">Ciclo actual:</span>
                <span className="ml-2">
                  Inicia cada {getDayOfWeekName(cycleStartDay)}, duración {cycleDuration} días
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Controls Section */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="outline" size="sm" onClick={handleRefresh} className="flex-shrink-0">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>

                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "cycles" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cycles")}
                    className={`flex items-center ${
                      viewMode === "cycles"
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                        : "text-orange-600 hover:bg-orange-50"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Ciclos</span>
                  </Button>
                  <Button
                    variant={viewMode === "days" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("days")}
                    className={`flex items-center ${
                      viewMode === "days"
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                  >
                    <List className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Días</span>
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/profile/settings")}
                  className="flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Configurar</span>
                </Button>

                <div className="flex-grow"></div>

                <div className="flex space-x-2">
                  {storageType === "local" && user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/migrate")}
                      className="text-teal-600 border-teal-600 hover:bg-teal-50 flex-shrink-0"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Migrar</span>
                    </Button>
                  )}
                  <ShareDropdown meals={meals} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Section */}
          <div className="space-y-4">
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

          {/* Empty State for View Mode */}
          {viewMode === "cycles" && cycleGroups.length === 0 && meals.length > 0 && (
            <Card className="p-8 text-center">
              <CardContent>
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay ciclos con comidas</h3>
                <p className="text-gray-600">Tus comidas se agruparán por ciclos una vez que tengas registros</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
