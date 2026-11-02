import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Dumbbell, Flame, Loader2, Plus, Salad, Timer, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Reveal } from "@/components/parallax";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { addWorkoutLog, cancelBooking, getDashboardData, updateProfileGoal } from "@/lib/member.functions";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardData(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({
    meta: [
      { title: "Dashboard — Fitness Pro" },
      { name: "description", content: "Your bookings, workouts, streaks and diet plan in one place." },
      { property: "og:title", content: "Dashboard — Fitness Pro" },
      { property: "og:description", content: "Your bookings, workouts and diet plan in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const ACTIVITY_TYPES = ["strength", "cardio", "yoga", "boxing", "dance", "other"] as const;

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  const cancel = useMutation({
    mutationFn: (bookingId: string) => cancelBooking({ data: { bookingId } }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not cancel"),
  });

  const weekWorkouts = data.workouts.filter((w) => {
    const d = new Date(w.performed_at);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
    return d >= start;
  });
  const weekCalories = weekWorkouts.reduce((sum, w) => sum + w.calories_burned, 0);
  const weekMinutes = weekWorkouts.reduce((sum, w) => sum + w.duration_minutes, 0);

  // Streak: consecutive days ending today or yesterday with at least one log.
  const days = new Set(data.workouts.map((w) => new Date(w.performed_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="hero-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight">
                Hey{data.profile?.display_name ? `, ${data.profile.display_name}` : ""} — let's go
              </h1>
              <p className="mt-2 text-muted-foreground">
                {data.profile?.goal
                  ? `Your goal: ${data.profile.goal}`
                  : "Set a goal so your coaches can tailor your plan."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setProfileOpen(true)}>
                Edit profile
              </Button>
              <Button onClick={() => setLogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Log workout
              </Button>
            </div>
          </div>

          <Reveal className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              { label: "Workouts this week", value: String(weekWorkouts.length), icon: Dumbbell },
              { label: "Calories this week", value: weekCalories.toLocaleString("en-IN"), icon: Flame },
              { label: "Minutes trained", value: String(weekMinutes), icon: Timer },
              { label: "Day streak", value: String(streak), icon: CalendarDays },
            ].map((s) => (
              <div key={s.label} className="card-surface rounded-2xl p-5">
                <s.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-display text-2xl font-bold">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <section className="card-surface h-full rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold">Upcoming classes</h2>
                {data.bookings.length === 0 ? (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Nothing booked yet.{" "}
                    <Link to="/classes" className="text-primary hover:underline">
                      Browse classes
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-border/60">
                    {data.bookings.map((b) => (
                      <li key={b.id} className="flex items-center gap-4 py-3">
                        {b.gym_class?.image_url && (
                          <img
                            src={b.gym_class.image_url}
                            alt={b.gym_class.name}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{b.gym_class?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(b.scheduled_at).toLocaleString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {b.gym_class?.category}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate(b.id)}
                        >
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>

            <Reveal delay={0.08}>
              <section className="card-surface h-full rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">My diet plan</h2>
                  <Badge variant="secondary" className="bg-primary/15 text-primary">
                    <Salad className="mr-1 h-3.5 w-3.5" /> Nutrition
                  </Badge>
                </div>
                {data.selectedDietPlan ? (
                  <div className="mt-4">
                    <div className="font-display text-lg font-semibold">{data.selectedDietPlan.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {data.selectedDietPlan.calories_per_day.toLocaleString("en-IN")} kcal/day ·{" "}
                      {data.selectedDietPlan.goal.replace("-", " ")}
                    </div>
                    <ul className="mt-4 space-y-2.5">
                      {data.selectedDietPlan.meals.map((m) => (
                        <li key={m.meal} className="text-sm">
                          <span className="font-medium text-primary">{m.meal}:</span>{" "}
                          <span className="text-muted-foreground">{m.items}</span>
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" asChild className="mt-5">
                      <Link to="/diet">
                        <Utensils className="mr-2 h-4 w-4" /> Change plan
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-muted-foreground">
                    You haven't picked a nutrition plan yet.
                    <Button size="sm" asChild className="mt-4">
                      <Link to="/diet">
                        <Salad className="mr-2 h-4 w-4" /> Choose a diet plan
                      </Link>
                    </Button>
                  </div>
                )}
              </section>
            </Reveal>
          </div>

          <Reveal className="mt-10">
            <section className="card-surface rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold">Workout history</h2>
              {data.workouts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No workouts logged yet — hit "Log workout" after your next session.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-border/60">
                  {data.workouts.slice(0, 10).map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">{w.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(w.performed_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          · {w.activity_type}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{w.duration_minutes} min</span> ·{" "}
                        {w.calories_burned} kcal
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Reveal>
        </div>
      </main>
      <SiteFooter />

      <LogWorkoutDialog open={logOpen} onClose={() => setLogOpen(false)} onSaved={invalidate} />
      <EditProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        initialName={data.profile?.display_name ?? ""}
        initialGoal={data.profile?.goal ?? ""}
        onSaved={invalidate}
      />
    </div>
  );
}

function LogWorkoutDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [activityType, setActivityType] = useState<string>("strength");
  const [duration, setDuration] = useState("45");
  const [calories, setCalories] = useState("350");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: () =>
      addWorkoutLog({
        data: {
          title,
          activityType: activityType as (typeof ACTIVITY_TYPES)[number],
          durationMinutes: Number(duration),
          caloriesBurned: Number(calories),
          performedAt: new Date().toISOString(),
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Workout logged 💪");
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a workout</DialogTitle>
          <DialogDescription>Track the session you just crushed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="w-title">Title</Label>
            <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning HIIT" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="w-duration">Minutes</Label>
              <Input id="w-duration" type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="w-calories">Calories burned</Label>
            <Input id="w-calories" type="number" min={0} max={5000} value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="w-notes">Notes (optional)</Label>
            <Textarea id="w-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Felt strong on squats…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim()}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save workout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({
  open,
  onClose,
  initialName,
  initialGoal,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialName: string;
  initialGoal: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [goal, setGoal] = useState(initialGoal);

  const save = useMutation({
    mutationFn: () => updateProfileGoal({ data: { displayName: name, goal: goal || undefined } }),
    onSuccess: () => {
      toast.success("Profile updated");
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Coaches use your goal to tailor your plan.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="p-name">Display name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-goal">Goal</Label>
            <Input id="p-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Lose 5 kg by March" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
