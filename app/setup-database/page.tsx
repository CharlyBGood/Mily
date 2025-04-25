"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Database, Check, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import MilyLogo from "@/components/mily-logo"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

// SQL to create the share_links table
const SHARE_LINKS_TABLE_SQL = `
-- Create share_links table
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    access_code TEXT,
    is_password_protected BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own share links
CREATE POLICY share_links_user_policy ON public.share_links
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policy for public access to active share links (read-only)
CREATE POLICY share_links_public_policy ON public.share_links
    FOR SELECT
    USING (is_active = true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS share_links_user_id_idx ON public.share_links (user_id);
CREATE INDEX IF NOT EXISTS share_links_is_active_idx ON public.share_links (is_active);
`

export default function SetupDatabasePage() {
  const [isCreating, setIsCreating] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleBack = () => {
    router.push("/")
  }

  const handleCreateTable = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // Execute the SQL to create the share_links table
      const { error } = await supabase.rpc("exec_sql", { sql: SHARE_LINKS_TABLE_SQL })

      if (error) {
        console.error("Error creating share_links table:", error)

        // Check if the error is because the RPC function doesn't exist
        if (error.message.includes("function") && error.message.includes("does not exist")) {
          setError(
            "The 'exec_sql' function doesn't exist in your Supabase project. Please create it first or run the SQL manually in the Supabase SQL editor.",
          )
        } else {
          setError(error.message)
        }
        return
      }

      setIsSuccess(true)
      toast({
        title: "Table created successfully",
        description: "The share_links table has been created in your database.",
      })
    } catch (err) {
      console.error("Exception creating share_links table:", err)
      setError("An unexpected error occurred. Please try running the SQL manually in the Supabase SQL editor.")
    } finally {
      setIsCreating(false)
    }
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

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Database Setup
            </CardTitle>
            <CardDescription>Create the necessary database tables for sharing functionality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSuccess ? (
              <Alert variant="default" className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  The share_links table has been successfully created in your database.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <p>
                  To enable the sharing functionality, you need to create the <code>share_links</code> table in your
                  Supabase database.
                </p>
                <p>
                  Click the button below to create the table automatically, or copy the SQL and run it manually in the
                  Supabase SQL editor.
                </p>
                <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60">
                  <pre className="text-xs">{SHARE_LINKS_TABLE_SQL}</pre>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            {!isSuccess && (
              <Button onClick={handleCreateTable} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Table"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
