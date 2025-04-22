"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "./supabase-client"
import { getUserMeals as getLocalMeals } from "./local-storage"
import { v4 as uuidv4 } from "uuid"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function DataMigrationUtility() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "migrating" | "success" | "error">("idle")
  const [stats, setStats] = useState({
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { toast } = useToast()

  const migrateData = async () => {
    setIsLoading(true)
    setStatus("migrating")
    setProgress(0)
    setErrorMessage(null)
    setStats({
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
    })

    try {
      const supabase = getSupabaseClient()

      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setErrorMessage("Debes iniciar sesión para migrar tus datos")
        setStatus("error")
        setIsLoading(false)
        return
      }

      // Get meals from localStorage
      const { success, data: localMeals } = await getLocalMeals()

      if (!success || !localMeals || localMeals.length === 0) {
        setErrorMessage("No se encontraron comidas en el almacenamiento local")
        setStatus("error")
        setIsLoading(false)
        return
      }

      // Create storage bucket if it doesn't exist
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        const mealImagesBucket = buckets?.find((bucket) => bucket.name === "meal-images")

        if (!mealImagesBucket) {
          await supabase.storage.createBucket("meal-images", {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          })
        }
      } catch (error) {
        console.warn("Error checking/creating bucket:", error)
        // Continue anyway, the bucket might already exist
      }

      // Update total count
      setStats((prev) => ({ ...prev, total: localMeals.length }))

      // Process each meal
      for (let i = 0; i < localMeals.length; i++) {
        const meal = localMeals[i]

        try {
          // Check if meal already exists in Supabase (by ID)
          if (meal.id) {
            const { data: existingMeal } = await supabase.from("meals").select("id").eq("id", meal.id).single()

            if (existingMeal) {
              // Skip this meal as it already exists
              setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }))
              setProgress(Math.round(((i + 1) / localMeals.length) * 100))
              continue
            }
          }

          // Process image if present
          let photoUrl = meal.photo_url
          if (photoUrl && photoUrl.startsWith("data:")) {
            // Convert base64 to file
            const res = await fetch(photoUrl)
            const blob = await res.blob()
            const file = new File([blob], `${uuidv4()}.jpg`, { type: "image/jpeg" })

            // Upload to Supabase Storage
            const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "_")}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("meal-images")
              .upload(fileName, file)

            if (uploadError) {
              console.error("Error uploading image:", uploadError)
              throw uploadError
            }

            // Get public URL
            const {
              data: { publicUrl },
            } = supabase.storage.from("meal-images").getPublicUrl(uploadData.path)

            photoUrl = publicUrl
          }

          // Insert meal into Supabase
          const { error: insertError } = await supabase.from("meals").insert([
            {
              id: meal.id || uuidv4(),
              user_id: user.id,
              description: meal.description,
              meal_type: meal.meal_type,
              photo_url: photoUrl,
              notes: meal.notes,
              created_at: meal.created_at || new Date().toISOString(),
            },
          ])

          if (insertError) {
            console.error("Error inserting meal:", insertError)
            throw insertError
          }

          // Update stats
          setStats((prev) => ({ ...prev, migrated: prev.migrated + 1 }))
        } catch (error) {
          console.error("Error migrating meal:", error)
          setStats((prev) => ({ ...prev, failed: prev.failed + 1 }))
        }

        // Update progress
        setProgress(Math.round(((i + 1) / localMeals.length) * 100))
      }

      // Migration complete
      setStatus("success")
      toast({
        title: "Migración completada",
        description: `Se migraron ${stats.migrated} comidas exitosamente`,
      })
    } catch (error) {
      console.error("Migration error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Error desconocido durante la migración")
      setStatus("error")
      toast({
        title: "Error de migración",
        description: "Ocurrió un error durante la migración de datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Migración de Datos</CardTitle>
        <CardDescription>Migra tus comidas del almacenamiento local a la base de datos en la nube</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "migrating" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-neutral-500">Migrando comidas... {progress}%</p>
          </div>
        )}

        {status === "success" && (
          <Alert variant="success" className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Migración completada exitosamente. {stats.migrated} comidas migradas, {stats.skipped} omitidas,{" "}
              {stats.failed} fallidas.
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage || "Ocurrió un error durante la migración"}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm space-y-2">
          <p>Esta herramienta migrará tus comidas guardadas localmente a la base de datos en la nube.</p>
          <p>Beneficios de usar la base de datos en la nube:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acceso a tus datos desde cualquier dispositivo</li>
            <li>No perderás tus datos si borras el caché del navegador</li>
            <li>Mayor capacidad de almacenamiento para fotos</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={migrateData} disabled={isLoading || status === "migrating"} className="w-full">
          {isLoading ? "Migrando..." : "Iniciar Migración"}
        </Button>
      </CardFooter>
    </Card>
  )
}
