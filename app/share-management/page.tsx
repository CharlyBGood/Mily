"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import ManageShareLinks from "@/components/share/manage-share-links"
import DirectShareButton from "@/components/direct-share-button"

export default function ShareManagementPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  const handleBack = () => {
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center">Gestionar enlaces compartidos</h1>
        <div className="w-10"></div>
      </header>

      <div className="container max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Crear nuevo enlace compartido</h2>
          <p className="text-neutral-500 mb-4">
            Crea un nuevo enlace para compartir tu historial de comidas con otras personas.
          </p>
          <div className="flex justify-center">
            <DirectShareButton />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <ManageShareLinks />
        </div>
      </div>
    </div>
  )
}
