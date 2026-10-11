import { useEffect, useState } from "react";
import { Download, FileImage, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadQrPng, downloadQrSvg, printQrCards, qrDataUrl, type QrCard } from "@/lib/qr";

export function QrImage({ value, size = 160, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void qrDataUrl(value, size * 2).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [value, size]);
  return src ? (
    <img src={src} alt="QR code" width={size} height={size} className={className} />
  ) : (
    <div style={{ width: size, height: size }} className={`animate-pulse rounded bg-muted ${className ?? ""}`} />
  );
}

export function QrDownloadButtons({ card, hotelName, compact }: { card: QrCard; hotelName: string; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="outline" onClick={() => void downloadQrPng(card.value, card.title)}>
        <FileImage className="mr-1 h-3.5 w-3.5" /> PNG
      </Button>
      <Button size="sm" variant="outline" onClick={() => void downloadQrSvg(card.value, card.title)}>
        <Download className="mr-1 h-3.5 w-3.5" /> SVG
      </Button>
      <Button size="sm" variant={compact ? "outline" : "default"} onClick={() => void printQrCards([card], hotelName, card.title)}>
        <Printer className="mr-1 h-3.5 w-3.5" /> Print card
      </Button>
    </div>
  );
}

/** Pop-up showing one QR with downloads — used on bookings, keys and records. */
export function QrDialog({
  open,
  onOpenChange,
  card,
  hotelName = "EGREED Hospitality",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card: QrCard | null;
  hotelName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {card && (
          <>
            <DialogHeader>
              <DialogTitle>{card.title}</DialogTitle>
              <DialogDescription>{card.callToAction}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-background p-3">
                <QrImage value={card.value} size={220} />
              </div>
              {card.subtitle && <p className="text-center text-sm text-muted-foreground">{card.subtitle}</p>}
              <QrDownloadButtons card={card} hotelName={hotelName} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
