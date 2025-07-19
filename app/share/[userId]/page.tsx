"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List } from "lucide-react"
import DaySection from "@/components/day-section"
import CycleSection from "@/components/cycle-section"
import { groupMealsByDay } from "@/lib/utils"
import { groupMealsByCycle, type CycleGroup, getDayOfWeekName } from "@/lib/cycle-utils"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { Meal } from "@/lib/types"
import { Alert } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import HeaderBar from "@/components/header-bar"

export default function SharePage() {
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [cycleGroups, setCycleGroups] = useState<CycleGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"days" | "cycles">("cycles")
  const [selectedCycle, setSelectedCycle] = useState<string>("all")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  // Estado local para los settings del usuario compartido
  const [cycleStartDayShared, setCycleStartDayShared] = useState<number>(1)
  const [cycleDurationShared, setCycleDurationShared] = useState<number>(7)

  useEffect(() => {
    setMounted(true)

    loadMeals()
  }, [userId])

  // Auto-refresh for real-time updates
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let lastHidden: number | null = null

    const refreshMeals = () => {
      if ((window as any).__milyDialogOpen) return
      if (document.visibilityState === "visible") {
        // Only refresh if tab was hidden for more than 30 seconds
        if (lastHidden && Date.now() - lastHidden > 30000) {
          loadMeals()
          setLastUpdated(new Date())
        }
        lastHidden = null
      } else if (document.visibilityState === "hidden") {
        lastHidden = Date.now()
      }
    }

    interval = setInterval(() => {
      if ((window as any).__milyDialogOpen) return
      if (document.visibilityState === "visible") {
        loadMeals()
        setLastUpdated(new Date())
      }
    }, 60000) // 1 min interval

    document.addEventListener("visibilitychange", refreshMeals)
    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener("visibilitychange", refreshMeals)
    }
  }, [userId])

  const loadMeals = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        console.error("Supabase client is not initialized")
        setLoading(false)
        return
      }
      // 1. Obtener settings del usuario compartido
      const { data: settingsData, error: settingsError } = await supabase
        .from("user_settings")
        .select("cycle_start_day, cycle_duration, username") // <-- Agregamos username
        .eq("user_id", userId)
        .single();
      if (settingsError) {
        console.error("Error loading shared user settings:", settingsError)
      }
      setCycleStartDayShared(settingsData?.cycle_start_day ?? 1)
      setCycleDurationShared(settingsData?.cycle_duration ?? 7)
      setUsername(settingsData?.username ?? null) // <-- Guardamos el nombre
      // 2. Obtener comidas
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading meals:", error)
        throw new Error("Error loading shared content")
      }

      if (data && data.length > 0) {
        const meals = data as unknown as Meal[]
        const grouped = groupMealsByDay(meals)
        setGroupedMeals(grouped)
        // 3. Usar settings del usuario compartido para agrupar ciclos
        const cycles = groupMealsByCycle(meals, cycleDurationShared, cycleStartDayShared)
        setCycleGroups(cycles)
      } else {
        setGroupedMeals([])
        setCycleGroups([])
        setError("No hay comidas compartidas")
      }
    } catch (error) {
      console.error("Error loading meals:", error)
      setError(error instanceof Error ? error.message : "Error loading shared content")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back()
    } else {
      // Si no hay historial previo, vuelve a la página de compartidos principal
      router.push(`/share/${userId}`)
    }
  }

  const handleSectionExpand = (date: string) => {
    setExpandedSection(date === expandedSection ? null : date)
  }

  const handleCycleExpand = (cycleNumber: number) => {
    setExpandedCycle(cycleNumber === expandedCycle ? null : cycleNumber)
  }

  const handleDeleteClick = () => { }
  const handleEditClick = () => { }

  const filteredCycleGroups =
    selectedCycle === "all"
      ? cycleGroups
      : selectedCycle === "current"
        ? cycleGroups.length > 0
          ? [cycleGroups[0]]
          : []
        : cycleGroups.filter((cycle) => cycle.cycleNumber.toString() === selectedCycle)

  const getFormattedDateRange = () => {
    // CAMBIO: Mostrar siempre 'Historial de Mily' como título principal
    return "Historial de Mily"
  }

  // Patch: Listen for dialog open/close events globally
  useEffect(() => {
    const handleDialogOpen = (e: Event) => {
      (window as any).__milyDialogOpen = true
    }
    const handleDialogClose = (e: Event) => {
      (window as any).__milyDialogOpen = false
    }
    window.addEventListener("mily-dialog-open", handleDialogOpen)
    window.addEventListener("mily-dialog-close", handleDialogClose)
    return () => {
      window.removeEventListener("mily-dialog-open", handleDialogOpen)
      window.removeEventListener("mily-dialog-close", handleDialogClose)
    }
  }, [])

  // Suscribirse a cambios en los settings del usuario compartido
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) return;

    const channel = supabase
      .channel('shared-user-settings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          loadMeals();
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-gray-500">Cargando contenido compartido...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <HeaderBar backHref="/" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 max-w-md">
            <CardContent>
              <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={handleBack}>
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const titleDateRange = getFormattedDateRange()

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar backHref="/" />
      <main className="flex-1">
        <div className="w-full px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
          {/* Copiado del historial principal: Card de controles, paddings, y layout */}
          <Card className="mb-4 sm:mb-6 border border-gray-200">
            <CardContent className="p-3 sm:p-4">
              <div className="block sm:hidden space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === "cycles" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("cycles")}
                      className={`flex items-center text-xs px-2 py-1.5 h-8 ${viewMode === "cycles" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"}`}
                    >
                      <LayoutGrid className="h-3 w-3 mr-1" />
                      Ciclos
                    </Button>
                    <Button
                      variant={viewMode === "days" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("days")}
                      className={`flex items-center text-xs px-2 py-1.5 h-8 ${viewMode === "days" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"}`}
                    >
                      <List className="h-3 w-3 mr-1" />
                      Días
                    </Button>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex flex-wrap gap-3 items-center">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "cycles" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cycles")}
                    className={`flex items-center ${viewMode === "cycles" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"}`}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Ciclos
                  </Button>
                  <Button
                    variant={viewMode === "days" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("days")}
                    className={`flex items-center ${viewMode === "days" ? "bg-teal-500 text-white" : "text-gray-600 hover:text-teal-600"}`}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Días
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Card de título y usuario compartido */}
          <Card className="bg-teal-500 text-white p-3 sm:p-6 mb-4 sm:mb-6 text-center border-0 rounded-lg">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">{titleDateRange}</h1>
            <p className="text-teal-100 text-sm sm:text-base">
              {username ? `Compartido por ${username}` : "Este es un historial de las ingestas de Mily"}
            </p>
            <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-teal-100">
              Última actualización: {format(lastUpdated, "HH:mm", { locale: es })}
            </div>
          </Card>
          <Alert className="mb-3 sm:mb-6 border-teal-200 bg-teal-50 rounded-lg">
            <div className="flex items-center text-sm sm:text-base">
              <span className="font-semibold text-teal-800">Configuración de ciclo:</span>
              <span className="ml-2 text-teal-700">
                Inicia cada {getDayOfWeekName(cycleStartDayShared)}, duración {cycleDurationShared} días
              </span>
            </div>
          </Alert>
          {/* Content Section */}
          <div className="space-y-3 sm:space-y-4">
            {viewMode === "days"
              ? groupedMeals.map((group) => (
                <DaySection
                  key={group.date}
                  date={group.date}
                  displayDate={group.displayDate}
                  meals={group.meals}
                  onDeleteMeal={handleDeleteClick}
                  onEditMeal={handleEditClick}
                  onExpand={handleSectionExpand}
                  isExpanded={expandedSection === group.date}
                  showEditButton={false}
                  showDeleteButton={false}
                  isSharedView={true}
                />
              ))
              : filteredCycleGroups.map((cycle) => (
                <CycleSection
                  key={cycle.cycleNumber}
                  cycle={cycle}
                  onDeleteMeal={handleDeleteClick}
                  onEditMeal={handleEditClick}
                  onExpand={handleCycleExpand}
                  isExpanded={expandedCycle === cycle.cycleNumber}
                  showEditButton={false}
                  showDeleteButton={false}
                  isSharedView={true}
                />
              ))}
          </div>
        </div>
      </main>
    </div>
  )
}
