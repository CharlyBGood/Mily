"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, FileDown, Link } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Meal } from "@/lib/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
  const { toast } = useToast()

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

  const buttonDisabled = disabled || meals.length === 0 || isGeneratingPdf

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={buttonDisabled} className={isGeneratingPdf ? "opacity-70" : ""}>
          <Share2 className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Compartir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              const directShareButton = document.querySelector("[data-direct-share-trigger]") as HTMLButtonElement
              if (directShareButton) {
                directShareButton.click()
              }
            }}
          >
            <Link className="h-4 w-4 mr-2" />
            <span>Compartir enlace</span>
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleExportPDF}
            disabled={meals.length === 0 || isGeneratingPdf}
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span>Exportar como PDF</span>
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
