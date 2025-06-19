"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, History, User } from "lucide-react"
import MealLogger from "@/components/meal-logger"
import MealHistory from "@/components/meal-history"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("logger")
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("tab") === "history") {
        setActiveTab("history")
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  if (!mounted) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="p-4 border-b bg-white/80 backdrop-blur-sm">
          <div className="flex justify-center">
            <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
        <header className="p-4 sm:p-6 border-b bg-white/80 backdrop-blur-sm">
          <div className="flex justify-center">
            <MilyLogo />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bienvenido a NutriApp</h1>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                Registra tus comidas diarias y lleva un seguimiento de tu alimentación de manera sencilla.
              </p>
            </div>
            <div className="space-y-3 w-full">
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-12 text-base bg-teal-600 hover:bg-teal-700"
              >
                Iniciar sesión
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/login?tab=register")}
                className="w-full h-12 text-base border-teal-600 text-teal-600 hover:bg-teal-50"
              >
                Crear cuenta
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile-optimized header */}
      <header className="p-3 sm:p-4 border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="w-8 sm:w-10"></div>
          <MilyLogo />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/profile")}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
          >
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          <TabsContent value="logger" className="h-full p-0 m-0 overflow-auto">
            <div className="pb-20 sm:pb-24">
              <MealLogger />
            </div>
          </TabsContent>
          <TabsContent value="history" className="h-full p-0 m-0 overflow-auto">
            <div className="pb-20 sm:pb-24">
              <MealHistory />
            </div>
          </TabsContent>
        </main>

        {/* Mobile-first bottom navigation */}
        <footer className="border-t bg-white/95 backdrop-blur-sm fixed bottom-0 left-0 right-0 z-50 shadow-lg">
          <div className="safe-area-inset-bottom">
            <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto p-2 sm:p-3">
              <TabsTrigger
                value="logger"
                className="flex flex-col items-center justify-center py-2 sm:py-3 px-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 h-auto rounded-lg transition-all duration-200"
              >
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium leading-tight">Registrar</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex flex-col items-center justify-center py-2 sm:py-3 px-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 h-auto rounded-lg transition-all duration-200"
              >
                <History className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium leading-tight">Historial</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </footer>
      </Tabs>
    </div>
  )
}
