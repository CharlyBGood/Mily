"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Share } from "lucide-react"
import PdfExportButton from "@/components/pdf-export-button"
import DirectShareButtonNew from "@/components/direct-share-button-new"

interface ShareDropdownProps {
  compact?: boolean
}

export default function ShareDropdown({ compact = false }: ShareDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={compact ? "sm" : "default"} className="flex items-center">
          <Share className="h-4 w-4 mr-2" />
          {!compact && <span>Compartir</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <DirectShareButtonNew compact />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <PdfExportButton compact />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
