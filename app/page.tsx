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
import HeaderBar from "@/components/header-bar"
import Loader from "@/components/ui/loader"

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
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <HeaderBar />
        <div className="flex-1 flex items-center justify-center p-4">
          <main className="flex-1 flex items-center justify-center p-4">
            {/* Aquí iba el contenido de bienvenida */}
            <div>
              <h1 className="text-2xl font-bold mb-2">Te damos la bienvenida a Mily</h1>
              <p className="mb-4 text-gray-600">Lleva un registro ordenado de tus comidas y compartelo con quien necesites..</p>
              <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
              <Button onClick={() => router.push("/register")} variant="outline" className="ml-2">Crear cuenta</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <HeaderBar
        right={
          <>
            {/* Desktop: icono usuario */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              aria-label="Perfil"
              onClick={() => router.push("/profile")}
            >
              <User className="h-6 w-6" />
            </Button>
            {/* Mobile: hamburguesa */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Menú"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-64">
                <div className="flex flex-col h-full">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-5 w-5" /> Perfil
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push("/profile/settings")}
                  >
                    Configuración
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        }
      // No mostrar flecha atrás en páginas principales
      />
      <main className="flex-1 flex flex-col pt-16"> {/* pt-16 para compensar el header fijo */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <TabsContent value="logger" className="h-full p-0 m-0">
            <div className="pb-20 sm:pb-6 min-h-full">
              <MealLogger />
            </div>
          </TabsContent>
          <TabsContent value="history" className="h-full p-0 m-0">
            <div className="pb-20 sm:pb-6 min-h-full">
              <MealHistory />
            </div>
          </TabsContent>

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
      </main>
    </div>
  )
}
