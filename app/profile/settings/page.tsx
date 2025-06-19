"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import UserProfileSettings from "@/components/user-profile-settings"

export default function ProfileSettingsPage() {
  // Add loading state from auth context
  const { user, loading } = useAuth()
  const router = useRouter()

  // Update the useEffect to handle session persistence better
  useEffect(() => {
    // Don't redirect immediately, wait for auth to load
    if (loading) return

    if (!user) {
      router.push("/login")
    }
  }, [user, router, loading])

  // Add loading state check in the render
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return <UserProfileSettings />
}
