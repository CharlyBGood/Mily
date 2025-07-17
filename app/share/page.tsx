"use client"

import { useState, useEffect } from "react"
import { getUserMeals } from "@/lib/meal-service"
import { groupMealsByDay } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import DaySection from "@/components/day-section"
import HeaderBar from "@/components/header-bar"

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
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <HeaderBar backHref="/" />
      <main className="flex-1">
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
                  onExpand={handleSectionExpand}
                  isExpanded={expandedSection === group.date}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
