import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPlans, type MembershipPlan } from "@/lib/fitness.functions";

const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: () => getPlans(),
});

export const Route = createFileRoute("/membership")({
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  head: () => ({
    meta: [
      { title: "Membership — Fitness Pro" },
      {
        name: "description",
        content:
          "Simple monthly membership plans at Fitness Pro — from ₹999. Gym access, unlimited classes, personal training and more.",
      },
      { property: "og:title", content: "Membership — Fitness Pro" },
      {
        property: "og:description",
        content: "Simple monthly membership plans at Fitness Pro — from ₹999.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  const { data: plans } = useSuspenseQuery(plansQuery);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="hero-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <Badge className="bg-primary/15 text-primary" variant="secondary">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> No joining fee · Cancel anytime
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Pick your <span className="text-ember-gradient">power plan</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Every plan starts with a free trial week. Upgrade, downgrade or pause whenever
            you like.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          <p className="mt-12 text-sm text-muted-foreground">
            Questions? Email <span className="text-foreground">hello@fitnesspro.fit</span> or
            walk in — first tour is free.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanCard({ plan }: { plan: MembershipPlan }) {
  return (
    <div
      className={`card-surface relative flex flex-col rounded-3xl p-8 ${
        plan.highlight ? "glow-ember border-primary/40" : ""
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            <Crown className="mr-1 h-3.5 w-3.5" /> Most popular
          </Badge>
        </div>
      )}
      <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold">₹{plan.price_inr.toLocaleString("en-IN")}</span>
        <span className="text-sm text-muted-foreground">/{plan.period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-8" size="lg" variant={plan.highlight ? "default" : "outline"} asChild>
        <Link to="/auth">Start with {plan.name}</Link>
      </Button>
    </div>
  );
}
