"use client"

import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
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
  disabled?: boolean
}

export default function ShareDropdown({ meals, disabled = false }: ShareDropdownProps) {
  const buttonDisabled = disabled || meals.length === 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={buttonDisabled} className="min-w-[100px]">
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
