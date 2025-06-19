"use client"

import { useState, useEffect } from "react"
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

export default function MealHistory() {
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
  const [cycleDuration, setCycleDuration] = useState(7)
  const [cycleStartDay, setCycleStartDay] = useState(1)
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

  // Filter meals based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMeals(meals)
    } else {
      const filtered = meals.filter(
        (meal) =>
          meal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (meal.notes && meal.notes.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      setFilteredMeals(filtered)
    }
  }, [meals, searchQuery])

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

  if (storageType === "supabase" && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <Card className="p-8 max-w-md mx-auto w-full bg-white border border-gray-200">
          <CardContent className="space-y-6">
            <div className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
              <Database className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Inicia sesión</h3>
              <p className="text-gray-600 text-lg mb-6">Debes iniciar sesión para ver tu historial de comidas</p>
            </div>
            <Button
              variant="default"
              onClick={() => router.push("/login")}
              className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700 text-white"
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-6"></div>
        <p className="text-gray-600 text-lg">Cargando historial...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <Card className="p-8 max-w-md mx-auto w-full">
          <CardContent className="space-y-6">
            <div className="text-red-500">
              <AlertCircle className="h-20 w-20 mx-auto" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Error al cargar el historial</h3>
              <p className="text-gray-600 mb-6">{loadError}</p>
            </div>
            <Button variant="default" onClick={handleRefresh} className="w-full h-12">
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <Card className="p-8 max-w-md mx-auto w-full bg-white border border-gray-200">
          <CardContent className="space-y-6">
            <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">¡Comienza tu diario!</h3>
              <p className="text-gray-600 text-lg mb-6">
                Aún no has registrado ninguna comida. ¡Agrega tu primera comida para comenzar!
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="w-full h-12">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <Card className="bg-teal-500 text-white border-0">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold">Mi Historial</CardTitle>
                    <p className="text-teal-100 mt-1">Revisa y gestiona tu registro alimentario</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {safeFilteredMeals.length} comidas
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Search and Controls */}
          <Card className="mb-6 border border-gray-200">
            <CardContent className="p-4">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Buscar comidas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Mobile Controls */}
              <div className="block sm:hidden space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === "cycles" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("cycles")}
                      className={`flex items-center text-sm px-3 py-2 h-10 ${
                        viewMode === "cycles" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Ciclos
                    </Button>
                    <Button
                      variant={viewMode === "days" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("days")}
                      className={`flex items-center text-sm px-3 py-2 h-10 ${
                        viewMode === "days" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
                      }`}
                    >
                      <List className="h-4 w-4 mr-2" />
                      Días
                    </Button>
                  </div>

                  <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="px-4 h-10">
                        <Filter className="h-4 w-4 mr-2" />
                        Opciones
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
                      <SheetHeader className="pb-6">
                        <SheetTitle>Opciones</SheetTitle>
                      </SheetHeader>
                      <div className="grid grid-cols-2 gap-4 pb-8">
                        <Button variant="outline" onClick={handleRefresh} className="h-14">
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Actualizar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            router.push("/profile/settings")
                            setShowMobileFilters(false)
                          }}
                          className="h-14"
                        >
                          <Settings className="h-5 w-5 mr-2" />
                          Configurar
                        </Button>
                        {storageType === "local" && user && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              router.push("/migrate")
                              setShowMobileFilters(false)
                            }}
                            className="h-14 text-teal-600 border-teal-600 hover:bg-teal-50"
                          >
                            <Database className="h-5 w-5 mr-2" />
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
                    className={`flex items-center ${
                      viewMode === "cycles" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
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
                      viewMode === "days" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"
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

          {/* Cycle Info Alert */}
          {cycleSettingsLoaded && (
            <Alert className="mb-6 border-teal-200 bg-teal-50">
              <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <AlertDescription className="text-teal-800 font-medium">
                <span className="font-semibold">Ciclo actual:</span>
                <span className="ml-2">
                  Inicia cada {getDayOfWeekName(cycleStartDay)}, duración {cycleDuration} días
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Content Section */}
          <div className="space-y-4">
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
            <Card className="p-8 text-center mt-8">
              <CardContent>
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron resultados</h3>
                <p className="text-gray-600">No hay comidas que coincidan con "{searchQuery}"</p>
                <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
                  Limpiar búsqueda
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty State for View Mode */}
          {viewMode === "cycles" && safeCycleGroups.length === 0 && safeFilteredMeals.length > 0 && (
            <Card className="p-8 text-center mt-8">
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
        <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Esta acción no se puede deshacer. Esto eliminará permanentemente esta comida de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0">
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
