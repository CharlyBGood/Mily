"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseClient } from "./supabase-client";
import type { Meal } from "./types";

// Helper function to upload an image to Supabase Storage
export async function uploadImage(file: File): Promise<string> {
  try {
    const supabase = getSupabaseClient();

    // Generate a unique file name
    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "_")}`;
    if (!supabase) {
      console.error("Supabase storage client is not initialized");
      throw new Error("Supabase storage client is not initialized");
    }
    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from("meal-images")
      .upload(fileName, file);

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    // Get the public URL for the uploaded file
    if (!supabase) {
      throw new Error("Supabase storage client is not initialized");
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("meal-images").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadImage:", error);
    throw error;
  }
}

// Helper function to save a meal to Supabase
export async function saveMeal(
  meal: Meal
): Promise<{ success: boolean; data?: Meal; error?: any }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Supabase client is not initialized" };
    }
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Create new meal with unique ID and timestamp if not provided
    const newMeal: Meal = {
      ...meal,
      id: meal.id || uuidv4(),
      user_id: user.id,
      created_at: meal.created_at || new Date().toISOString(),
    };

    // If updating an existing meal
    if (meal.id) {
      const { data, error } = await supabase
        .from("meals")
        .update({
          description: newMeal.description,
          meal_type: newMeal.meal_type,
          photo_url: newMeal.photo_url,
          notes: newMeal.notes,
          created_at: newMeal.created_at,
        })
        .eq("id", meal.id)
        .eq("user_id", user.id)
        .select();

      if (error) {
        console.error("Error updating meal:", error);
        return { success: false, error };
      }

      return { success: true, data: data[0] as unknown as Meal };
    }

    // Add new meal
    const { data, error } = await supabase
      .from("meals")
      .insert([
        {
          id: newMeal.id,
          user_id: newMeal.user_id,
          description: newMeal.description,
          meal_type: newMeal.meal_type,
          photo_url: newMeal.photo_url,
          notes: newMeal.notes,
          created_at: newMeal.created_at,
        },
      ])
      .select();

    if (error) {
      console.error("Error saving meal:", error);
      return { success: false, error };
    }

    return { success: true, data: data[0] as unknown as Meal };
  } catch (error) {
    console.error("Error in saveMeal:", error);
    return { success: false, error };
  }
}

// Helper function to get all meals for the current user
export async function getUserMeals(): Promise<{
  success: boolean;
  data?: Meal[];
  error?: any;
}> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Supabase client is not initialized" };
    }
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get all meals for the current user, ordered by creation date (newest first)
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data: data as unknown as Meal[] };
  } catch (error) {
    return { success: false, error };
  }
}

// Helper function to get a single meal by ID
export async function getMealById(
  mealId: string
): Promise<{ success: boolean; data?: Meal; error?: any }> {
  try {
    const supabase = getSupabaseClient();

    // Get the current user
    if (!supabase) {
      return { success: false, error: "Supabase client is not initialized" };
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get the meal by ID
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("id", mealId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error getting meal:", error);
      return { success: false, error };
    }

    return { success: true, data: data as unknown as Meal };
  } catch (error) {
    console.error("Error in getMealById:", error);
    return { success: false, error };
  }
}

// Helper function to delete a meal
export async function deleteMeal(
  mealId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Supabase client is not initialized" };
    }
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    if (!supabase) {
      return { success: false, error: "Supabase client is not initialized" };
    }
    // Delete the meal
    const { error } = await supabase
      .from("meals")
      .delete()
      .eq("id", mealId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting meal:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteMeal:", error);
    return { success: false, error };
  }
}

// ---------------------------------------------
// React hook: useMealService
// Provides an easy client-side facade around the
// storage-layer helpers above.
// ---------------------------------------------
export function useMealService() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch / refresh meals
  const refresh = useCallback(async () => {
    setLoading(true);
    const { success, data, error } = await getUserMeals();

    if (success && data) {
      setMeals(data);
      setError(null);
    } else {
      setError(error?.message || "Error al cargar comidas");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const removeMeal = async (id: string) => {
    const { success, error } = await deleteMeal(id);
    if (!success) throw error;
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMeal = async (id: string, updated: Meal) => {
    const { success, error } = await saveMeal({ ...updated, id });
    if (!success) throw error;
    await refresh();
  };

  return { meals, loading, error, deleteMeal: removeMeal, updateMeal, refresh };
}
