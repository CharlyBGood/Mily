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
import AccessCodeForm from "@/components/share/access-code-form"
import { getSupabaseClient } from "@/lib/supabase-client"

export default function SharePage() {
  const [groupedMeals, setGroupedMeals] = useState<ReturnType<typeof groupMealsByDay>>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const shareId = params.id as string

  useEffect(() => {
    setMounted(true)
    checkAccessAndLoadMeals()
  }, [])

  const checkAccessAndLoadMeals = async () => {
    setLoading(true)
    try {
      const storedAccessCode = sessionStorage.getItem(`share_access_${shareId}`)

      if (storedAccessCode) {
        await handleVerifiedAccess()
        return
      }

      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from("share_links")
        .select("is_password_protected, expires_at, is_active")
        .eq("id", shareId)
        .single()

      if (error) throw error

      // Validar expiración y estado
      const nowUTC = new Date().toISOString()
      if (!data.is_active || (data.expires_at && data.expires_at < nowUTC)) {
        throw new Error("Enlace no válido o expirado")
      }

      if (data.is_password_protected) {
        setIsPasswordProtected(true)
      } else {
        await handleVerifiedAccess()
      }
    } catch (error) {
      setError(error.message || "Error al verificar el enlace")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifiedAccess = async () => {
    setIsVerified(true)
    try {
      const { success, data, error } = await getSharedMeals(shareId)

      if (!success) throw error
      if (!data?.length) setGroupedMeals([])

      const grouped = groupMealsByDay(data || [])
      setGroupedMeals(grouped)
    } catch (error) {
      setError("Error al cargar las comidas")
    }
  }

  const loadMeals = async () => {
    try {
      const { success, data, error } = await getSharedMeals(shareId)

      if (!success) throw error
      if (!data?.length) setGroupedMeals([])

      const grouped = groupMealsByDay(data || [])
      setGroupedMeals(grouped)
    } catch (error) {
      setError("Error al cargar las comidas")
    }
  }

  const handleBack = () => router.push("/")

  const handleSectionExpand = (date: string) => {
    setExpandedSection(date === expandedSection ? null : date)
  }

  const handleAccessSuccess = () => {
    sessionStorage.setItem(`share_access_${shareId}`, "verified")
    setIsVerified(true)
    loadMeals()
  }

  const handleAccessError = (errorMsg: string) => {
    toast({
      title: "Acceso denegado",
      description: errorMsg,
      variant: "destructive",
    })
  }

  // Funciones vacías para acciones no permitidas
  const handleDeleteClick = () => {}
  const handleEditClick = () => {}

  if (!mounted) {
    return <LoadingScreen message="Cargando comidas..." />
  }

  if (loading) {
    return <LoadingScreen message="Cargando comidas compartidas..." />
  }

  if (error) {
    return <ErrorLayout error={error} handleBack={handleBack} />
  }

  if (isPasswordProtected && !isVerified) {
    return (
      <PasswordGateLayout
        handleBack={handleBack}
        shareId={shareId}
        onSuccess={handleAccessSuccess}
        onError={handleAccessError}
      />
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
            <EmptyState />
          ) : (
            <>
              <HeaderSection />
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

// Componentes auxiliares
const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-screen p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
    <p className="text-neutral-500">{message}</p>
  </div>
)

const ErrorLayout = ({ error, handleBack }: { error: string; handleBack: () => void }) => (
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
          Volver al inicio
        </Button>
      </div>
    </div>
  </div>
)

const PasswordGateLayout = ({
  handleBack,
  shareId,
  onSuccess,
  onError,
}: {
  handleBack: () => void
  shareId: string
  onSuccess: () => void
  onError: (msg: string) => void
}) => (
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

    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="max-w-md w-full">
        <AccessCodeForm shareId={shareId} onSuccess={onSuccess} onError={onError} />
      </div>
    </div>
  </div>
)

const HeaderSection = () => (
  <div className="bg-white p-4 rounded-lg shadow-sm mb-6 text-center">
    <h1 className="text-xl font-bold mb-2">Historial de comidas compartido</h1>
    <p className="text-neutral-500">Este es un historial de comidas compartido desde Mily</p>
  </div>
)

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <p className="text-neutral-500">No hay comidas compartidas</p>
  </div>
)
