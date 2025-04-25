"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

interface AccessCodeFormProps {
  shareId: string
  onSuccess: () => void
  onError: (error: string) => void
}

export default function AccessCodeForm({ shareId, onSuccess, onError }: AccessCodeFormProps) {
  const [accessCode, setAccessCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = getSupabaseClient()

      // Get the share link with the access code
      const { data, error } = await supabase.from("share_links").select("access_code").eq("id", shareId).single()

      if (error) {
        onError("Share link not found")
        return
      }

      // Verify the access code
      if (data.access_code === accessCode) {
        // Store the access code in session storage for this share link
        sessionStorage.setItem(`share_access_${shareId}`, accessCode)
        onSuccess()
      } else {
        onError("Invalid access code")
      }
    } catch (error) {
      onError("An error occurred while verifying the access code")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lock className="mr-2 h-5 w-5" />
          Protected Content
        </CardTitle>
        <CardDescription>This content is password protected. Please enter the access code to view it.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
              autoFocus
              className="w-full"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Verifying..." : "Access Content"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
