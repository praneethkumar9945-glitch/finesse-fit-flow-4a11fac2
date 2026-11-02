import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server publishable client for safe public reads (narrow anon SELECT policies).
async function getPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type DietMeal = { meal: string; items: string };

export type DietPlan = {
  id: string;
  name: string;
  goal: string;
  description: string;
  calories_per_day: number;
  meals: DietMeal[];
  image_url: string | null;
};

export const getDietPlans = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await getPublicClient();
  const { data, error } = await supabase
    .from("diet_plans")
    .select("id, name, goal, description, calories_per_day, meals, image_url, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    ...p,
    meals: (p.meals as unknown as DietMeal[]) ?? [],
  })) as DietPlan[];
});

export const saveDietPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ dietPlanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_diet_plans")
      .upsert(
        { user_id: context.userId, diet_plan_id: data.dietPlanId },
        { onConflict: "user_id" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
