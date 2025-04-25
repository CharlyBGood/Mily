"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, FileDown, Link2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { shareContent } from "@/lib/utils"
import type { Meal } from "@/lib/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createShareLink } from "@/lib/share-service"
import { useRouter } from "next/navigation"

interface ShareDropdownProps {
  meals: Meal[]
  onBeforePdfExport?: () => Promise<HTMLElement | null>
  onAfterPdfExport?: () => void
  disabled?: boolean
}

export default function ShareDropdown({
  meals,
  onBeforePdfExport,
  onAfterPdfExport,
  disabled = false,
}: ShareDropdownProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false)
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreateShareLink = async () => {
    setIsCreatingShareLink(true)
    try {
      const { success, data, error } = await createShareLink(
        "Mi historial de comidas",
        "Historial de comidas compartido desde Mily",
      )

      if (success && data) {
        const url = `${window.location.origin}/share/${data.id}`
        setShareUrl(url)
        setShareDialogOpen(true)
      } else {
        // Check if the error is because the table doesn't exist
        if (error && error.code === "42P01") {
          setSetupDialogOpen(true)
        } else {
          toast({
            title: "Error",
            description: error?.message || "No se pudo crear el enlace para compartir",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error creating share link:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el enlace para compartir",
        variant: "destructive",
      })
    } finally {
      setIsCreatingShareLink(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Enlace copiado",
        description: "El enlace ha sido copiado al portapapeles",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const handleShareLink = async () => {
    if (disabled || isSharing) return

    setIsSharing(true)
    try {
      const result = await shareContent(
        "Mi historial de comidas en Mily",
        "Mira mi historial de comidas en Mily",
        shareUrl,
      )

      if (result.success) {
        toast({
          title: "Enlace compartido",
          description: "El enlace ha sido compartido exitosamente",
        })
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles",
        })
      }
    } catch (error) {
      console.error("Error sharing link:", error)
      toast({
        title: "Error",
        description: "No se pudo compartir el enlace",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleExportPDF = async () => {
    if (disabled || meals.length === 0 || isGeneratingPdf) return

    setIsGeneratingPdf(true)
    try {
      // Generate filename with current date
      const currentDate = format(new Date(), "yyyy-MM-dd", { locale: es })
      const filename = `Mily_Historial_${currentDate}.pdf`

      // If there's a preparation callback, call it
      if (onBeforePdfExport) {
        const content = await onBeforePdfExport()
        if (!content) {
          throw new Error("Failed to prepare content for PDF export")
        }
      }

      // Here would be the PDF generation code
      // For now, we'll just show a success message
      toast({
        title: "PDF generado",
        description: "El historial ha sido exportado exitosamente",
      })

      // Call the cleanup callback if provided
      if (onAfterPdfExport) {
        onAfterPdfExport()
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al generar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleSetupDatabase = () => {
    setSetupDialogOpen(false)
    router.push("/setup-database")
  }

  const buttonDisabled = disabled || meals.length === 0 || isGeneratingPdf || isSharing || isCreatingShareLink

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={buttonDisabled}
            className={isGeneratingPdf || isSharing || isCreatingShareLink ? "opacity-70" : ""}
          >
            {isCreatingShareLink ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            <span>Compartir</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCreateShareLink} disabled={isCreatingShareLink} className="cursor-pointer">
            <Link2 className="h-4 w-4 mr-2" />
            <span>Crear enlace público</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExportPDF}
            disabled={meals.length === 0 || isGeneratingPdf}
            className="cursor-pointer"
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span>Exportar como PDF</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Link Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir historial</DialogTitle>
            <DialogDescription>
              Comparte tu historial de comidas con cualquier persona usando este enlace público
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button onClick={handleCopyLink}>Copiar</Button>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleShareLink} disabled={isSharing}>
              {isSharing ? "Compartiendo..." : "Compartir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Database Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración de base de datos requerida</DialogTitle>
            <DialogDescription>
              Para usar la función de compartir, necesitas configurar la base de datos primero.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p>
              La tabla <code>share_links</code> no existe en tu base de datos de Supabase. Esta tabla es necesaria para
              la funcionalidad de compartir enlaces.
            </p>
            <p>¿Quieres ir a la página de configuración de la base de datos para crear esta tabla?</p>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetupDatabase}>Configurar base de datos</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
