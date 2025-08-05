"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, LayoutGrid, List, Calendar, AlertCircle, Settings, Filter, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Meal } from "@/lib/types"
import { groupMealsByDay } from "@/lib/utils"
import { groupMealsByCycle, getDayOfWeekName } from "@/lib/cycle-utils"
import DaySection from "./day-section"
import CycleSection from "./cycle-section"
import MealEditor from "./meal-editor"
import { useAuth } from "@/lib/auth-context"
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
import { useCycleSettings } from "@/lib/cycle-settings-context"
import { useMealContext } from "@/lib/meal-context"

export default function MealHistory() {
  const { cycleStartDay, cycleDuration, loaded, reloadSettings, version } = useCycleSettings();
  const { meals, loading: mealsLoading, error, refresh, removeMeal } = useMealContext();
  const [viewMode, setViewMode] = useState<"days" | "cycles">("cycles");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editingCycleRange, setEditingCycleRange] = useState<{ start: string; end: string } | null>(null);

  // LOG: Render principal

  useEffect(() => {
    setMounted(true);
  }, []);

  // LOG: Cambios en settings de ciclo
  useEffect(() => {
    console.log("[MealHistory] Cambiaron settings de ciclo", {
      cycleStartDay,
      cycleDuration,
      loaded,
      version
    });
  }, [cycleStartDay, cycleDuration, loaded, version]);

  // LOG: Cambios en usuario
  useEffect(() => {
    console.log("[MealHistory] Cambió usuario", user);
  }, [user]);

  useEffect(() => {
    console.log('[MealHistory] meals changed', {
      mealsCount: Array.isArray(meals) ? meals.length : 'N/A',
      time: new Date().toISOString(),
    });
  }, [meals]);

  // Agrupación reactiva
  const safeMeals = Array.isArray(meals) ? meals : [];
  // Forzar reagrupar cuando version cambia
  const groupedMeals = groupMealsByDay(safeMeals);
  const cycleGroups = groupMealsByCycle(safeMeals, cycleDuration, cycleStartDay);

  // Handlers
  const handleDeleteMeal = async (meal: Meal) => {
    if (!meal.id) return;
    try {
      await removeMeal(meal.id);
      toast({
        title: "Comida eliminada",
        description: "La comida ha sido eliminada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar la comida",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    console.log('[MealHistory] handleRefresh called', { time: new Date().toISOString() });
    refresh();
  };

  const handleDeleteClick = (meal: Meal) => {
    if (meal && meal.id) {
      setSelectedMeal(meal);
      setShowDeleteDialog(true);
    }
  };

  const handleEditClick = (meal: Meal) => {
    setEditingMeal(meal);
  };

  const handleEditCancel = () => {
    setEditingMeal(null);
  };

  const handleEditSaved = () => {
    setEditingMeal(null);
    refresh();
  };

  const handleSectionExpand = (date: string) => {
    if (!date || date === expandedSection) {
      setExpandedSection(null);
    } else {
      setExpandedSection(date);
    }
  };

  const handleCycleExpand = (cycleNumber: number) => {
    if (cycleNumber === expandedCycle) {
      setExpandedCycle(null);
    } else {
      setExpandedCycle(cycleNumber);
    }
  };

  // Recarga settings si viene de settings (query param)
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("settingsUpdated") === "1") {
      reloadSettings();
      // Limpia el query param para evitar loops
      const params = new URLSearchParams(window.location.search);
      params.delete("settingsUpdated");
      router.replace(window.location.pathname + (params.toString() ? `?${params}` : ""));
    }
  }, [reloadSettings, router]);

  // Sincronización de settings entre rutas internas (SPA)
  useEffect(() => {
    const handleSettingsUpdate = () => {
      console.log('[MealHistory] Recibido evento cycleSettingsUpdatedInternal, recargando settings');
      if (typeof reloadSettings === 'function') reloadSettings();
    };
    window.addEventListener('cycleSettingsUpdatedInternal', handleSettingsUpdate);
    return () => {
      window.removeEventListener('cycleSettingsUpdatedInternal', handleSettingsUpdate);
    };
  }, [reloadSettings]);

  // Renderizado
  if (editingMeal) {
    return <MealEditor meal={editingMeal} onCancel={() => { setEditingMeal(null); setEditingCycleRange(null); }} onSaved={handleEditSaved} cycleRange={editingCycleRange ?? undefined} />
  }
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-6"></div>
        <p className="text-gray-600 text-lg">Cargando historial...</p>
      </div>
    )
  }
  if (mealsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando...</p>
      </div>
    )
  }
  if (!user) {
    console.log('[MealHistory] No user detected, showing login', { time: new Date().toISOString() });
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
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <Card className="p-6 max-w-sm mx-auto w-full">
          <CardContent className="space-y-4">
            <div className="text-red-500">
              <AlertCircle className="h-16 w-16 mx-auto" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Error al cargar el historial</h3>
              <p className="text-gray-600 mb-4">
                {typeof error === "string"
                  ? error
                  : error && typeof error === "object" && "message" in error
                    ? (error as { message?: string }).message
                    : "Ocurrió un error desconocido"}
              </p>
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
      <main className="flex-1">
        <div className="min-h-screen bg-gray-50">
          <div className="w-full px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
            {/* Search and Controls */}
            <Card className="mb-4 sm:mb-6 border border-gray-200">
              <CardContent className="p-3 sm:p-4">
                {/* Mobile Controls */}
                <div className="block sm:hidden space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" size="icon" onClick={handleRefresh} className="flex-shrink-0" aria-label="Actualizar">
                      <RefreshCw className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => router.push(`/profile/settings`)} className="flex-shrink-0" aria-label="Configurar">
                      <Settings className="h-5 w-5" />
                    </Button>
                    <ShareDropdown meals={safeMeals} />
                  </div>
                  <div className="flex bg-gray-100 rounded-lg p-1 mt-2">
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
                      router.push(`/profile/settings`);
                    }}
                    className="flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>

                  <div className="flex-grow"></div>

                  <div className="flex space-x-2">
                    <ShareDropdown meals={safeMeals} />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Cycle Info Alert */}
            {loaded && (
              <>
                <Alert className="mb-4 sm:mb-6 border-teal-200 bg-teal-50">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 flex-shrink-0" />
                  <AlertDescription className="text-teal-800 font-medium text-sm sm:text-base">
                    <span className="font-semibold">Ciclo actual:</span>
                    <span className="ml-2">
                      Inicia cada {getDayOfWeekName(Number(cycleStartDay))}, duración {cycleDuration} días
                    </span>
                  </AlertDescription>
                </Alert>
              </>
            )}
            {/* Content Section */}
            <div className="space-y-3 sm:space-y-4">
              {viewMode === "days"
                ? groupedMeals.map((group) => (
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
                : [...cycleGroups].reverse().map((cycle) => (
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
                    // Agregar icono + para agregar registro
                    addButton={
                      <>
                        {/* Mobile: solo icono */}
                        <Plus
                          className="w-7 h-7 text-teal-600 cursor-pointer sm:hidden ml-2 drop-shadow"
                          aria-label="Agregar registro"
                          onClick={() => {
                            setEditingMeal({
                              id: undefined,
                              user_id: undefined,
                              description: "",
                              meal_type: "" as Meal["meal_type"],
                              notes: "",
                              photo_url: undefined,
                              created_at: cycle.startDate,
                              updated_at: undefined,
                            });
                            setEditingCycleRange({ start: cycle.startDate, end: cycle.endDate });
                          }}
                        />
                        {/* Desktop: botón con icono y texto */}
                        <Button
                          variant="default"
                          size="sm"
                          className="ml-2 hidden sm:flex items-center bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
                          onClick={() => {
                            setEditingMeal({
                              id: undefined,
                              user_id: undefined,
                              description: "",
                              meal_type: "" as Meal["meal_type"],
                              notes: "",
                              photo_url: undefined,
                              created_at: cycle.startDate,
                              updated_at: undefined,
                            });
                            setEditingCycleRange({ start: cycle.startDate, end: cycle.endDate });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar registro
                        </Button>
                      </>
                    }
                    onAddMeal={undefined}
                  />
                ))}
            </div>
            {/* Empty State for View Mode */}
            {viewMode === "cycles" && cycleGroups.length === 0 && safeMeals.length > 0 && (
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
                  handleDeleteMeal(selectedMeal);
                }
                setShowDeleteDialog(false);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
