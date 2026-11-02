import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Flame, HeartPulse, Leaf, Salad, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatingOrb, Parallax, ParallaxImage, Reveal } from "@/components/parallax";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDietPlans, saveDietPlan, type DietPlan } from "@/lib/diet.functions";
import { supabase } from "@/integrations/supabase/client";

const dietQuery = queryOptions({
  queryKey: ["diet-plans"],
  queryFn: () => getDietPlans(),
});

export const Route = createFileRoute("/diet")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dietQuery),
  head: () => ({
    meta: [
      { title: "Diet Plans — Fitness Pro" },
      {
        name: "description",
        content:
          "Coach-built nutrition plans for fat loss, muscle gain, endurance and everyday wellness. Pick one and we'll track it in your dashboard.",
      },
      { property: "og:title", content: "Diet Plans — Fitness Pro" },
      {
        property: "og:description",
        content: "Coach-built nutrition plans for every goal — pick yours today.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DietPage,
});

const GOALS = [
  { value: "all", label: "All goals" },
  { value: "weight-loss", label: "Weight loss" },
  { value: "muscle-gain", label: "Muscle gain" },
  { value: "endurance", label: "Endurance" },
  { value: "wellness", label: "Wellness" },
] as const;

const GOAL_ICONS: Record<string, typeof Zap> = {
  "weight-loss": Flame,
  "muscle-gain": Zap,
  endurance: HeartPulse,
  wellness: Leaf,
};

function DietPage() {
  const navigate = useNavigate();
  const { data: plans } = useSuspenseQuery(dietQuery);
  const [goal, setGoal] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = goal === "all" ? plans : plans.filter((p) => p.goal === goal);

  const save = useMutation({
    mutationFn: (dietPlanId: string) => saveDietPlan({ data: { dietPlanId } }),
    onSuccess: () => toast.success("Diet plan saved — see it in your dashboard!"),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save plan"),
    onSettled: () => setSavingId(null),
  });

  async function handleSave(plan: DietPlan) {
    setSavingId(plan.id);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSavingId(null);
      toast.info("Sign in to save a diet plan");
      navigate({ to: "/auth", search: { redirect: "/diet" } });
      return;
    }
    save.mutate(plan.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="hero-surface relative overflow-hidden">
        <FloatingOrb className="-left-24 top-10 h-72 w-72" />
        <FloatingOrb className="-right-20 top-48 h-64 w-64" delay={2} />

        <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Salad className="mr-1.5 h-3.5 w-3.5" /> Eat for your goal
          </Badge>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Training is half of it. <span className="text-ember-gradient">Food is the other half.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Coach-built nutrition plans around real Indian meals — no sad salads, no mystery powders.
            Pick a plan and it syncs straight to your dashboard.
          </p>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  goal === g.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2">
            {visible.map((plan, i) => {
              const Icon = GOAL_ICONS[plan.goal] ?? Zap;
              return (
                <Reveal key={plan.id} delay={(i % 2) * 0.08}>
                  <article className="card-surface group flex h-full flex-col overflow-hidden rounded-3xl">
                    <ParallaxImage
                      src={plan.image_url ?? "/images/hero.jpg"}
                      alt={plan.name}
                      className="h-48 w-full"
                      imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-primary/15 text-primary capitalize">
                          <Icon className="mr-1.5 h-3.5 w-3.5" /> {plan.goal.replace("-", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          <Flame className="mr-1 inline h-3.5 w-3.5 text-primary" />
                          {plan.calories_per_day.toLocaleString("en-IN")} kcal/day
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-xl font-semibold">{plan.name}</h3>
                      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {plan.description}
                      </p>
                      <ul className="mt-4 space-y-2.5 border-t border-border/60 pt-4">
                        {plan.meals.map((m) => (
                          <li key={m.meal} className="flex gap-2.5 text-sm">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>
                              <span className="font-medium text-foreground/90">{m.meal}:</span>{" "}
                              <span className="text-muted-foreground">{m.items}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="mt-6"
                        disabled={savingId === plan.id}
                        onClick={() => handleSave(plan)}
                      >
                        <Salad className="mr-2 h-4 w-4" />
                        {savingId === plan.id ? "Saving…" : "Start this plan"}
                      </Button>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Parallax y={30}>
            <div className="glow-ember rounded-3xl bg-gradient-to-br from-primary/20 via-card to-card p-10 text-center">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Not sure which plan fits?</h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Book a free nutrition consult with any Pro membership — we'll measure, assess and
                build the plan with you.
              </p>
              <Button size="lg" asChild className="mt-6">
                <a href="/membership">See memberships</a>
              </Button>
            </div>
          </Parallax>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
