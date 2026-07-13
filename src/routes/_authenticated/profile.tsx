import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import { User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleBadge } from "@/components/common/RoleBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().min(2, "Enter your name"),
  phone: z.string().optional(),
  job_title: z.string().optional(),
});

function ProfilePage() {
  const { profile, roles, refresh } = useAuth();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", phone: "", job_title: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        job_title: profile.job_title ?? "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update(values)
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Manage your personal details." icon={<User className="h-5 w-5" />} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-4 text-lg font-semibold">{profile?.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              {roles.map((r) => <RoleBadge key={r} role={r} />)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input {...form.register("full_name")} />
                {form.formState.errors.full_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...form.register("phone")} placeholder="+250 …" />
                </div>
                <div className="space-y-1.5">
                  <Label>Job title</Label>
                  <Input {...form.register("job_title")} placeholder="e.g. Front Desk Agent" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
