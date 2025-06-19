"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import type { Meal } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const buttonDisabled = disabled || meals.length === 0

  const handleShareClick = (e: React.MouseEvent) => {
    // Prevent the dropdown from closing when share button is clicked
    e.preventDefault()
    e.stopPropagation()
    // Keep dropdown open while modal is being opened
    setDropdownOpen(true)
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
          <div onClick={handleShareClick} className="cursor-pointer">
            <DirectShareButton compact onModalOpen={() => setDropdownOpen(false)} />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
