import { Loader2 } from "lucide-react"

export default function ProfileLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading profile" />
      <span className="sr-only">{"Loading profile…"}</span>
    </div>
  )
}
