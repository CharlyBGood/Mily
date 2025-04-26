"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import MilyLogo from "@/components/mily-logo"
import DaySection from "@/components/day-section"
import { groupMealsByDay } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getSharedMeals } from "@/lib/share-service"
import type { Meal } from "@/lib/types"

export default function SharePage() {
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const shortId = params.shortId as string

  useEffect(() => {
    setMounted(true)
    loadMeals()
  }, [shortId])

  const loadMeals = async () => {
    setLoading(true)
    try {
      // Use the optimized function to get shared meals
      const { success, data, error } = await getSharedMeals(shortId)

      if (!success || error) {
        throw new Error(error?.message || "Error loading shared content")
      }

      if (data && data.length > 0) {
        const grouped = groupMealsByDay(data as Meal[])
        setGroupedMeals(grouped)
      } else {
        setGroupedMeals([])
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

  // Empty functions since we don't need these functionalities in share view
  const handleDeleteClick = () => {}
  const handleEditClick = () => {}

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Loading shared content...</p>
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
              Back to home
            </Button>
          </div>
        </div>
      </div>
    )
  }

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

      <ScrollArea className="flex-1">
        <div className="p-4 pb-40">
          {groupedMeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-neutral-500">No hay comidas compartidas</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm mb-6 text-center">
                <h1 className="text-xl font-bold mb-2">Historial de comidas compartido</h1>
                <p className="text-neutral-500">Este es un historial de comidas compartido desde Mily</p>
              </div>

              {groupedMeals.map((group) => (
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
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
