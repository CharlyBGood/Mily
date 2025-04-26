"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Share2 } from "lucide-react"
import { useRouter } from "next/navigation"
import DirectShareButton from "@/components/direct-share-button"
import PdfExportButton from "@/components/pdf-export-button"

export default function ShareDropdown() {
  const router = useRouter()

  const handleManageShareLinks = () => {
    router.push("/share-management")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <DirectShareButton />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <PdfExportButton />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleManageShareLinks}>
          <div className="flex items-center w-full cursor-pointer">
            <span>Gestionar enlaces</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
