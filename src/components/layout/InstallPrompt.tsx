import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "egreed-install-dismissed";

/** Offers "Install EGREED" on phones; shows Share → Add to Home Screen help on iPhone. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || localStorage.getItem(KEY)) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (isIos && mobile) { setIos(true); setShow(true); }
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;
  const dismiss = () => { localStorage.setItem(KEY, "1"); setShow(false); };

  return (
    <div className="glass-strong fixed inset-x-3 bottom-24 z-40 flex items-center gap-3 rounded-2xl border p-3 shadow-lg md:bottom-6 md:left-auto md:right-6 md:w-96">
      <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Install EGREED</p>
        <p className="text-xs text-muted-foreground">
          {ios ? <>Tap <Share className="inline h-3 w-3" /> then “Add to Home Screen”.</> : "Open it from your home screen like an app."}
        </p>
      </div>
      {!ios && evt && (
        <Button size="sm" onClick={async () => { await evt.prompt(); await evt.userChoice; dismiss(); }}>
          <Download className="mr-1 h-4 w-4" />Install
        </Button>
      )}
      <button aria-label="Dismiss install prompt" onClick={dismiss} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
    </div>
  );
}
