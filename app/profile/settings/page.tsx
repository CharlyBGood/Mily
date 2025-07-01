"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import UserProfileSettings from "@/components/user-profile-settings"

export default function ProfileSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/login")
    }
  }, [user, router, loading])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return <UserProfileSettings from={from} />
}
