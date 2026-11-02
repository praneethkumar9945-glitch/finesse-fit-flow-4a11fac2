import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { motion } from "motion/react";
import { Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Fitness Pro" },
      {
        name: "description",
        content: "Sign in or create your Fitness Pro account to book classes and track progress.",
      },
      { property: "og:title", content: "Sign in — Fitness Pro" },
      { property: "og:description", content: "Sign in or create your Fitness Pro account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

// Only allow same-origin relative paths as post-auth destinations.
function sanitizeRedirect(value?: string): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

const OAUTH_REDIRECT_KEY = "fp-oauth-redirect";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = sanitizeRedirect(redirect);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  // Finish OAuth flows that return tokens silently, and honour the saved
  // destination after a full-page provider round-trip.
  useEffect(() => {
    let active = true;
    async function checkReturn() {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      const saved = sessionStorage.getItem(OAUTH_REDIRECT_KEY);
      sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
      navigate({ to: saved && saved.startsWith("/") && !saved.startsWith("//") ? saved : target, replace: true });
    }
    checkReturn();
    return () => {
      active = false;
    };
  }, [navigate, target]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
            data: { full_name: fullName || undefined },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirm(true);
          return;
        }
        navigate({ to: target, replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target, replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "lovable") {
    sessionStorage.setItem(OAUTH_REDIRECT_KEY, target);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
      toast.error(result.error.message || "Sign-in failed");
      return;
    }
    if (result.redirected) return; // Browser is heading to the provider.
    navigate({ to: target, replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="hero-surface flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-14">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="card-surface w-full max-w-md rounded-3xl p-8"
        >
          {awaitingConfirm ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Flame className="h-6 w-6" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-bold">Check your inbox</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{email}</span>.
                Click it to activate your account, then sign in.
              </p>
              <Button variant="outline" className="mt-6 w-full" onClick={() => setAwaitingConfirm(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">
                {mode === "signin" ? "Welcome back" : "Start your journey"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to book classes and track your progress."
                  : "Create a free account — your first class is on us."}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
                {mode === "signup" && (
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Priya Sharma"
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
                <Button type="submit" disabled={busy} className="mt-1 w-full">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or continue with
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-2.5">
                <Button variant="outline" type="button" onClick={() => handleOAuth("google")}>
                  Continue with Google
                </Button>
                <Button variant="outline" type="button" onClick={() => handleOAuth("lovable")}>
                  Continue with Lovable
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to Fitness Pro?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-primary hover:underline"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Just browsing?{" "}
                <Link to="/" className="hover:text-foreground">
                  Back to home
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </main>
      <SiteFooter />
    </div>
  );
}
