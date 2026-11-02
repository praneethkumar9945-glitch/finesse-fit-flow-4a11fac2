import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

export type GymClass = {
  id: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  intensity: string;
  image_url: string | null;
  seats: number;
};

export type MembershipPlan = {
  id: string;
  name: string;
  tagline: string;
  price_inr: number;
  period: string;
  features: string[];
  highlight: boolean;
};

export const getClasses = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await getPublicClient();
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id, name, category, description, duration_minutes, intensity, image_url, seats, sort_order"
    )
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as GymClass[];
});

export const getPlans = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await getPublicClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .select("id, name, tagline, price_inr, period, features, highlight, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    ...p,
    features: (p.features as unknown as string[]) ?? [],
  })) as MembershipPlan[];
});
