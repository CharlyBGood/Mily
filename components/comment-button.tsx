"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface CommentButtonProps {
  comment?: string
  onSave: (comment: string) => void
  onDelete?: () => void
  disabled?: boolean
}

export default function CommentButton({ comment, onSave, onDelete, disabled }: CommentButtonProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(comment || "")
  const [editing, setEditing] = useState(!comment)

  const handleOpen = () => {
    setOpen(true)
    setEditing(!comment)
    setValue(comment || "")
  }

  const handleSave = () => {
    onSave(value)
    setOpen(false)
  }

  const handleDelete = () => {
    if (onDelete) onDelete()
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-teal-600 hover:text-teal-700"
        onClick={handleOpen}
        disabled={disabled}
        aria-label={comment ? "Ver comentario" : "Agregar comentario"}
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs sm:max-w-md flex flex-col gap-2" aria-describedby={undefined}>
          <DialogHeader className="pb-2">
            <DialogTitle>{editing ? "Agregar comentario" : "Comentario"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <Textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Escribe tu comentario..."
              className="resize-none min-h-[80px]"
              autoFocus
            />
          ) : (
            <div className="text-gray-700 whitespace-pre-line p-2 bg-gray-50 rounded border text-sm">
              {comment}
            </div>
          )}
          <DialogFooter>
            {editing ? (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={!value.trim()} className="bg-teal-600 hover:bg-teal-700 text-white">
                  Guardar
                </Button>
                {comment && (
                  <Button variant="destructive" onClick={handleDelete} type="button">
                    Eliminar
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Editar
                </Button>
                {comment && (
                  <Button variant="destructive" onClick={handleDelete} type="button">
                    Eliminar
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
