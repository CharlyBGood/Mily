import SupabaseTest from "@/components/supabase-test"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DebugPage() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex items-center">
        <Link href="/">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl font-bold">Mily Debug</h1>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-6">Supabase Connection Test</h2>
          <SupabaseTest />
        </div>
      </main>
    </div>
  )
}
