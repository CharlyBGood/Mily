"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase-client"

export default function DebugEnv() {
  const [showEnv, setShowEnv] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const toggleEnv = () => {
    setShowEnv(!showEnv)
  }

  const testConnection = async () => {
    try {
      const supabase = getSupabaseClient()

      // Try to list buckets as a simple test
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        setConnectionStatus("error")
        setErrorMessage(error.message)
      } else {
        setConnectionStatus("success")
        setErrorMessage(null)
      }
    } catch (err) {
      setConnectionStatus("error")
      setErrorMessage(err instanceof Error ? err.message : "Unknown error")
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Environment Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <Button variant="outline" onClick={toggleEnv}>
            {showEnv ? "Hide Environment" : "Show Environment"}
          </Button>
          <Button variant="outline" onClick={testConnection}>
            Test Supabase Connection
          </Button>
        </div>

        {showEnv && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <h3 className="font-medium mb-2">Environment Variables:</h3>
            <div className="text-sm space-y-1">
              <p>
                <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Not set"}
              </p>
              <p>
                <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"}
              </p>
              <p>
                <strong>NEXT_PUBLIC__SUPABASE_URL:</strong>{" "}
                {process.env.NEXT_PUBLIC__SUPABASE_URL ? "✅ Set" : "❌ Not set"}
              </p>
              <p>
                <strong>NEXT_PUBLIC__SUPABASE_ANON_KEY:</strong>{" "}
                {process.env.NEXT_PUBLIC__SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"}
              </p>
            </div>
          </div>
        )}

        {connectionStatus !== "unknown" && (
          <div className={`mt-4 p-4 rounded-md ${connectionStatus === "success" ? "bg-green-100" : "bg-red-100"}`}>
            <h3 className="font-medium mb-2">Connection Status:</h3>
            <p>{connectionStatus === "success" ? "✅ Connected successfully" : "❌ Connection failed"}</p>
            {errorMessage && <p className="text-sm text-red-600 mt-2">{errorMessage}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
