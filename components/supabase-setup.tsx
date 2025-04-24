"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase-client"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"

export default function SupabaseSetup() {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupStatus, setSetupStatus] = useState<{
    bucket: { status: string; message: string }
    schema: { status: string; message: string }
  }>({
    bucket: { status: "idle", message: "" },
    schema: { status: "idle", message: "" },
  })

  const setupSupabase = async () => {
    setIsSettingUp(true)

    // Reset status
    setSetupStatus({
      bucket: { status: "pending", message: "Creating storage bucket..." },
      schema: { status: "pending", message: "Setting up database schema..." },
    })

    try {
      const supabase = getSupabaseClient()

      // 1. Create storage bucket if it doesn't exist
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        const mealImagesBucket = buckets?.find((bucket) => bucket.name === "meal-images")

        if (!mealImagesBucket) {
          const { error } = await supabase.storage.createBucket("meal-images", {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          })

          if (error) {
            setSetupStatus((prev) => ({
              ...prev,
              bucket: { status: "error", message: `Failed to create bucket: ${error.message}` },
            }))
          } else {
            setSetupStatus((prev) => ({
              ...prev,
              bucket: { status: "success", message: "Storage bucket created successfully" },
            }))
          }
        } else {
          setSetupStatus((prev) => ({
            ...prev,
            bucket: { status: "success", message: "Storage bucket already exists" },
          }))
        }
      } catch (error) {
        setSetupStatus((prev) => ({
          ...prev,
          bucket: {
            status: "error",
            message: `Error checking/creating bucket: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        }))
      }

      // 2. Create database schema if it doesn't exist
      try {
        // Check if meals table exists by trying to select from it
        const { error: checkError } = await supabase.from("meals").select("id").limit(1)

        if (checkError && checkError.code === "42P01") {
          // Table doesn't exist
          // Create the meals table
          const { error: createError } = await supabase.rpc("create_meals_table")

          if (createError) {
            // Try alternative approach - create the table directly
            const { error: directError } = await supabase.rpc("setup_schema")

            if (directError) {
              setSetupStatus((prev) => ({
                ...prev,
                schema: {
                  status: "error",
                  message: `Failed to create schema: ${directError.message}. You may need to set up the database schema manually.`,
                },
              }))
            } else {
              setSetupStatus((prev) => ({
                ...prev,
                schema: { status: "success", message: "Database schema created successfully" },
              }))
            }
          } else {
            setSetupStatus((prev) => ({
              ...prev,
              schema: { status: "success", message: "Database schema created successfully" },
            }))
          }
        } else if (checkError) {
          setSetupStatus((prev) => ({
            ...prev,
            schema: {
              status: "error",
              message: `Error checking table: ${checkError.message}`,
            },
          }))
        } else {
          setSetupStatus((prev) => ({
            ...prev,
            schema: { status: "success", message: "Database schema already exists" },
          }))
        }
      } catch (error) {
        setSetupStatus((prev) => ({
          ...prev,
          schema: {
            status: "error",
            message: `Error setting up schema: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        }))
      }
    } catch (error) {
      console.error("Setup error:", error)
    } finally {
      setIsSettingUp(false)
    }
  }

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "pending":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Supabase Setup</CardTitle>
        <CardDescription>Set up required Supabase resources for your application</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            This will attempt to create the necessary storage bucket and database schema for your application. You need
            to have the appropriate permissions in your Supabase project.
          </AlertDescription>
        </Alert>

        {(setupStatus.bucket.status !== "idle" || setupStatus.schema.status !== "idle") && (
          <div className="space-y-4 mt-4">
            <div className="flex items-start space-x-2">
              {renderStatusIcon(setupStatus.bucket.status)}
              <div>
                <p className="font-medium">Storage Bucket</p>
                <p className="text-sm text-gray-500">{setupStatus.bucket.message}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              {renderStatusIcon(setupStatus.schema.status)}
              <div>
                <p className="font-medium">Database Schema</p>
                <p className="text-sm text-gray-500">{setupStatus.schema.message}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={setupSupabase} disabled={isSettingUp} className="w-full">
          {isSettingUp ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting Up...
            </>
          ) : (
            "Set Up Supabase Resources"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
