"use client"

import { useState } from "react"
import { StickyNote } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface NoteButtonProps {
  comment?: string
  disabled?: boolean
}

export default function NoteButton({ comment, disabled }: NoteButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-amber-600 hover:text-amber-700"
        onClick={() => setOpen(true)}
        disabled={disabled || !comment}
        aria-label="Ver nota"
      >
        <StickyNote className="w-5 h-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs sm:max-w-md flex flex-col gap-2" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Nota</DialogTitle>
          </DialogHeader>
          <div className="text-gray-700 whitespace-pre-line p-2 bg-gray-50 rounded border text-sm min-h-[60px]">
            {comment || "Sin nota"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
