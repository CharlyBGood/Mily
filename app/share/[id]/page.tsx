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
      // Check if we have a stored access code for this share link
      const storedAccessCode = sessionStorage.getItem(`share_access_${shareId}`)

      if (storedAccessCode) {
        setIsVerified(true)
        await loadMeals()
      } else {
        // Check if the share link is password protected
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from("share_links")
          .select("is_password_protected")
          .eq("id", shareId)
          .single()

        if (error) {
          setError("Share link not found")
          setLoading(false)
          return
        }

        if (data.is_password_protected) {
          setIsPasswordProtected(true)
          setLoading(false)
        } else {
          setIsVerified(true)
          await loadMeals()
        }
      }
    } catch (error) {
      console.error("Error checking access:", error)
      setError("Error checking access to shared content")
      setLoading(false)
    }
  }

  const loadMeals = async () => {
  try {
    const supabase = getSupabaseClient();
    
    // 1. Verificar el enlace compartido
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("id, expires_at")
      .eq("id", shareId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString()) // Usar UTC
      .single();

    if (linkError || !shareLink) {
      setError("Enlace no válido o expirado");
      return;
    }

    // 2. Obtener comidas vinculadas al enlace
    const { data: meals, error: mealsError } = await supabase
      .from("meals")
      .select("*")
      .eq("share_link_id", shareId); // <-- Usar el nuevo campo

    if (mealsError) throw mealsError;

    const grouped = groupMealsByDay(meals || []);
    setGroupedMeals(grouped);
  } catch (error) {
    setError("Error al cargar comidas");
  } finally {
    setLoading(false);
  }
};

  const handleBack = () => {
    router.push("/")
  }

  const handleSectionExpand = (date: string) => {
    setExpandedSection(date === expandedSection ? null : date)
  }

  const handleAccessSuccess = () => {
    setIsVerified(true)
    loadMeals()
  }

  const handleAccessError = (errorMsg: string) => {
    toast({
      title: "Access Denied",
      description: errorMsg,
      variant: "destructive",
    })
  }

  // Empty functions since we don't need these functionalities in share view
  const handleDeleteClick = () => {}
  const handleEditClick = () => {}

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
        <p className="text-neutral-500">Cargando comidas compartidas...</p>
      </div>
    )
  }

  if (error) {
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

        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isPasswordProtected && !isVerified) {
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

        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="max-w-md w-full">
            <AccessCodeForm shareId={shareId} onSuccess={handleAccessSuccess} onError={handleAccessError} />
          </div>
        </div>
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
              <p className="text-neutral-500">No hay comidas compartidas</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm mb-6 text-center">
                <h1 className="text-xl font-bold mb-2">Historial de comidas compartido</h1>
                <p className="text-neutral-500">Este es un historial de comidas compartido desde Mily</p>
              </div>

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
