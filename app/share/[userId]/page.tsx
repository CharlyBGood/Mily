"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronDown, LayoutGrid, List } from "lucide-react"
import MilyLogo from "@/components/mily-logo"
import DaySection from "@/components/day-section"
import CycleSection from "@/components/cycle-section"
import { groupMealsByDay } from "@/lib/utils"
import { groupMealsByCycle, type CycleGroup, getDayOfWeekName } from "@/lib/cycle-utils"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { Meal, UserCycleSettings } from "@/lib/types"
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

export default function SharePage() {
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [cycleGroups, setCycleGroups] = useState<CycleGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [cycleSettings, setCycleSettings] = useState<UserCycleSettings>({
    cycleDuration: 7,
    cycleStartDay: 1,
    sweetDessertLimit: 3,
  })
  const [viewMode, setViewMode] = useState<"days" | "cycles">("cycles")
  const [selectedCycle, setSelectedCycle] = useState<string>("all")
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const userId = params.userId as string
  const cycleParam = searchParams.get("cycle")

  useEffect(() => {
    setMounted(true)

    // Set the selected cycle from URL parameter
    if (cycleParam) {
      setSelectedCycle(cycleParam)
    }

    loadUserInfo()
    loadMeals()
  }, [userId, cycleParam])

  const loadUserInfo = async () => {
    try {
      console.log("Loading user info for userId:", userId)
      const supabase = getSupabaseClient()

      // Get user's username and cycle settings
      const { data, error } = await supabase
        .from("user_settings")
        .select("username, cycle_duration, cycle_start_day, sweet_dessert_limit")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error loading user settings:", error)
        // Continue with default settings
      }

      if (data) {
        console.log("User settings loaded:", data)
        setUsername(data.username || null)
        setCycleSettings({
          cycleDuration: data.cycle_duration || 7,
          cycleStartDay: data.cycle_start_day || 1,
          sweetDessertLimit: data.sweet_dessert_limit || 3,
        })
      }
    } catch (error) {
      console.error("Error in loadUserInfo:", error)
      // Continue with default settings
    }
  }

  const loadMeals = async () => {
    setLoading(true)
    try {
      console.log("Loading meals for userId:", userId)
      const supabase = getSupabaseClient()

      // Directly fetch meals for the specified user
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
        // Group meals by day
        const grouped = groupMealsByDay(data as Meal[])
        setGroupedMeals(grouped)

        // Group meals by cycle using user's cycle settings
        const cycles = groupMealsByCycle(data as Meal[], cycleSettings.cycleDuration, cycleSettings.cycleStartDay)
        setCycleGroups(cycles)

        // If a specific cycle is selected in the URL, filter the data
        if (cycleParam && cycleParam !== "all") {
          // No need to auto-expand any section initially
        }
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
    router.push("/")
  }

  const handleSectionExpand = (date: string) => {
    setExpandedSection(date === expandedSection ? null : date)
  }

  const handleCycleExpand = (cycleNumber: number) => {
    setExpandedCycle(cycleNumber === expandedCycle ? null : cycleNumber)
  }

  // Empty functions since we don't need these functionalities in share view
  const handleDeleteClick = () => {}
  const handleEditClick = () => {}

  // Filter cycles based on selection
  const filteredCycleGroups =
    selectedCycle === "all"
      ? cycleGroups
      : selectedCycle === "current"
        ? cycleGroups.length > 0
          ? [cycleGroups[0]] // First cycle is the current one
          : []
        : cycleGroups.filter((cycle) => cycle.cycleNumber.toString() === selectedCycle)

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando contenido compartido...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <MilyLogo />
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Get date range for title
  let titleDateRange = "Historial de comidas compartido"
  if (cycleGroups.length > 0) {
    if (selectedCycle !== "all") {
      if (selectedCycle === "current" && cycleGroups.length > 0) {
        titleDateRange = `Ciclo actual: ${cycleGroups[0].displayDateRange.split(": ")[1]}`
      } else {
        const selectedCycleGroup = cycleGroups.find((c) => c.cycleNumber.toString() === selectedCycle)
        if (selectedCycleGroup) {
          titleDateRange = `${selectedCycleGroup.displayDateRange}`
        }
      }
    } else {
      // Get overall date range
      const firstCycle = [...cycleGroups].sort((a, b) => a.cycleNumber - b.cycleNumber)[0]
      const lastCycle = [...cycleGroups].sort((a, b) => b.cycleNumber - a.cycleNumber)[0]

      if (firstCycle && lastCycle) {
        const startDate = new Date(firstCycle.startDate).toLocaleDateString("es-ES", { day: "numeric", month: "long" })
        const endDate = new Date(lastCycle.endDate).toLocaleDateString("es-ES", { day: "numeric", month: "long" })
        titleDateRange = `Historial del ${startDate} al ${endDate}`
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center">
          <MilyLogo />
        </div>
        <div className="w-10"></div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 pb-40 max-w-full overflow-x-hidden">
          {groupedMeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-neutral-500">No hay comidas compartidas</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm mb-6 text-center">
                <h1 className="text-xl font-bold mb-2">{titleDateRange}</h1>
                <p className="text-neutral-500">
                  {username ? `Compartido por ${username}` : "Este es un historial de las ingestas de Mily"}
                </p>
              </div>

              {cycleSettings && (
                <Alert className="mb-4">
                  <div className="flex items-center">
                    <span className="font-medium">Configuración de ciclo:</span>
                    <span className="ml-2">
                      Inicia cada {getDayOfWeekName(cycleSettings.cycleStartDay)}, duración{" "}
                      {cycleSettings.cycleDuration} días
                    </span>
                  </div>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex-shrink-0">
                  <Button
                    variant={viewMode === "cycles" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("cycles")}
                    className="flex items-center"
                    aria-label="Ver por ciclos"
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
                    className="flex items-center"
                    aria-label="Ver por días"
                  >
                    <List className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Días</span>
                  </Button>
                </div>

                {viewMode === "cycles" && cycleGroups.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-shrink-0">
                        {selectedCycle === "all"
                          ? "Todos los ciclos"
                          : selectedCycle === "current"
                            ? "Ciclo actual"
                            : `Ciclo ${selectedCycle}`}
                        <ChevronDown className="ml-2 h-4 w-4" />
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

              {viewMode === "days"
                ? // Display by days
                  groupedMeals.map((group) => (
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
                    />
                  ))
                : // Display by cycles
                  filteredCycleGroups.map((cycle) => (
                    <CycleSection
                      key={cycle.cycleNumber}
                      cycle={cycle}
                      onDeleteMeal={handleDeleteClick}
                      onEditMeal={handleEditClick}
                      onExpand={handleCycleExpand}
                      isExpanded={expandedCycle === cycle.cycleNumber}
                      showEditButton={false}
                      showDeleteButton={false}
                    />
                  ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
