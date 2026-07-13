import { useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Hotel, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Minimum 6 characters"),
});
const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Enter your full name"),
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [googleLoading, setGoogleLoading] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const onSignup = async (values: z.infer<typeof signupSchema>) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: values.fullName },
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created");
    navigate({ to: "/dashboard" });
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Hotel className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">EGREED</p>
            <p className="text-xs text-sidebar-foreground/60">Hospitality Enterprise</p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            The modern operating system for hospitality.
          </h1>
          <p className="text-sidebar-foreground/70">
            Reservations, front desk, housekeeping, finance and analytics — one
            secure platform, built for African hotels and ready to scale across
            properties.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} EGREED Hospitality Enterprise
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-5 w-5" />
            </div>
            <span className="font-semibold">EGREED</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your hotel management workspace.
          </p>

          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={onGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 pt-4">
                <Field
                  label="Email"
                  type="email"
                  placeholder="you@hotel.rw"
                  {...loginForm.register("email")}
                  error={loginForm.formState.errors.email?.message}
                />
                <Field
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  {...loginForm.register("password")}
                  error={loginForm.formState.errors.password?.message}
                />
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4 pt-4">
                <Field
                  label="Full name"
                  placeholder="Jane Doe"
                  {...signupForm.register("fullName")}
                  error={signupForm.formState.errors.fullName?.message}
                />
                <Field
                  label="Email"
                  type="email"
                  placeholder="you@hotel.rw"
                  {...signupForm.register("email")}
                  error={signupForm.formState.errors.email?.message}
                />
                <Field
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  {...signupForm.register("password")}
                  error={signupForm.formState.errors.password?.message}
                />
                <Button type="submit" className="w-full" disabled={signupForm.formState.isSubmitting}>
                  {signupForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create account
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  The first account created becomes the Super Administrator.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

const Field = ({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input {...props} />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}
