"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createShareLink } from "@/lib/share-service"
import { useToast } from "@/hooks/use-toast"
import { Share2 } from "lucide-react"

interface CreateShareLinkProps {
  onSuccess?: (shareUrl: string) => void
}

export default function CreateShareLink({ onSuccess }: CreateShareLinkProps) {
  const [title, setTitle] = useState("My Meal History")
  const [description, setDescription] = useState("")
  const [expiresIn, setExpiresIn] = useState<string | null>(null)
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [accessCode, setAccessCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Convert expiresIn to days
      let expiresInDays: number | undefined
      if (expiresIn === "1d") expiresInDays = 1
      else if (expiresIn === "7d") expiresInDays = 7
      else if (expiresIn === "30d") expiresInDays = 30
      else if (expiresIn === "90d") expiresInDays = 90
      else if (expiresIn === "365d") expiresInDays = 365

      const { success, data, error } = await createShareLink(
        title,
        description,
        expiresInDays,
        isPasswordProtected,
        isPasswordProtected ? accessCode : undefined,
      )

      if (success && data) {
        const shareUrl = `${window.location.origin}/share/${data.id}`

        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl)

        toast({
          title: "Share link created!",
          description: "The link has been copied to your clipboard.",
        })

        if (onSuccess) {
          onSuccess(shareUrl)
        }

        setIsOpen(false)
      } else {
        toast({
          title: "Error creating share link",
          description: error || "An error occurred while creating the share link",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while creating the share link",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Share Link</DialogTitle>
          <DialogDescription>Create a link to share your meal history with others</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Meal History"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A collection of my meals"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires">Expires</Label>
              <Select value={expiresIn || ""} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue placeholder="Never" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">3 months</SelectItem>
                  <SelectItem value="365d">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="password-protection" checked={isPasswordProtected} onCheckedChange={setIsPasswordProtected} />
              <Label htmlFor="password-protection">Password protect</Label>
            </div>
            {isPasswordProtected && (
              <div className="grid gap-2">
                <Label htmlFor="access-code">Access Code</Label>
                <Input
                  id="access-code"
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter an access code"
                  required={isPasswordProtected}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Share Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
