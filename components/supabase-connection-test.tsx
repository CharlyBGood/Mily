"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase-client"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function SupabaseConnectionTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  const testConnection = async () => {
    setIsLoading(true)
    setTestResult(null)

    try {
      // Check if environment variables are set
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        setTestResult({
          success: false,
          message: "Environment variables are missing",
          details: `NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "Set" : "Missing"}, NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "Set" : "Missing"}`,
        })
        return
      }

      // Test connection to Supabase
      const supabase = getSupabaseClient()

      // Simple health check - try to get the current session
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setTestResult({
          success: false,
          message: "Failed to connect to Supabase",
          details: error.message,
        })
        return
      }

      // Try to access the database
      const { error: dbError } = await supabase.from("meals").select("count", { count: "exact", head: true })

      if (dbError && dbError.code !== "42P01") {
        // 42P01 is "relation does not exist" which is fine if table doesn't exist yet
        setTestResult({
          success: false,
          message: "Connected to Supabase, but database access failed",
          details: dbError.message,
        })
        return
      }

      setTestResult({
        success: true,
        message: "Successfully connected to Supabase",
        details: "Environment variables are correctly set and Supabase connection is working.",
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: "An error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
        <CardDescription>Test your connection to Supabase</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            This will test if your Supabase environment variables are correctly set and if your application can connect
            to Supabase.
          </AlertDescription>
        </Alert>

        {testResult && (
          <div className={`p-4 rounded-md ${testResult.success ? "bg-green-50" : "bg-red-50"} mt-4`}>
            <div className="flex items-start space-x-2">
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{testResult.message}</p>
                {testResult.details && <p className="text-sm mt-1">{testResult.details}</p>}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="font-medium mb-2">Environment Variables Status:</h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_URL</p>
              <p className="text-xs mt-1">{process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Not set"}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
              <p className="text-xs mt-1">{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={testConnection} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            "Test Supabase Connection"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
