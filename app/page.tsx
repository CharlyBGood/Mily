"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, History } from "lucide-react"
import MealLogger from "@/components/meal-logger"
import MealHistory from "@/components/meal-history"
import { isLocalStorageAvailable } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import MilyLogo from "@/components/mily-logo"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("logger")
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if localStorage is available
    setStorageAvailable(isLocalStorageAvailable())

    // Check if we should switch to history tab after adding a meal
    const params = new URLSearchParams(window.location.search)
    if (params.get("tab") === "history") {
      setActiveTab("history")
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  if (!mounted) {
    // Return a placeholder with minimal content to prevent hydration mismatch
    return (
      <div className="flex flex-col h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white">
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

  if (!storageAvailable) {
    return (
      <div className="flex flex-col h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white">
          <div className="flex justify-center">
            <MilyLogo />
          </div>
        </header>
        <main className="flex-1 p-4">
          <Alert variant="destructive" className="max-w-md mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Esta aplicación requiere acceso a localStorage para funcionar correctamente. Por favor, asegúrate de que
              tu navegador tenga habilitado localStorage y que no estés en modo incógnito.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex justify-center items-center">
        <MilyLogo />
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto pb-32">
          <TabsContent value="logger" className="h-full p-0 m-0">
            <MealLogger />
          </TabsContent>
          <TabsContent value="history" className="h-full p-0 m-0">
            <MealHistory />
          </TabsContent>
        </main>

        <footer className="border-t bg-white fixed bottom-0 left-0 right-0 z-10 shadow-md pt-2 pb-3">
          <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto">
            <TabsTrigger
              value="logger"
              className="flex flex-col items-center justify-center py-2 px-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 h-auto"
            >
              <Camera className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium leading-tight">Registrar</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex flex-col items-center justify-center py-2 px-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 h-auto"
            >
              <History className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium leading-tight">Historial</span>
            </TabsTrigger>
          </TabsList>
          <div className="h-safe-area w-full bg-white"></div>
        </footer>
      </Tabs>
    </div>
  )
}
