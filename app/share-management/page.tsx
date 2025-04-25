"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import CreateShareLink from "@/components/share/create-share-link"
import ManageShareLinks from "@/components/share/manage-share-links"
import { useAuth } from "@/lib/auth-context"

export default function ShareManagementPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null)

  const handleBack = () => {
    router.push("/")
  }

  const handleShareSuccess = (shareUrl: string) => {
    setCreatedShareUrl(shareUrl)
  }

  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <MilyLogo />
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-neutral-500 mb-4">You need to be signed in to manage share links.</p>
            <Button onClick={() => router.push("/login")}>Sign In</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center">
          <MilyLogo />
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl mx-auto p-4 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Share Management</h1>
            <CreateShareLink onSuccess={handleShareSuccess} />
          </div>

          {createdShareUrl && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <h3 className="font-medium text-green-800 mb-2">Share link created successfully!</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={createdShareUrl}
                  readOnly
                  className="flex-1 p-2 text-sm border rounded bg-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    window.open(createdShareUrl, "_blank")
                  }}
                >
                  Open
                </Button>
              </div>
            </div>
          )}

          <ManageShareLinks />
        </div>
      </div>
    </div>
  )
}
