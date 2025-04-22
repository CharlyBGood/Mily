import type React from "react"
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { Meal } from "@/lib/local-storage"
import { getMealTypeLabel } from "@/lib/utils"

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 700,
    },
  ],
})

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#F5F5F5",
    padding: 20,
    fontFamily: "Inter",
  },
  header: {
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0F766E",
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 15,
    backgroundColor: "#FFF",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #E5E7EB",
  },
  sectionHeader: {
    backgroundColor: "#E6FFFA",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#0F766E",
  },
  mealCard: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
  },
  mealCardLast: {
    padding: 10,
    flexDirection: "row",
  },
  mealImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 10,
    objectFit: "cover",
  },
  mealContent: {
    flex: 1,
  },
  mealType: {
    fontSize: 10,
    color: "#0F766E",
    backgroundColor: "#E6FFFA",
    padding: "2 5",
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 5,
  },
  mealTitle: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 5,
  },
  mealNotes: {
    fontSize: 10,
    color: "#666",
  },
  mealTime: {
    fontSize: 10,
    color: "#666",
    marginTop: 5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    color: "#666",
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 20,
    fontSize: 10,
    color: "#666",
  },
  emptyState: {
    padding: 40,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
  },
})

// Group meals by day
type GroupedMeals = {
  date: string
  displayDate: string
  meals: Meal[]
}[]

interface MealHistoryPDFProps {
  groupedMeals: GroupedMeals
  title?: string
}

// Helper function to convert base64 to URL for PDF
const getImageUrl = (photoUrl: string | undefined): string => {
  if (!photoUrl) return ""

  // If it's already a URL, return it
  if (photoUrl.startsWith("http")) {
    return photoUrl
  }

  // For base64 images, we need to use them as is
  return photoUrl
}

// Calculate how many meals to include per page
const MEALS_PER_PAGE = 5

export const MealHistoryPDF: React.FC<MealHistoryPDFProps> = ({ groupedMeals, title = "Historial de Comidas" }) => {
  // Flatten meals for pagination
  const allMeals = groupedMeals.flatMap((group) =>
    group.meals.map((meal) => ({ ...meal, groupDate: group.date, displayDate: group.displayDate })),
  )

  // Calculate total pages
  const totalPages = Math.ceil(allMeals.length / MEALS_PER_PAGE)

  // Generate current date for the header
  const currentDate = format(new Date(), "d 'de' MMMM, yyyy", { locale: es })

  return (
    <Document>
      {totalPages > 0 ? (
        // Generate pages based on meal count
        Array.from({ length: totalPages }).map((_, pageIndex) => {
          const startIdx = pageIndex * MEALS_PER_PAGE
          const endIdx = Math.min(startIdx + MEALS_PER_PAGE, allMeals.length)
          const pageMeals = allMeals.slice(startIdx, endIdx)

          // Group meals by day for this page
          const pageGroups: Record<string, { displayDate: string; meals: Meal[] }> = {}

          pageMeals.forEach((meal) => {
            if (!pageGroups[meal.groupDate]) {
              pageGroups[meal.groupDate] = {
                displayDate: meal.displayDate,
                meals: [],
              }
            }
            pageGroups[meal.groupDate].meals.push(meal)
          })

          return (
            <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.date}>{currentDate}</Text>
              </View>

              {Object.entries(pageGroups).map(([date, { displayDate, meals }]) => (
                <View key={date} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{displayDate}</Text>
                  </View>

                  {meals.map((meal, mealIndex) => {
                    const isLastMeal = mealIndex === meals.length - 1
                    const mealStyle = isLastMeal ? styles.mealCardLast : styles.mealCard

                    return (
                      <View key={meal.id} style={mealStyle}>
                        {meal.photo_url && (
                          <Image
                            src={getImageUrl(meal.photo_url) || "/placeholder.svg"}
                            style={styles.mealImage}
                            cache={true}
                          />
                        )}

                        <View style={styles.mealContent}>
                          <Text style={styles.mealType}>{getMealTypeLabel(meal.meal_type)}</Text>
                          <Text style={styles.mealTitle}>{meal.description}</Text>
                          {meal.notes && <Text style={styles.mealNotes}>{meal.notes}</Text>}
                          {meal.created_at && (
                            <Text style={styles.mealTime}>
                              {format(parseISO(meal.created_at), "HH:mm", { locale: es })}
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              ))}

              <Text style={styles.pageNumber}>
                Página {pageIndex + 1} de {totalPages}
              </Text>

              <Text style={styles.footer}>Generado con Mily</Text>
            </Page>
          )
        })
      ) : (
        // Empty state
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.date}>{currentDate}</Text>
          </View>

          <View style={[styles.section, styles.emptyState]}>
            <Text style={styles.emptyStateText}>No hay comidas registradas</Text>
          </View>

          <Text style={styles.footer}>Generado con Mily</Text>
        </Page>
      )}
    </Document>
  )
}
