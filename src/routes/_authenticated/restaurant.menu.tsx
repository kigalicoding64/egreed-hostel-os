import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RmsGuard } from "@/components/restaurant/RmsGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { ExportMenu } from "@/components/common/ExportMenu";
import { OutletSwitcher } from "@/components/restaurant/OutletSwitcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import { formatCurrency } from "@/lib/format";
import { useMenu, useOutlets, useRmsAccess, type MenuItem } from "@/hooks/use-restaurant";

export const Route = createFileRoute("/_authenticated/restaurant/menu")({
  head: () => ({
    meta: [
      { title: "Menu Manager — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Manage restaurant and bar menus: categories, pricing, allergens, prep times, cost margins and availability.",
      },
      { property: "og:title", content: "Menu Manager — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Categories, pricing, allergens and availability in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const rmsAccess = useRmsAccess();
  const { outlet, outletId, select } = useOutlets();
  const { canManageMenu } = useRmsAccess();
  const { data, isLoading } = useMenu(outletId);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = data?.categories ?? [];
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (i) =>
        (category === "all" || i.category_id === category) &&
        (!q || i.name.toLowerCase().includes(q) || (i.sku ?? "").toLowerCase().includes(q)),
    );
  }, [data?.items, search, category]);

  const toggle = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: available })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms-menu"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const currency = outlet?.currency ?? "RWF";

  return (
    <RmsGuard allowed={rmsAccess.canManageMenu} feature="the Menu Manager">
    <div className="space-y-6">
      <PageHeader
        title="Menu Manager"
        description="Every dish and drink, with costing, allergens and live availability."
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename="menu-items"
              title="Menu"
              columns={[
                { header: "Item", value: (i: MenuItem) => i.name },
                {
                  header: "Category",
                  value: (i: MenuItem) =>
                    categories.find((c) => c.id === i.category_id)?.name ?? "—",
                },
                { header: "Price", value: (i: MenuItem) => i.price, align: "right" },
                { header: "Cost", value: (i: MenuItem) => i.cost_price, align: "right" },
                { header: "Prep (min)", value: (i: MenuItem) => i.prep_minutes, align: "right" },
                { header: "Available", value: (i: MenuItem) => (i.is_available ? "Yes" : "No") },
              ]}
              rows={items}
            />
            {canManageMenu && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> Item
              </Button>
            )}
            <OutletSwitcher value={outletId} onChange={select} />
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search items or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No menu items"
          description="Create your first dish or drink to start selling at the POS."
          action={
            canManageMenu ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> New item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => {
            const margin = i.price > 0 ? ((i.price - i.cost_price) / i.price) * 100 : 0;
            return (
              <Card key={i.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categories.find((c) => c.id === i.category_id)?.name ?? "Uncategorised"}
                      {" · "}
                      {i.prep_minutes}m prep
                    </p>
                  </div>
                  <span className="font-semibold">{formatCurrency(i.price, currency)}</span>
                </div>

                {i.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{i.description}</p>
                )}

                <div className="flex flex-wrap gap-1">
                  <TonedBadge tone={margin >= 60 ? "success" : margin >= 35 ? "warning" : "destructive"}>
                    {margin.toFixed(0)}% margin
                  </TonedBadge>
                  {i.is_alcoholic && <TonedBadge tone="primary">Alcohol</TonedBadge>}
                  {i.allergens?.slice(0, 2).map((a) => (
                    <TonedBadge key={a} tone="neutral">
                      {a}
                    </TonedBadge>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={i.is_available}
                      disabled={!canManageMenu}
                      onCheckedChange={(v) => toggle.mutate({ id: i.id, available: v })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {i.is_available ? "Available" : "86'd"}
                    </span>
                  </div>
                  {canManageMenu && (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(i)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ItemDialog
        open={creating || !!editing}
        item={editing}
        categories={categories}
        outletId={outletId}
        hotelId={outlet?.hotel_id ?? null}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </div>
    </RmsGuard>
  );
}

function ItemDialog({
  open,
  item,
  categories,
  outletId,
  hotelId,
  onOpenChange,
}: {
  open: boolean;
  item: MenuItem | null;
  categories: { id: string; name: string }[];
  outletId: string | null;
  hotelId: string | null;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    cost_price: "",
    prep_minutes: "10",
    category_id: "",
    allergens: "",
    is_alcoholic: false,
  });
  const [hydrated, setHydrated] = useState<string | null>(null);

  if (open && hydrated !== (item?.id ?? "new")) {
    setHydrated(item?.id ?? "new");
    setForm({
      name: item?.name ?? "",
      description: item?.description ?? "",
      price: item ? String(item.price) : "",
      cost_price: item ? String(item.cost_price) : "",
      prep_minutes: item ? String(item.prep_minutes) : "10",
      category_id: item?.category_id ?? "",
      allergens: item?.allergens?.join(", ") ?? "",
      is_alcoholic: item?.is_alcoholic ?? false,
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!hotelId) throw new Error("No hotel context");
      const payload = {
        hotel_id: hotelId,
        outlet_id: outletId,
        category_id: form.category_id || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        cost_price: Number(form.cost_price) || 0,
        prep_minutes: Number(form.prep_minutes) || 0,
        allergens: form.allergens
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        is_alcoholic: form.is_alcoholic,
        age_restricted: form.is_alcoholic,
      };
      const res = item
        ? await supabase.from("menu_items").update(payload).eq("id", item.id)
        : await supabase.from("menu_items").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-menu"] });
      toast.success(item ? "Item updated" : "Item created");
      setHydrated(null);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setHydrated(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "New menu item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mname">Name</Label>
            <Input
              id="mname"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mdesc">Description</Label>
            <Textarea
              id="mdesc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mprice">Selling price</Label>
            <Input
              id="mprice"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcost">Cost price</Label>
            <Input
              id="mcost"
              type="number"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mprep">Prep minutes</Label>
            <Input
              id="mprep"
              type="number"
              value={form.prep_minutes}
              onChange={(e) => setForm({ ...form, prep_minutes: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category_id}
              onValueChange={(v) => setForm({ ...form, category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mall">Allergens (comma separated)</Label>
            <Input
              id="mall"
              value={form.allergens}
              onChange={(e) => setForm({ ...form, allergens: e.target.value })}
              placeholder="nuts, dairy"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              checked={form.is_alcoholic}
              onCheckedChange={(v) => setForm({ ...form, is_alcoholic: v })}
            />
            <span className="text-sm">Alcoholic / age restricted</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
