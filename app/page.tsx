"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, History } from "lucide-react"
import MealLogger from "@/components/meal-logger"
import MealHistory from "@/components/meal-history"
import { isLocalStorageAvailable } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("logger")
  const [storageAvailable, setStorageAvailable] = useState(true)

  useEffect(() => {
    // Check if localStorage is available
    setStorageAvailable(isLocalStorageAvailable())
  }, [])

  if (!storageAvailable) {
    return (
      <div className="flex flex-col h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white">
          <h1 className="text-xl font-medium text-center text-neutral-800">NutriApp</h1>
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
      <header className="p-4 border-b bg-white flex justify-between items-center">
        <div className="w-10"></div> {/* Spacer for centering */}
        <h1 className="text-xl font-medium text-center text-neutral-800">NutriApp</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto">
          <TabsContent value="logger" className="h-full p-0 m-0">
            <MealLogger />
          </TabsContent>
          <TabsContent value="history" className="h-full p-0 m-0">
            <MealHistory />
          </TabsContent>
        </main>

        <footer className="border-t bg-white">
          <TabsList className="w-full grid grid-cols-2 bg-transparent">
            <TabsTrigger value="logger" className="flex flex-col items-center py-3 data-[state=active]:bg-neutral-100">
              <Camera className="h-5 w-5 mb-1" />
              <span className="text-xs">Registrar</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col items-center py-3 data-[state=active]:bg-neutral-100">
              <History className="h-5 w-5 mb-1" />
              <span className="text-xs">Historial</span>
            </TabsTrigger>
          </TabsList>
        </footer>
      </Tabs>
    </div>
  )
}

