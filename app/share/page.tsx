"use client"

import { useState, useEffect } from "react"
import { getUserMeals } from "@/lib/local-storage"
import { groupMealsByDay } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import DaySection from "@/components/day-section"

export default function SharePage() {
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    loadMeals()
  }, [])

  const loadMeals = async () => {
    setLoading(true)
    try {
      const { success, data } = await getUserMeals()

      if (success && data && data.length > 0) {
        const grouped = groupMealsByDay(data)
        setGroupedMeals(grouped)
      }
    } catch (error) {
      console.error("Error loading meals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/")
  }

  // Empty functions since we don't need these functionalities in share view
  const handleDeleteClick = () => {}
  const handleEditClick = () => {}

  const handleSectionExpand = (date: string) => {
    setExpandedSection(date)
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando comidas...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando comidas...</p>
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
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 pb-40">
          {groupedMeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-neutral-500">No hay comidas registradas</p>
            </div>
          ) : (
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
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
