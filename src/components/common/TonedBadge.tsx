import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Tone = "neutral" | "success" | "warning" | "info" | "destructive" | "primary";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  success: "bg-success/15 text-success border-transparent",
  warning: "bg-warning/20 text-warning border-transparent",
  info: "bg-info/15 text-info border-transparent",
  destructive: "bg-destructive/15 text-destructive border-transparent",
  primary: "bg-primary/12 text-primary border-transparent",
};

/** Generic tone badge for enums where StatusBadge doesn't have a mapping. */
export function TonedBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone | string;
  children: React.ReactNode;
  className?: string;
}) {
  const key = (TONES[tone as Tone] ? tone : "neutral") as Tone;
  return (
    <Badge className={cn("font-medium", TONES[key], className)}>{children}</Badge>
  );
}
