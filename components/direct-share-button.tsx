"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { groupMealsByCycle, getUserCycleDuration } from "@/lib/cycle-utils"
import { useStorage } from "@/lib/storage-provider"

interface DirectShareButtonProps {
  compact?: boolean
}

export default function DirectShareButton({ compact = false }: DirectShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [cycleGroups, setCycleGroups] = useState<any[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string>("all")
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const { getUserMeals } = useStorage()

  const handleOpenDialog = async () => {
    if (!user) {
      toast({
        title: "No autenticado",
        description: "Debes iniciar sesión para compartir tu historial",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsLoading(true)
    setIsOpen(true)

    try {
      // Generate the share URL
      const baseUrl = window.location.origin
      const shareUrl = `${baseUrl}/share/${user.id}${selectedCycle !== "all" ? `?cycle=${selectedCycle}` : ""}`
      setShareUrl(shareUrl)

      // Load cycle data for the dropdown
      const { success, data } = await getUserMeals()
      if (success && data && data.length > 0) {
        const duration = await getUserCycleDuration(user.id)
        const cycles = groupMealsByCycle(data, duration)
        setCycleGroups(cycles)
      }
    } catch (error) {
      console.error("Error generating share URL:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al generar el enlace para compartir",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast({
        title: "Enlace copiado",
        description: "El enlace ha sido copiado al portapapeles",
      })
    } catch (error) {
      console.error("Error copying to clipboard:", error)
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace al portapapeles",
        variant: "destructive",
      })
    }
  }

  const handleCycleChange = (value: string) => {
    setSelectedCycle(value)
    // Update the share URL with the selected cycle
    const baseUrl = window.location.origin
    const newShareUrl = `${baseUrl}/share/${user?.id}${value !== "all" ? `?cycle=${value}` : ""}`
    setShareUrl(newShareUrl)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
        className="text-teal-600 border-neutral-200 hover:border-teal-600 hover:bg-teal-50"
        disabled={isLoading}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {!compact && "Compartir"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Compartir historial</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Comparte tu historial de comidas con quien quieras mediante este enlace.
            </DialogDescription>
          </DialogHeader>

          {cycleGroups.length > 0 && (
            <div className="mb-4 mt-2">
              <label className="text-sm font-medium mb-2 block text-neutral-700">¿Qué quieres compartir?</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between border-neutral-200">
                    {selectedCycle === "all" ? "Todo el historial" : `Ciclo ${selectedCycle}`}
                    <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Seleccionar contenido</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={selectedCycle} onValueChange={handleCycleChange}>
                    <DropdownMenuRadioItem value="all">Todo el historial</DropdownMenuRadioItem>
                    {cycleGroups.map((cycle) => (
                      <DropdownMenuRadioItem key={cycle.cycleNumber} value={cycle.cycleNumber.toString()}>
                        Ciclo {cycle.cycleNumber}: {cycle.displayDateRange}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="flex flex-col space-y-2 mt-2">
            <label className="text-sm font-medium text-neutral-700">Enlace para compartir</label>
            <div className="flex items-center space-x-2">
              <input
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={shareUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                size="sm"
                className="px-3 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200"
                onClick={handleCopyLink}
                disabled={isCopied}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copiar</span>
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between sm:justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-neutral-200">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.open(shareUrl, "_blank")
              }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Abrir enlace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
