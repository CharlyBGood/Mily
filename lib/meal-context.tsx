import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { getUserMeals, saveMeal, deleteMeal } from "./meal-service";
import type { Meal } from "./types";

// Context type
type MealContextType = {
  meals: Meal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addOrUpdateMeal: (meal: Meal) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
};

const MealContext = createContext<MealContextType | undefined>(undefined);

export const MealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // BroadcastChannel para sincronizar entre pestañas
    const bc = new BroadcastChannel("meals");
    bc.onmessage = (event) => {
      if (event.data === "refresh") refresh();
    };
    return () => bc.close();
  }, [refresh]);

  const addOrUpdateMeal = async (meal: Meal) => {
    await saveMeal(meal);
    await refresh();
    new BroadcastChannel("meals").postMessage("refresh");
  };

  const removeMeal = async (id: string) => {
    await deleteMeal(id);
    await refresh();
    new BroadcastChannel("meals").postMessage("refresh");
  };

  return (
    <MealContext.Provider value={{ meals, loading, error, refresh, addOrUpdateMeal, removeMeal }}>
      {children}
    </MealContext.Provider>
  );
};

export const useMealContext = () => {
  const ctx = useContext(MealContext);
  if (!ctx) throw new Error("useMealContext must be used within MealProvider");
  return ctx;
};
