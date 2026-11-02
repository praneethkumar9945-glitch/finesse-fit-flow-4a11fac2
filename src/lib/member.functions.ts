import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Booking = {
  id: string;
  class_id: string;
  scheduled_at: string;
  status: string;
  gym_class: { name: string; category: string; duration_minutes: number; intensity: string; image_url: string | null };
};

export type WorkoutLog = {
  id: string;
  title: string;
  activity_type: string;
  duration_minutes: number;
  calories_burned: number;
  performed_at: string;
  notes: string | null;
};

export type Profile = {
  display_name: string | null;
  goal: string | null;
};

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, bookingsRes, workoutsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, goal").eq("id", userId).maybeSingle(),
      supabase
        .from("bookings")
        .select(
          "id, class_id, scheduled_at, status, gym_class:classes(name, category, duration_minutes, intensity, image_url)"
        )
        .eq("user_id", userId)
        .in("status", ["confirmed"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("workout_logs")
        .select("id, title, activity_type, duration_minutes, calories_burned, performed_at, notes")
        .eq("user_id", userId)
        .order("performed_at", { ascending: false }),
    ]);

    if (bookingsRes.error) throw new Error(bookingsRes.error.message);
    if (workoutsRes.error) throw new Error(workoutsRes.error.message);

    return {
      profile: (profileRes.data ?? null) as Profile | null,
      bookings: (bookingsRes.data ?? []) as unknown as Booking[],
      workouts: (workoutsRes.data ?? []) as unknown as WorkoutLog[],
    };
  });

export const bookClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        classId: z.string().uuid(),
        scheduledAt: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("bookings").insert({
      user_id: userId,
      class_id: data.classId,
      scheduled_at: data.scheduledAt,
    });
    if (error) {
      if (error.code === "23505") throw new Error("You already booked this slot");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.bookingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addWorkoutLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(1).max(80),
        activityType: z.enum(["strength", "cardio", "yoga", "boxing", "dance", "other"]),
        durationMinutes: z.number().int().min(1).max(600),
        caloriesBurned: z.number().int().min(0).max(5000),
        performedAt: z.string(),
        notes: z.string().max(500).optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("workout_logs").insert({
      user_id: context.userId,
      title: data.title,
      activity_type: data.activityType,
      duration_minutes: data.durationMinutes,
      calories_burned: data.caloriesBurned,
      performed_at: data.performedAt,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProfileGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        displayName: z.string().min(1).max(60),
        goal: z.string().max(120).optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName, goal: data.goal ?? null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
