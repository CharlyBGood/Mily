"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, FileDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Meal } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import DirectShareButton from "@/components/direct-share-button"

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
      const currentDate = format(new Date(), "yyyy-MM-dd", { locale: es })
      const filename = `NutriApp_Historial_${currentDate}.pdf`

      if (onBeforePdfExport) {
        const content = await onBeforePdfExport()
        if (!content) {
          throw new Error("Failed to prepare content for PDF export")
        }
      }

      toast({
        title: "PDF generado",
        description: "El historial ha sido exportado exitosamente",
      })

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
        <Button
          variant="outline"
          size="sm"
          disabled={buttonDisabled}
          className={`${isGeneratingPdf ? "opacity-70" : ""} min-w-[100px]`}
        >
          <Share2 className="h-4 w-4 mr-2" />
          <span>Compartir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="text-sm font-medium text-gray-700 px-2 py-1">
          Compartir Historial
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-1">
          <DropdownMenuItem asChild className="cursor-pointer">
            <div className="w-full">
              <DirectShareButton compact />
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-2 px-2"
              onClick={handleExportPDF}
              disabled={meals.length === 0 || isGeneratingPdf}
            >
              <FileDown className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Exportar PDF</span>
                <span className="text-xs text-gray-500">Descargar como archivo</span>
              </div>
            </Button>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
