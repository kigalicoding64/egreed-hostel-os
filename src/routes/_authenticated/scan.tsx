import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseQrPayload, QR_KIND_LABEL } from "@/lib/qr";
import { staffDestination } from "@/lib/qr-resolve";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a QR code | EGREED Hospitality" },
      { name: "description", content: "Scan any room, table, equipment, booking or key QR code to open its record." },
      { property: "og:title", content: "Scan a QR code | EGREED Hospitality" },
      { property: "og:description", content: "Point your camera at any EGREED QR code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [manual, setManual] = useState("");

  const handle = (raw: string) => {
    const hit = parseQrPayload(raw);
    if (!hit) return toast.error("That isn't an EGREED code.");
    const dest = staffDestination(hit.kind);
    toast.success(`${QR_KIND_LABEL[hit.kind]} found`);
    navigate({ to: "/q/$kind/$id", params: { kind: hit.kind, id: hit.id } });
    void dest;
  };

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const tick = () => {
          if (stopped) return;
          const c = canvasRef.current!;
          if (v.videoWidth) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const code = jsQR(img.data, img.width, img.height);
            if (code?.data) {
              stopped = true;
              setActive(false);
              handle(code.data);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        toast.error("Camera not available. Allow camera access or type the code below.");
        setActive(false);
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="space-y-6">
      <PageHeader title="Scan" description="Scan any room, table, equipment, booking or key code." icon={<ScanLine className="h-5 w-5" />} />
      <Card className="max-w-lg shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            <video ref={videoRef} playsInline muted className={active ? "h-full w-full object-cover" : "hidden"} />
            {!active && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <Camera className="h-10 w-10" />
                <Button onClick={() => setActive(true)}>Start camera</Button>
              </div>
            )}
            {active && <div className="pointer-events-none absolute inset-10 rounded-xl border-2 border-primary" />}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handle(manual);
            }}
          >
            <Input placeholder="Or type a key code / paste a link" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Code" />
            <Button type="submit" variant="secondary">Look up</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
