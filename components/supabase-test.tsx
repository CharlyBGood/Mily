"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase-client"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TestStatus = "idle" | "loading" | "success" | "error"

interface TestResult {
  status: TestStatus
  message: string
  details?: string
}

export default function SupabaseTest() {
  const [envStatus, setEnvStatus] = useState<TestResult>({
    status: "idle",
    message: "Not tested yet",
  })
  const [connectionStatus, setConnectionStatus] = useState<TestResult>({
    status: "idle",
    message: "Not tested yet",
  })
  const [authStatus, setAuthStatus] = useState<TestResult>({
    status: "idle",
    message: "Not tested yet",
  })
  const [dbStatus, setDbStatus] = useState<TestResult>({
    status: "idle",
    message: "Not tested yet",
  })
  const [storageStatus, setStorageStatus] = useState<TestResult>({
    status: "idle",
    message: "Not tested yet",
  })

  // Check environment variables on component mount
  useEffect(() => {
    checkEnvironmentVariables()
  }, [])

  const checkEnvironmentVariables = () => {
    setEnvStatus({ status: "loading", message: "Checking environment variables..." })

    const supabaseUrl = process.env.NEXT_PUBLIC__SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC__SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      setEnvStatus({
        status: "error",
        message: "SUPABASE_URL is missing",
        details: "The Supabase URL environment variable is not set.",
      })
      return
    }

    if (!supabaseAnonKey) {
      setEnvStatus({
        status: "error",
        message: "SUPABASE_ANON_KEY is missing",
        details: "The Supabase anonymous key environment variable is not set.",
      })
      return
    }

    // Check if URL is valid
    try {
      new URL(supabaseUrl)
    } catch (e) {
      setEnvStatus({
        status: "error",
        message: "SUPABASE_URL is invalid",
        details: `The provided URL "${supabaseUrl}" is not a valid URL.`,
      })
      return
    }

    setEnvStatus({
      status: "success",
      message: "Environment variables are set correctly",
      details: `URL: ${supabaseUrl.substring(0, 15)}...`,
    })
  }

  const testConnection = async () => {
    setConnectionStatus({ status: "loading", message: "Testing connection..." })

    try {
      const supabase = getSupabaseClient()

      // Simple health check
      const { error } = await supabase.from("meals").select("count", { count: "exact", head: true })

      if (error) {
        setConnectionStatus({
          status: "error",
          message: "Connection failed",
          details: `Error: ${error.message}`,
        })
        return
      }

      setConnectionStatus({
        status: "success",
        message: "Connection successful",
        details: "Successfully connected to Supabase.",
      })
    } catch (err) {
      setConnectionStatus({
        status: "error",
        message: "Connection failed",
        details: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      })
    }
  }

  const testAuth = async () => {
    setAuthStatus({ status: "loading", message: "Testing authentication..." })

    try {
      const supabase = getSupabaseClient()

      // Check if auth is configured by getting the current session
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setAuthStatus({
          status: "error",
          message: "Authentication check failed",
          details: `Error: ${error.message}`,
        })
        return
      }

      setAuthStatus({
        status: "success",
        message: "Authentication is configured correctly",
        details: data.session ? "User is logged in" : "No active session (expected if not logged in)",
      })
    } catch (err) {
      setAuthStatus({
        status: "error",
        message: "Authentication check failed",
        details: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      })
    }
  }

  const testDatabase = async () => {
    setDbStatus({ status: "loading", message: "Testing database..." })

    try {
      const supabase = getSupabaseClient()

      // Check if the meals table exists
      const { data, error } = await supabase.from("meals").select("id").limit(1)

      if (error) {
        setDbStatus({
          status: "error",
          message: "Database check failed",
          details: `Error: ${error.message}`,
        })
        return
      }

      setDbStatus({
        status: "success",
        message: "Database is configured correctly",
        details: `Successfully queried the meals table. ${data.length ? "Found records." : "No records found (this is OK)."}`,
      })
    } catch (err) {
      setDbStatus({
        status: "error",
        message: "Database check failed",
        details: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      })
    }
  }

  const testStorage = async () => {
    setStorageStatus({ status: "loading", message: "Testing storage..." })

    try {
      const supabase = getSupabaseClient()

      // Check if the meal-images bucket exists
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        setStorageStatus({
          status: "error",
          message: "Storage check failed",
          details: `Error: ${error.message}`,
        })
        return
      }

      const mealImagesBucket = data.find((bucket) => bucket.name === "meal-images")

      if (!mealImagesBucket) {
        setStorageStatus({
          status: "error",
          message: "meal-images bucket not found",
          details: "The meal-images bucket does not exist. You may need to create it.",
        })
        return
      }

      setStorageStatus({
        status: "success",
        message: "Storage is configured correctly",
        details: "Successfully found the meal-images bucket.",
      })
    } catch (err) {
      setStorageStatus({
        status: "error",
        message: "Storage check failed",
        details: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      })
    }
  }

  const runAllTests = async () => {
    checkEnvironmentVariables()
    await testConnection()
    await testAuth()
    await testDatabase()
    await testStorage()
  }

  const renderStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "loading":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const renderTestResult = (result: TestResult) => {
    return (
      <div className="flex items-start space-x-2">
        <div className="mt-0.5">{renderStatusIcon(result.status)}</div>
        <div>
          <p className="font-medium">{result.message}</p>
          {result.details && <p className="text-sm text-gray-500">{result.details}</p>}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Supabase Integration Test</CardTitle>
        <CardDescription>Test your Supabase integration to ensure everything is working correctly</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tests">
          <TabsList className="mb-4">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Environment Variables</h3>
                {renderTestResult(envStatus)}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Connection</h3>
                {renderTestResult(connectionStatus)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={connectionStatus.status === "loading"}
                >
                  {connectionStatus.status === "loading" ? "Testing..." : "Test Connection"}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Authentication</h3>
                {renderTestResult(authStatus)}
                <Button variant="outline" size="sm" onClick={testAuth} disabled={authStatus.status === "loading"}>
                  {authStatus.status === "loading" ? "Testing..." : "Test Authentication"}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Database</h3>
                {renderTestResult(dbStatus)}
                <Button variant="outline" size="sm" onClick={testDatabase} disabled={dbStatus.status === "loading"}>
                  {dbStatus.status === "loading" ? "Testing..." : "Test Database"}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Storage</h3>
                {renderTestResult(storageStatus)}
                <Button variant="outline" size="sm" onClick={testStorage} disabled={storageStatus.status === "loading"}>
                  {storageStatus.status === "loading" ? "Testing..." : "Test Storage"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="environment">
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  For security reasons, we only show if environment variables are set, not their actual values.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">NEXT_PUBLIC_SUPABASE_URL</h3>
                  <p className="text-sm">{process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Not set"}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">NEXT_PUBLIC_SUPABASE_ANON_KEY</h3>
                  <p className="text-sm">{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">NEXT_PUBLIC__SUPABASE_URL</h3>
                  <p className="text-sm">{process.env.NEXT_PUBLIC__SUPABASE_URL ? "✅ Set" : "❌ Not set"}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">NEXT_PUBLIC__SUPABASE_ANON_KEY</h3>
                  <p className="text-sm">{process.env.NEXT_PUBLIC__SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button onClick={runAllTests} className="w-full">
          Run All Tests
        </Button>
      </CardFooter>
    </Card>
  )
}
