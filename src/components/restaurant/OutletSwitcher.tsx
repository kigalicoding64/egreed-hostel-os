import { useOutlets } from "@/hooks/use-restaurant";
import { OUTLET_TYPE_LABELS } from "@/lib/restaurant-constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}

/** Reusable outlet picker used by every restaurant screen. */
export function OutletSwitcher({ value, onChange, className }: Props) {
  const { outlets } = useOutlets();
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[220px]"} aria-label="Select outlet">
        <SelectValue placeholder="Select outlet" />
      </SelectTrigger>
      <SelectContent>
        {outlets.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name} · {OUTLET_TYPE_LABELS[o.type] ?? o.type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
