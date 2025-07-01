"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, History, User, Menu } from "lucide-react"
import MealLogger from "@/components/meal-logger"
import MealHistory from "@/components/meal-history"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

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
      <div className="flex flex-col h-screen bg-gray-50">
        <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex justify-center">
              <div className="w-24 h-8 bg-gray-200 animate-pulse rounded-lg"></div>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex justify-center">
              <MilyLogo className="w-24 h-auto" />
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  Bienvenido a <span className="text-teal-600">Mily</span>
                </h1>
                <p className="text-gray-600 text-base leading-relaxed">
                  Registra tus comidas diarias y lleva un seguimiento de tu alimentación de manera sencilla.
                </p>
              </div>
            </div>
            <div className="space-y-3 w-full">
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-12 text-base bg-teal-600 hover:bg-teal-700 text-white font-medium"
              >
                Iniciar sesión
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/login?tab=register")}
                className="w-full h-12 text-base border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-medium"
              >
                Crear cuenta nueva
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 z-40">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center justify-center flex-1 sm:flex-none sm:justify-start">
              <MilyLogo className="w-20 h-auto sm:w-24" />
            </div>

            {/* Mobile Menu */}
            <div className="sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white">
                  <div className="flex flex-col h-full pt-6">
                    <div className="flex items-center space-x-3 mb-8 p-4 bg-teal-50 rounded-xl">
                      <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.email?.split("@")[0]}</p>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      </div>
                    </div>

                    <nav className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 hover:bg-teal-50 hover:text-teal-700"
                        onClick={() => router.push("/profile")}
                      >
                        <User className="h-5 w-5 mr-3" />
                        Mi Perfil
                      </Button>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden sm:flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/profile")}
                className="flex items-center space-x-2 h-10 px-4 hover:bg-teal-50 hover:text-teal-700"
              >
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">{user.email?.split("@")[0]}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          <TabsContent value="logger" className="h-full p-0 m-0 overflow-y-auto">
            <div className="pb-20 sm:pb-6 min-h-full">
              <MealLogger />
            </div>
          </TabsContent>
          <TabsContent value="history" className="h-full p-0 m-0 overflow-y-auto">
            <div className="pb-20 sm:pb-6 min-h-full">
              <MealHistory />
            </div>
          </TabsContent>
        </main>

        {/* Mobile Bottom Navigation */}
        <footer className="flex-shrink-0 sm:hidden border-t bg-white fixed bottom-0 left-0 right-0 z-50">
          <div className="pb-safe">
            <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto p-2">
              <TabsTrigger
                value="logger"
                className="flex flex-col items-center justify-center py-3 px-4 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 h-auto transition-all duration-200 space-y-1"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">Registrar comida</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex flex-col items-center justify-center py-3 px-4 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 h-auto transition-all duration-200 space-y-1"
              >
                <History className="h-6 w-6" />
                <span className="text-xs font-medium">Ver historial</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </footer>

        {/* Desktop Tab Navigation */}
        <footer className="hidden sm:block flex-shrink-0 border-t bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger
                value="logger"
                className="flex items-center space-x-2 px-6 py-3 data-[state=active]:bg-white data-[state=active]:text-teal-700 font-medium"
              >
                <Camera className="h-5 w-5" />
                <span>Registrar comida</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex items-center space-x-2 px-6 py-3 data-[state=active]:bg-white data-[state=active]:text-teal-700 font-medium"
              >
                <History className="h-5 w-5" />
                <span>Ver historial</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </footer>
      </Tabs>
    </div>
  )
}
