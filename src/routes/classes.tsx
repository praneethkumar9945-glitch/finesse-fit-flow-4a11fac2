import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Flame, Gauge, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getClasses, type GymClass } from "@/lib/fitness.functions";
import { bookClass } from "@/lib/member.functions";
import { supabase } from "@/integrations/supabase/client";

const classesQuery = queryOptions({
  queryKey: ["classes"],
  queryFn: () => getClasses(),
});

export const Route = createFileRoute("/classes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(classesQuery),
  head: () => ({
    meta: [
      { title: "Classes — Fitness Pro" },
      {
        name: "description",
        content:
          "Book HIIT, strength, boxing, yoga, spin and dance classes at Fitness Pro. 40+ sessions every week.",
      },
      { property: "og:title", content: "Classes — Fitness Pro" },
      {
        property: "og:description",
        content: "Book HIIT, strength, boxing, yoga, spin and dance classes at Fitness Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassesPage,
});

const SLOTS = ["06:00", "07:30", "10:00", "17:30", "19:00", "20:30"];

function ClassesPage() {
  const { data: classes } = useSuspenseQuery(classesQuery);
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<GymClass | null>(null);

  const categories = ["All", ...Array.from(new Set(classes.map((c) => c.category)))];
  const visible = filter === "All" ? classes : classes.filter((c) => c.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="hero-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Book your next <span className="text-ember-gradient">sweat session</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Reserve a spot in any class up to 7 days ahead. Members get priority booking.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <ClassCard key={c.id} gymClass={c} onBook={() => setSelected(c)} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />

      <BookingDialog gymClass={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ClassCard({ gymClass, onBook }: { gymClass: GymClass; onBook: () => void }) {
  return (
    <div className="card-surface flex flex-col overflow-hidden rounded-2xl">
      <img
        src={gymClass.image_url ?? "/images/hero.jpg"}
        alt={gymClass.name}
        width={1024}
        height={1024}
        loading="lazy"
        className="h-44 w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-primary/15 text-primary">
            {gymClass.category}
          </Badge>
          <span className="text-xs text-muted-foreground">{gymClass.seats} seats</span>
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold">{gymClass.name}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{gymClass.description}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> {gymClass.duration_minutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" /> {gymClass.intensity}
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" /> ~{Math.round(gymClass.duration_minutes * 8)} kcal
          </span>
        </div>
        <Button className="mt-4" onClick={onBook}>
          <CalendarClock className="mr-2 h-4 w-4" /> Book a spot
        </Button>
      </div>
    </div>
  );
}

function BookingDialog({ gymClass, onClose }: { gymClass: GymClass | null; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [date, setDate] = useState("today");
  const [time, setTime] = useState("19:00");

  const book = useMutation({
    mutationFn: async ({ classId, scheduledAt }: { classId: string; scheduledAt: string }) =>
      bookClass({ data: { classId, scheduledAt } }),
    onSuccess: () => {
      toast.success("Class booked! See you there 💪");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Booking failed"),
  });

  if (!gymClass) return null;

  async function handleBook() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      toast.info("Sign in to book a class");
      navigate({ to: "/auth", search: { redirect: "/classes" } });
      return;
    }
    const day = new Date();
    if (date === "tomorrow") day.setDate(day.getDate() + 1);
    const scheduledAt = new Date(`${day.toISOString().slice(0, 10)}T${time}:00`);
    book.mutate({ classId: gymClass.id, scheduledAt: scheduledAt.toISOString() });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book {gymClass.name}</DialogTitle>
          <DialogDescription>
            {gymClass.duration_minutes} minutes · {gymClass.intensity} intensity
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Day</Label>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Time slot</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleBook} disabled={book.isPending}>
            {book.isPending ? "Booking…" : "Confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
