"use client"

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase-client";

interface NoteButtonProps {
  comment?: string
  disabled?: boolean
}

export default function NoteButton({ comment, disabled }: NoteButtonProps) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  const fetchUsername = async () => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        console.error("Supabase client is not initialized")
        return
      }
      const { data, error } = await supabase.from('profiles').select('username').single();
      if (error) {
        console.error('Failed to fetch username:', error);
      }
      if (data) {
        setUsername(data.username);
      }      
      
    } catch (error) {
      console.error('Error fetching username:', error);
    }
  }

  const handleOpen = () => {
    setOpen(true)
    fetchUsername();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-amber-600 hover:text-amber-700"
        onClick={handleOpen}
        disabled={disabled || !comment}
        aria-label="Ver nota"
      >
        <StickyNote className="w-5 h-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs sm:max-w-md flex flex-col gap-2" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              Nota {username ? `de ${username}` : ""}
            </DialogTitle>
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
