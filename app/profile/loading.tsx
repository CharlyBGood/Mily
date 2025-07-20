import { Loader2 } from "lucide-react"

export default function ProfileLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-gray-600">Cargando perfil...</p>
      </div>
    </div>
  )
}
