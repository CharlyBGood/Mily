"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { getUserShareLinks, deleteShareLink, type ShareLink } from "@/lib/share-service"
import { useToast } from "@/hooks/use-toast"
import { format, formatDistanceToNow } from "date-fns"
import { Copy, Trash2, ExternalLink, Lock } from "lucide-react"

export default function ManageShareLinks() {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedShareLink, setSelectedShareLink] = useState<ShareLink | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadShareLinks()
  }, [])

  const loadShareLinks = async () => {
    setLoading(true)
    try {
      const { success, data } = await getUserShareLinks()
      if (success && data) {
        setShareLinks(data)
      }
    } catch (error) {
      console.error("Error loading share links:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async (shareLink: ShareLink) => {
    const shareUrl = `${window.location.origin}/share/${shareLink.id}`
    await navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link copied!",
      description: "The share link has been copied to your clipboard.",
    })
  }

  const handleOpenLink = (shareLink: ShareLink) => {
    const shareUrl = `${window.location.origin}/share/${shareLink.id}`
    window.open(shareUrl, "_blank")
  }

  const handleDeleteClick = (shareLink: ShareLink) => {
    setSelectedShareLink(shareLink)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedShareLink) return

    try {
      const { success } = await deleteShareLink(selectedShareLink.id)
      if (success) {
        toast({
          title: "Share link deleted",
          description: "The share link has been deleted successfully.",
        })
        loadShareLinks()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the share link.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the share link.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setSelectedShareLink(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "PPP")
  }

  const formatExpiry = (dateString?: string) => {
    if (!dateString) return "Never"

    const date = new Date(dateString)
    const now = new Date()

    if (date < now) {
      return "Expired"
    }

    return `Expires in ${formatDistanceToNow(date)}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Share Links</CardTitle>
        <CardDescription>View and manage your shared meal history links</CardDescription>
      </CardHeader>
      <CardContent>
        {shareLinks.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">You haven't created any share links yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {link.title}
                      {link.is_password_protected && <Lock className="ml-2 h-4 w-4 text-neutral-400" />}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(link.created_at)}</TableCell>
                  <TableCell>{formatExpiry(link.expires_at)}</TableCell>
                  <TableCell>
                    {link.is_active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-neutral-100 text-neutral-700 border-neutral-200">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleCopyLink(link)} title="Copy link">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenLink(link)} title="Open link">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(link)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={loadShareLinks}>
          Refresh
        </Button>
      </CardFooter>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this share link. Anyone with this link will no longer be able to access your
              meal history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
