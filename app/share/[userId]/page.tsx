"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronDown, LayoutGrid, List } from "lucide-react"
import MilyLogo from "@/components/mily-logo"
import DaySection from "@/components/day-section"
import CycleSection from "@/components/cycle-section"
import { groupMealsByDay } from "@/lib/utils"
import { groupMealsByCycle, type CycleGroup, getDayOfWeekName } from "@/lib/cycle-utils"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { Meal } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { useCycleSettings } from "@/lib/cycle-settings-context"

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

  // Get cycle settings from context
  const { cycleStartDay, cycleDuration, sweetDessertLimit, loaded: cycleSettingsLoaded } = useCycleSettings()

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
      console.log("Loading meals for userId:", userId)
      const supabase = getSupabaseClient()
      if (!supabase) {
        console.error("Supabase client is not initialized")
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading meals:", error)
        throw new Error("Error loading shared content")
      }

      console.log(`Loaded ${data?.length || 0} meals`)

      if (data && data.length > 0) {
        const meals = data as unknown as Meal[]
        const grouped = groupMealsByDay(meals)
        setGroupedMeals(grouped)

        const cycles = groupMealsByCycle(meals, cycleDuration, cycleStartDay)
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
    if (cycleGroups.length === 0) return "Historial de comidas compartido"

    if (selectedCycle !== "all") {
      if (selectedCycle === "current" && cycleGroups.length > 0) {
        return `Ciclo actual: ${cycleGroups[0].displayDateRange.split(": ")[1]}`
      } else {
        const selectedCycleGroup = cycleGroups.find((c) => c.cycleNumber.toString() === selectedCycle)
        if (selectedCycleGroup) {
          return selectedCycleGroup.displayDateRange
        }
      }
    } else {
      const firstCycle = [...cycleGroups].sort((a, b) => a.cycleNumber - b.cycleNumber)[0]
      const lastCycle = [...cycleGroups].sort((a, b) => b.cycleNumber - a.cycleNumber)[0]

      if (firstCycle && lastCycle) {
        try {
          const startDate = parseISO(firstCycle.startDate)
          const endDate = parseISO(lastCycle.endDate)
          const startFormatted = format(startDate, "d 'de' MMMM", { locale: es })
          const endFormatted = format(endDate, "d 'de' MMMM 'de' yyyy", { locale: es })
          return `Historial del ${startFormatted} al ${endFormatted}`
        } catch (error) {
          console.error("Error formatting date range:", error)
          return "Historial de comidas compartido"
        }
      }
    }

    return "Historial de comidas compartido"
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

  if (!mounted || loading || !cycleSettingsLoaded) {
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
        <header className="p-3 sm:p-4 border-b bg-white flex items-center w-full">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2" aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center items-center min-w-0">
            <div className="w-full max-w-[120px] sm:max-w-[160px] flex items-center justify-center">
              <MilyLogo className="w-full h-auto object-contain" />
            </div>
          </div>
          <div className="w-10 flex-shrink-0"></div>
        </header>
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
      <header className="p-3 sm:p-4 border-b bg-white flex items-center w-full">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center items-center min-w-0">
          <div className="w-full max-w-[120px] sm:max-w-[160px] flex items-center justify-center">
            <MilyLogo className="w-full h-auto object-contain" />
          </div>
        </div>
        <div className="w-10 flex-shrink-0"></div>
      </header>
      <main className="flex-1">
        <div className="min-h-screen bg-gray-50">
          <div className="w-full px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
            {groupedMeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-gray-500">No hay comidas compartidas</p>
              </div>
            ) : (
              <>
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
                      Inicia cada {getDayOfWeekName(cycleStartDay)}, duración {cycleDuration} días
                    </span>
                  </div>
                </Alert>

                <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-6">
                  <div className="flex-shrink-0">
                    <Button
                      variant={viewMode === "cycles" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("cycles")}
                      className={`flex items-center text-xs sm:text-sm ${viewMode === "cycles" ? "bg-teal-500 text-white" : ""}`}
                      aria-label="Ver por ciclos"
                    >
                      <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Ciclos</span>
                      <span className="sm:hidden">C</span>
                    </Button>
                  </div>

                  <div className="flex-shrink-0">
                    <Button
                      variant={viewMode === "days" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("days")}
                      className={`flex items-center text-xs sm:text-sm ${viewMode === "days" ? "bg-teal-500 text-white" : ""}`}
                      aria-label="Ver por días"
                    >
                      <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Días</span>
                      <span className="sm:hidden">D</span>
                    </Button>
                  </div>

                  {viewMode === "cycles" && cycleGroups.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-shrink-0 text-xs sm:text-sm">
                          <span className="hidden sm:inline">
                            {selectedCycle === "all"
                              ? "Todos los ciclos"
                              : selectedCycle === "current"
                                ? "Ciclo actual"
                                : `Ciclo ${selectedCycle}`}
                          </span>
                          <span className="sm:hidden">
                            {selectedCycle === "all"
                              ? "Todos"
                              : selectedCycle === "current"
                                ? "Actual"
                                : `C${selectedCycle}`}
                          </span>
                          <ChevronDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Seleccionar ciclo</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={selectedCycle} onValueChange={setSelectedCycle}>
                          <DropdownMenuRadioItem value="all">Todos los ciclos</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="current">Ciclo actual</DropdownMenuRadioItem>
                          {cycleGroups.map((cycle) => (
                            <DropdownMenuRadioItem key={cycle.cycleNumber} value={cycle.cycleNumber.toString()}>
                              Ciclo {cycle.cycleNumber}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Content Section */}
                <div className="space-y-2 sm:space-y-4">
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
