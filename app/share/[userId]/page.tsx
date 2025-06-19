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
import { Card, CardContent } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

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
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const userId = params.userId as string
  const cycleParam = searchParams.get("cycle")

  useEffect(() => {
    setMounted(true)

    if (cycleParam) {
      setSelectedCycle(cycleParam)
    }

    loadUserInfo()
    loadMeals()
  }, [userId, cycleParam])

  // Auto-refresh for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadMeals()
      setLastUpdated(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [userId])

  const loadUserInfo = async () => {
    try {
      console.log("Loading user info for userId:", userId)
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from("user_settings")
        .select("username, cycle_duration, cycle_start_day, sweet_dessert_limit")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error loading user settings:", error)
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
    }
  }

  const loadMeals = async () => {
    setLoading(true)
    try {
      console.log("Loading meals for userId:", userId)
      const supabase = getSupabaseClient()

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
        const grouped = groupMealsByDay(data as Meal[])
        setGroupedMeals(grouped)

        const cycles = groupMealsByCycle(data as Meal[], cycleSettings.cycleDuration, cycleSettings.cycleStartDay)
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
    router.push("/")
  }

  const handleSectionExpand = (date: string) => {
    setExpandedSection(date === expandedSection ? null : date)
  }

  const handleCycleExpand = (cycleNumber: number) => {
    setExpandedCycle(cycleNumber === expandedCycle ? null : cycleNumber)
  }

  const handleDeleteClick = () => {}
  const handleEditClick = () => {}

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

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-gray-500">Cargando contenido compartido...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
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
          <Card className="p-6 max-w-md">
            <CardContent>
              <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={handleBack}>
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const titleDateRange = getFormattedDateRange()

  return (
    <div className="flex flex-col h-screen bg-gray-50">
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
        <div className="w-full px-4 py-6 pb-40">
          {groupedMeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-gray-500">No hay comidas compartidas</p>
            </div>
          ) : (
            <>
              <Card className="bg-teal-500 text-white p-6 mb-6 text-center border-0">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{titleDateRange}</h1>
                <p className="text-teal-100">
                  {username ? `Compartido por ${username}` : "Este es un historial de las ingestas de Mily"}
                </p>
                <div className="mt-3 text-sm text-teal-100">
                  Última actualización: {format(lastUpdated, "HH:mm", { locale: es })}
                </div>
              </Card>

              {cycleSettings && (
                <Alert className="mb-6 border-teal-200 bg-teal-50">
                  <div className="flex items-center">
                    <span className="font-semibold text-teal-800">Configuración de ciclo:</span>
                    <span className="ml-2 text-teal-700">
                      Inicia cada {getDayOfWeekName(cycleSettings.cycleStartDay)}, duración{" "}
                      {cycleSettings.cycleDuration} días
                    </span>
                  </div>
                </Alert>
              )}

              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex-shrink-0">
                  <Button
                    variant={viewMode === "cycles" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("cycles")}
                    className={`flex items-center ${viewMode === "cycles" ? "bg-teal-500 text-white" : ""}`}
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
                    className={`flex items-center ${viewMode === "days" ? "bg-teal-500 text-white" : ""}`}
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

              {/* Content Section */}
              <div className="space-y-4">
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
      </ScrollArea>
    </div>
  )
}
