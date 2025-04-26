"use client"

import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import type { Meal } from "@/lib/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import DirectShareButton from "./direct-share-button"
import PDFExportButton from "./pdf-export-button"

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Share2 className="h-4 w-4 mr-2" />
          <span>Compartir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <DirectShareButton />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <PDFExportButton
            meals={meals}
            onBeforePdfExport={onBeforePdfExport}
            onAfterPdfExport={onAfterPdfExport}
            disabled={disabled}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
