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

export function ShareDropdown({ meals, disabled = false }: ShareDropdownProps) {
  const buttonDisabled = disabled || meals.length === 0

  const handleNativeShare = async () => {
    const url = window.location.origin + "/share/" + (meals[0]?.user_id || "")
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mily - Historial de comidas",
          text: "Mira mi historial en Mily",
          url,
        })
      } catch (err) {
        // Si el usuario cancela o hay error, no hacer nada
      }
    } else {
      // Fallback: abrir el modal actual
      setDropdownOpen(true)
    }
  }

  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={buttonDisabled}
      className="min-w-[100px]"
      onClick={handleNativeShare}
    >
      <Share2 className="h-4 w-4 mr-2" />
      <span>Compartir</span>
    </Button>
  )
}

export default ShareDropdown
