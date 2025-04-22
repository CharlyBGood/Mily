"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import DataMigrationUtility from "@/lib/data-migration"
import { useAuth } from "@/lib/auth-context"

export default function MigratePage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleBack = () => {
    router.push("/")
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-neutral-500">Cargando...</p>
      </div>
    )
  }

  if (!user) {
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

        <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Inicia sesión para continuar</h1>
          <p className="text-neutral-600 mb-8 max-w-md">Debes iniciar sesión para migrar tus datos a la nube.</p>
          <Button onClick={() => router.push("/login")} className="mb-4">
            Iniciar sesión
          </Button>
        </main>
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

      <main className="flex-1 p-4 overflow-auto">
        <DataMigrationUtility />
      </main>
    </div>
  )
}
