"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, LayoutGrid, List, Calendar, AlertCircle, Settings, Filter } from "lucide-react"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
  const [showMobileFilters, setShowMobileFilters] = useState(false)
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
    if (cycleSettingsLoaded && meals && Array.isArray(meals) && meals.length > 0) {
      try {
        const cycles = groupMealsByCycle(meals, cycleDuration, cycleStartDay)
        setCycleGroups(Array.isArray(cycles) ? cycles : [])
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
        setGroupedMeals(Array.isArray(grouped) ? grouped : [])
      } catch (groupError) {
        console.error("Error grouping meals by day:", groupError)
        setGroupedMeals([])
      }

      try {
        const cycles = groupMealsByCycle(mealsArray, cycleDuration, cycleStartDay)
        setCycleGroups(Array.isArray(cycles) ? cycles : [])
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
      <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-teal-600 mb-4 sm:mb-6"></div>
        <p className="text-neutral-600 text-sm sm:text-lg">Cargando historial...</p>
      </div>
    )
  }

  if (storageType === "supabase" && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8 text-center">
        <Card className="p-6 sm:p-8 max-w-md mx-auto w-full">
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="text-neutral-400">
              <Database className="h-16 w-16 sm:h-20 sm:w-20 mx-auto" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Inicia sesión para ver tu historial</h3>
              <p className="text-neutral-600 text-sm sm:text-base mb-4 sm:mb-6">
                Debes iniciar sesión para ver tu historial de comidas
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => router.push("/login")}
              className="w-full h-11 sm:h-12 bg-teal-600 hover:bg-teal-700"
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-teal-600 mb-4 sm:mb-6"></div>
        <p className="text-neutral-600 text-sm sm:text-lg">Cargando historial...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8 text-center">
        <Card className="p-6 sm:p-8 max-w-md mx-auto w-full">
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="text-red-400">
              <AlertCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Error al cargar el historial</h3>
              <p className="text-neutral-600 text-sm sm:text-base mb-4 sm:mb-6">{loadError}</p>
            </div>
            <Button variant="default" onClick={handleRefresh} className="w-full h-11 sm:h-12">
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar nuevamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Safe check for meals array
  const safeMeals = Array.isArray(meals) ? meals : []
  const safeGroupedMeals = Array.isArray(groupedMeals) ? groupedMeals : []
  const safeCycleGroups = Array.isArray(cycleGroups) ? cycleGroups : []

  if (safeMeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8 text-center">
        <Card className="p-6 sm:p-8 max-w-md mx-auto w-full">
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="text-neutral-400">
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
                className="mx-auto sm:w-20 sm:h-20"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No hay comidas registradas</h3>
              <p className="text-neutral-600 text-sm sm:text-base mb-4 sm:mb-6">
                Tus comidas registradas aparecerán aquí
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="w-full h-11 sm:h-12">
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-teal-600 mb-4 sm:mb-6"></div>
        <p className="text-neutral-600 text-sm sm:text-lg">Inicializando datos...</p>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
          {/* Mobile-optimized header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Mi Historial</h1>
            <p className="text-gray-600 text-sm sm:text-base">Revisa y gestiona tu registro alimentario</p>
          </div>

          {/* Cycle Info Alert - Mobile optimized */}
          {cycleSettingsLoaded && (
            <Alert className="mb-4 sm:mb-6 border-teal-200 bg-teal-50">
              <Calendar className="h-4 w-4 text-teal-600 flex-shrink-0" />
              <AlertDescription className="text-teal-800 text-xs sm:text-sm">
                <span className="font-medium">Ciclo actual:</span>
                <span className="ml-1 sm:ml-2">
                  Inicia cada {getDayOfWeekName(cycleStartDay)}, duración {cycleDuration} días
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Mobile-first controls */}
          <Card className="mb-4 sm:mb-6 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              {/* Mobile layout */}
              <div className="block sm:hidden space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === "cycles" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("cycles")}
                      className={`flex items-center text-xs px-2 py-1 h-8 ${
                        viewMode === "cycles"
                          ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                          : "text-orange-600 hover:bg-orange-50"
                      }`}
                    >
                      <LayoutGrid className="h-3 w-3 mr-1" />
                      Ciclos
                    </Button>
                    <Button
                      variant={viewMode === "days" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("days")}
                      className={`flex items-center text-xs px-2 py-1 h-8 ${
                        viewMode === "days"
                          ? "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      <List className="h-3 w-3 mr-1" />
                      Días
                    </Button>
                  </div>

                  <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="px-3 h-8 text-xs">
                        <Filter className="h-3 w-3 mr-1" />
                        Opciones
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto max-h-[80vh]">
                      <SheetHeader className="pb-4">
                        <SheetTitle>Opciones</SheetTitle>
                      </SheetHeader>
                      <div className="grid grid-cols-2 gap-3 pb-6">
                        <Button variant="outline" onClick={handleRefresh} className="h-12">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Actualizar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            router.push("/profile/settings")
                            setShowMobileFilters(false)
                          }}
                          className="h-12"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                        {storageType === "local" && user && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              router.push("/migrate")
                              setShowMobileFilters(false)
                            }}
                            className="h-12 text-teal-600 border-teal-600 hover:bg-teal-50"
                          >
                            <Database className="h-4 w-4 mr-2" />
                            Migrar
                          </Button>
                        )}
                        <div className="col-span-1">
                          <ShareDropdown meals={safeMeals} />
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:flex flex-wrap gap-3 items-center">
                <Button variant="outline" size="sm" onClick={handleRefresh} className="flex-shrink-0">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
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
                    Ciclos
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
                    Días
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/profile/settings")}
                  className="flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
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
                      Migrar
                    </Button>
                  )}
                  <ShareDropdown meals={safeMeals} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Section - Mobile optimized spacing */}
          <div className="space-y-3 sm:space-y-4">
            {viewMode === "days"
              ? safeGroupedMeals.map((group) => (
                  <DaySection
                    key={group.date}
                    date={group.date}
                    displayDate={group.displayDate}
                    meals={Array.isArray(group.meals) ? group.meals : []}
                    onDeleteMeal={handleDeleteClick}
                    onEditMeal={handleEditClick}
                    onExpand={handleSectionExpand}
                    isExpanded={expandedSection === group.date}
                  />
                ))
              : safeCycleGroups.map((cycle) => (
                  <CycleSection
                    key={cycle.cycleNumber}
                    cycle={{
                      ...cycle,
                      days: Array.isArray(cycle.days) ? cycle.days : [],
                    }}
                    onDeleteMeal={handleDeleteClick}
                    onEditMeal={handleEditClick}
                    onExpand={handleCycleExpand}
                    isExpanded={expandedCycle === cycle.cycleNumber}
                  />
                ))}
          </div>

          {/* Empty State for View Mode */}
          {viewMode === "cycles" && safeCycleGroups.length === 0 && safeMeals.length > 0 && (
            <Card className="p-6 sm:p-8 text-center">
              <CardContent>
                <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No hay ciclos con comidas</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Tus comidas se agruparán por ciclos una vez que tengas registros
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Esta acción no se puede deshacer. Esto eliminará permanentemente esta comida de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto order-2 sm:order-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 order-1 sm:order-2"
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
