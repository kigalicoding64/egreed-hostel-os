import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Trash2, LogIn, ShieldCheck, LoaderCircle, CircleHelp } from "lucide-react";
import { simulateWhatsApp } from "@/lib/whatsapp.functions";
import { hasStaffAccess, safeChatText } from "@/lib/whatsapp-access";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { AccessGuard } from "@/components/common/AccessGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [
    { title: "WhatsApp Staff Console — EGREED Hospitality" },
    { name: "description", content: "Account-secured staff command console for hotel operations on WhatsApp." },
    { property: "og:title", content: "WhatsApp Staff Console — EGREED Hospitality" },
    { property: "og:description", content: "Staff messages for rooms, cleaning, kitchen orders and inventory." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: WhatsAppPage,
});

type ChatMessage = { id: number; incoming: boolean; text: string; failed?: boolean };

function WhatsAppPage() {
  const { user, profile, roles, loading } = useAuth();
  return <AccessGuard allowed={!loading && hasStaffAccess(roles)} feature="staff WhatsApp">
    <div className="mb-6 flex items-center gap-3">
      <MessageCircle className="h-7 w-7 text-primary" />
      <h1 className="text-2xl font-semibold">WhatsApp</h1>
      <span className="ml-auto text-xs font-medium text-muted-foreground">Staff console</span>
    </div>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <TestPhone key={user?.id} />
      <aside className="space-y-6 py-2">
        <section className="border-b pb-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Account</h2>
          <p className="font-medium">{profile?.full_name ?? "Staff"}</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{user?.email}</p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{roles.map((role) => <li key={role}>{ROLE_LABELS[role]}</li>)}</ul>
        </section>
        <section className="border-b pb-6">
          <h2 className="mb-3 font-semibold">WhatsApp Business</h2>
          <span className="inline-flex items-center gap-2 text-sm text-warning"><span className="h-2 w-2 rounded-full bg-warning" />Setup pending</span>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Channel</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Mode</dt><dd>Test phone</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Data</dt><dd>Live hotel records</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Recipient</dt><dd>No external recipient</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  </AccessGuard>;
}

function TestPhone() {
  const call = useServerFn(simulateWhatsApp);
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const counter = useRef(0);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, busy]);

  async function send(value: string) {
    const input = value.trim();
    if (!input || busy) return;
    setText("");
    setBusy(true);
    setMessages((prev) => [...prev, { id: ++counter.current, incoming: false, text: safeChatText(input) }]);
    try {
      const { reply } = await call({ data: { text: input } });
      setMessages((prev) => [...prev, { id: ++counter.current, incoming: true, text: reply }]);
      if (/^login\b/i.test(input)) setConnected(true);
      if (/^logout$/i.test(input)) setConnected(false);
      await qc.invalidateQueries();
    } catch (error) {
      setMessages((prev) => [...prev, { id: ++counter.current, incoming: true, failed: true, text: error instanceof Error ? error.message : "Message failed. Please try again." }]);
    } finally { setBusy(false); }
  }

  return <section aria-label="Test phone" className="flex h-[660px] max-h-[80dvh] min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border bg-card shadow-card">
    <header className="flex shrink-0 items-center gap-3 border-b bg-primary px-4 py-4 text-primary-foreground">
      <MessageCircle className="h-8 w-8" />
      <div className="min-w-0 flex-1"><h2 className="font-semibold">EGREED Staff</h2><p className="text-xs opacity-80">{connected ? "Account connected" : "Test phone"}</p></div>
      <Button variant="ghost" size="icon" aria-label="Clear conversation" title="Clear conversation" disabled={busy} onClick={() => setMessages([])}><Trash2 /></Button>
    </header>
    <div role="log" aria-label="Conversation" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-muted/50 p-4">
      {messages.length === 0 && <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <MessageCircle className="h-10 w-10 text-primary" />
        <p className="font-medium">Staff access</p>
        <Button disabled={busy} onClick={() => send("LOGIN")}><LogIn />Connect my account</Button>
      </div>}
      {messages.map((message) => <div key={message.id} className={cn("flex", !message.incoming && "justify-end")}>
        <div className={cn("max-w-[92%] whitespace-pre-wrap break-words rounded-md px-3 py-2.5 text-sm leading-relaxed", message.incoming ? "border bg-card text-card-foreground" : "bg-accent text-accent-foreground", message.failed && "border-destructive text-destructive")}>
          {message.text}
        </div>
      </div>)}
      {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />Replying…</div>}
      <div ref={bottom} />
    </div>
    <footer className="shrink-0 border-t p-3">
      <div className="mb-2 flex gap-2">
        <Button variant="outline" size="sm" disabled={busy || !connected} onClick={() => send("HELP")}><CircleHelp />Commands</Button>
        <Button variant="ghost" size="sm" disabled={busy || !connected} onClick={() => send("WHOAMI")}><ShieldCheck />My access</Button>
      </div>
      <form className="flex min-w-0 gap-2" onSubmit={(event) => { event.preventDefault(); void send(text); }}>
        <Input aria-label="Message" placeholder="Message" maxLength={1000} disabled={busy || !connected} value={text} onChange={(event) => setText(event.target.value)} className="min-w-0 flex-1" />
        <Button type="submit" size="icon" aria-label="Send message" title="Send message" disabled={busy || !connected || !text.trim()}><Send /></Button>
      </form>
    </footer>
  </section>;
}