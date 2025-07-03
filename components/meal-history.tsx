"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, LayoutGrid, List, Calendar, AlertCircle, Settings, Filter, Search } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import ShareDropdown from "./share-dropdown"
import { useCycleSettings } from "@/lib/cycle-settings-context"

export default function MealHistory() {
  const { cycleStartDay, cycleDuration, setCycleDuration, setCycleStartDay, loaded } = useCycleSettings()
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [cycleGroups, setCycleGroups] = useState<CycleGroup[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [viewMode, setViewMode] = useState<"days" | "cycles">("cycles")
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { getUserMeals, deleteMeal, storageType } = useStorage()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cycleSettingsLoaded, setCycleSettingsLoaded] = useState(false)
  const [dataInitialized, setDataInitialized] = useState(false)
  const isLoadingMeals = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Efecto principal: carga cuando cambia user, storageType, settings o al montar
  useEffect(() => {
    if (!mounted) return
    if (!user && storageType === "supabase") return
    if (isLoadingMeals.current) return
    isLoadingMeals.current = true
    loadMeals().finally(() => {
      isLoadingMeals.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, storageType, cycleStartDay, cycleDuration, mounted])

  // Listeners globales: recarga solo si la pestaña está visible
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === "cycleSettingsUpdated" && document.visibilityState === "visible") {
        loadMeals()
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadMeals()
      }
    }
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.type === "cycleSettingsUpdated" && document.visibilityState === "visible") {
        loadMeals()
      }
    }
    window.addEventListener("storage", handleStorageChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("message", handleMessage)
    }
  }, [])

  useEffect(() => {
    if (cycleSettingsLoaded && filteredMeals && Array.isArray(filteredMeals) && filteredMeals.length > 0) {
      try {
        const cycles = groupMealsByCycle(filteredMeals, cycleDuration, cycleStartDay)
        setCycleGroups(Array.isArray(cycles) ? cycles : [])

        const grouped = groupMealsByDay(filteredMeals)
        setGroupedMeals(Array.isArray(grouped) ? grouped : [])
      } catch (error) {
        console.error("Error grouping meals:", error)
        setCycleGroups([])
        setGroupedMeals([])
      }
    }
  }, [cycleDuration, cycleStartDay, cycleSettingsLoaded, filteredMeals])

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
          // Do not setCycleDuration or setCycleStartDay here!
          await getUserCycleSettings(user.id) // Just to ensure settings are loaded/cached if needed
          setCycleSettingsLoaded(true)
        } catch (error) {
          console.error("Error loading cycle settings:", error)
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
      setFilteredMeals(mealsArray)

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

  // Ref: Recarga ciclos si settings cambian en otra pestaña o tras guardar settings
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === "cycleSettingsUpdated") {
        loadMeals()
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadMeals()
      }
    }
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.type === "cycleSettingsUpdated") {
        loadMeals()
      }
    }
    window.addEventListener("storage", handleStorageChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("message", handleMessage)
    }
  }, [])

  // Helper para el parámetro 'from'
  const getCurrentPathWithQuery = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname + window.location.search;
    }
    return "/history";
  };

  if (editingMeal) {
    return <MealEditor meal={editingMeal} onCancel={handleEditCancel} onSaved={handleEditSaved} />
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-6"></div>
        <p className="text-gray-600 text-lg">Cargando historial...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando...</p>
      </div>
    )
  }

  if (storageType === "supabase" && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <Card className="p-6 max-w-sm mx-auto w-full bg-white border border-gray-200">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
              <Database className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Inicia sesión</h3>
              <p className="text-gray-600 mb-4">Debes iniciar sesión para ver tu historial de comidas</p>
            </div>
            <Button
              variant="default"
              onClick={() => router.push("/login")}
              className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white"
            >
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <Card className="p-6 max-w-sm mx-auto w-full">
          <CardContent className="space-y-4">
            <div className="text-red-500">
              <AlertCircle className="h-16 w-16 mx-auto" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Error al cargar el historial</h3>
              <p className="text-gray-600 mb-4">{loadError}</p>
            </div>
            <Button variant="default" onClick={handleRefresh} className="w-full h-10">
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
  const safeFilteredMeals = Array.isArray(filteredMeals) ? filteredMeals : []
  const safeGroupedMeals = Array.isArray(groupedMeals) ? groupedMeals : []
  const safeCycleGroups = Array.isArray(cycleGroups) ? cycleGroups : []

  if (safeMeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <Card className="p-6 max-w-sm mx-auto w-full bg-white border border-gray-200">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">¡Comienza tu diario!</h3>
              <p className="text-gray-600 mb-4">
                Aún no has registrado ninguna comida. ¡Agrega tu primera comida para comenzar!
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="w-full h-10">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Se eliminó el header con título y botón de settings para restaurar el diseño original */}
      <main className="flex-1">
        <div className="min-h-screen bg-gray-50">
          {/* Fixed container with proper mobile padding */}
          <div className="w-full px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
            {/* Header eliminado, el historial aparece directamente */}

            {/* Search and Controls */}
            <Card className="mb-4 sm:mb-6 border border-gray-200">
              <CardContent className="p-3 sm:p-4">
                {/* Mobile Controls */}
                <div className="block sm:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={viewMode === "cycles" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("cycles")}
                        className={`flex items-center text-xs px-2 py-1.5 h-8 ${viewMode === "cycles" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
                          }`}
                      >
                        <LayoutGrid className="h-3 w-3 mr-1" />
                        Ciclos
                      </Button>
                      <Button
                        variant={viewMode === "days" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("days")}
                        className={`flex items-center text-xs px-2 py-1.5 h-8 ${viewMode === "days" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
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
                      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
                        <SheetHeader className="pb-4">
                          <SheetTitle>Opciones</SheetTitle>
                        </SheetHeader>
                        <div className="grid grid-cols-2 gap-3 pb-6">
                          <Button variant="outline" onClick={handleRefresh} className="h-12 text-sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualizar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const from = getCurrentPathWithQuery();
                              router.push(`/profile/settings?from=${encodeURIComponent(from)}`);
                              setShowMobileFilters(false);
                            }}
                            className="h-12 text-sm"
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
                              className="h-12 text-teal-600 border-teal-600 hover:bg-teal-50 text-sm"
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

                {/* Desktop Controls */}
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
                      className={`flex items-center ${viewMode === "cycles" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
                        }`}
                    >
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Ciclos
                    </Button>
                    <Button
                      variant={viewMode === "days" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("days")}
                      className={`flex items-center ${viewMode === "days" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
                        }`}
                    >
                      <List className="h-4 w-4 mr-2" />
                      Días
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const from = getCurrentPathWithQuery();
                      router.push(`/profile/settings?from=${encodeURIComponent(from)}`);
                    }}
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

            {/* Cycle Info Alert */}
            {loaded && cycleSettingsLoaded && (
              <>
                {console.log(
                  `[MealHistory] Renderizando ciclo: Inicia cada ${getDayOfWeekName(cycleStartDay)}, duración ${cycleDuration} días (cycleStartDay=${cycleStartDay}, cycleDuration=${cycleDuration})`
                )}
                <Alert className="mb-4 sm:mb-6 border-teal-200 bg-teal-50">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 flex-shrink-0" />
                  <AlertDescription className="text-teal-800 font-medium text-sm sm:text-base">
                    <span className="font-semibold">Ciclo actual:</span>
                    <span className="ml-2">
                      Inicia cada {getDayOfWeekName(cycleStartDay)}, duración {cycleDuration} días
                    </span>
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Content Section */}
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

            {/* Empty Search Results */}
            {searchQuery && safeFilteredMeals.length === 0 && safeMeals.length > 0 && (
              <Card className="p-6 sm:p-8 text-center mt-6 sm:mt-8">
                <CardContent>
                  <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No se encontraron resultados</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                    No hay comidas que coincidan con "{searchQuery}"
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery("")} className="text-sm sm:text-base">
                    Limpiar búsqueda
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Empty State for View Mode */}
            {viewMode === "cycles" && safeCycleGroups.length === 0 && safeFilteredMeals.length > 0 && (
              <Card className="p-6 sm:p-8 text-center mt-6 sm:mt-8">
                <CardContent>
                  <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No hay ciclos con comidas</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Tus comidas se agruparán por ciclos una vez que tengas registros
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Esta acción no se puede deshacer. Esto eliminará permanentemente esta comida de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto order-2 sm:order-1 text-sm sm:text-base">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 order-1 sm:order-2 text-sm sm:text-base"
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
    </div>
  )
}
