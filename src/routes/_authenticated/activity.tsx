import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/activity")({
  component: ActivityPage,
});

interface Log {
  id: string;
  action: string;
  entity: string | null;
  created_at: string;
}

function ActivityPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id,action,entity,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Log[];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of key actions across the system."
        icon={<ScrollText className="h-5 w-5" />}
      />
      <Card className="shadow-card">
        <CardContent className="p-6">
          {isLoading ? (
            <TableSkeleton />
          ) : data.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No activity recorded yet"
              description="Important system actions will be tracked here for compliance and review."
            />
          ) : (
            <div className="space-y-3">
              {data.map((log) => (
                <div key={log.id} className="flex items-center gap-3 border-b border-border/60 pb-3 last:border-0">
                  <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                  {log.entity && <span className="text-sm text-muted-foreground">{log.entity}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
