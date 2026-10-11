import QRCode from "qrcode";
import { jsPDF } from "jspdf";

/** Everything in the hotel that can carry an EGREED QR code. */
export type QrKind = "room" | "table" | "asset" | "booking" | "key";

export const QR_KIND_LABEL: Record<QrKind, string> = {
  room: "Room",
  table: "Table",
  asset: "Equipment",
  booking: "Booking",
  key: "Room key",
};

export function appOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/** Public scan link encoded in the QR. Guests land on a helpful page; staff scanners open the record. */
export function qrLink(kind: QrKind, id: string): string {
  return `${appOrigin()}/q/${kind}/${encodeURIComponent(id)}`;
}

/** Parses any EGREED QR payload (full link or bare path). */
export function parseQrPayload(raw: string): { kind: QrKind; id: string } | null {
  const text = raw.trim();
  const m = text.match(/\/q\/(room|table|asset|booking|key)\/([^/?#\s]+)/i);
  if (m) return { kind: m[1].toLowerCase() as QrKind, id: decodeURIComponent(m[2]) };
  if (/^K-[A-Z0-9]{4,}$/i.test(text)) return { kind: "key", id: text.toUpperCase() };
  return null;
}

/** Standard Wi-Fi join payload understood by iPhone and Android cameras. */
export function wifiPayload(ssid: string, password: string): string {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  return password
    ? `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;`
    : `WIFI:T:nopass;S:${esc(ssid)};;`;
}

const QR_OPTS = { errorCorrectionLevel: "M" as const, margin: 1 };

export function qrDataUrl(value: string, size = 512, dark = "#0f2f33"): Promise<string> {
  return QRCode.toDataURL(value, { ...QR_OPTS, width: size, color: { dark, light: "#ffffff" } });
}

export function qrSvg(value: string, dark = "#0f2f33"): Promise<string> {
  return QRCode.toString(value, { ...QR_OPTS, type: "svg", color: { dark, light: "#ffffff" } });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function safeFileName(s: string) {
  return s.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "qr";
}

export async function downloadQrPng(value: string, name: string) {
  triggerDownload(await qrDataUrl(value, 1024), `${safeFileName(name)}.png`);
}

export async function downloadQrSvg(value: string, name: string) {
  const svg = await qrSvg(value);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  triggerDownload(url, `${safeFileName(name)}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface QrCard {
  value: string;
  title: string; // e.g. "Room 102"
  subtitle?: string; // e.g. "Deluxe · Floor 1"
  callToAction: string; // e.g. "Scan for concierge, room service & help"
}

/**
 * Builds a print-ready A4 PDF of branded QR cards (2 × 3 per page, cut lines included).
 */
export async function printQrCards(cards: QrCard[], hotelName: string, filename = "qr-cards") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const cols = 2;
  const rows = 3;
  const margin = 12;
  const cardW = (pageW - margin * 2) / cols;
  const cardH = (pageH - margin * 2) / rows;

  for (let i = 0; i < cards.length; i++) {
    const slot = i % (cols * rows);
    if (i > 0 && slot === 0) doc.addPage();
    const c = cards[i];
    const x = margin + (slot % cols) * cardW;
    const y = margin + Math.floor(slot / cols) * cardH;

    // cut guide
    doc.setDrawColor(210);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(x, y, cardW, cardH);
    doc.setLineDashPattern([], 0);

    // header band
    doc.setFillColor(15, 47, 51);
    doc.rect(x + 4, y + 4, cardW - 8, 12, "F");
    doc.setTextColor(214, 178, 94);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(hotelName.toUpperCase(), x + cardW / 2, y + 11.5, { align: "center", maxWidth: cardW - 14 });

    // QR
    const qrSize = Math.min(cardW - 30, cardH - 48);
    const img = await qrDataUrl(c.value, 600);
    doc.addImage(img, "PNG", x + (cardW - qrSize) / 2, y + 20, qrSize, qrSize);

    // labels
    doc.setTextColor(15, 47, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(c.title, x + cardW / 2, y + 26 + qrSize, { align: "center", maxWidth: cardW - 10 });
    let ty = y + 31 + qrSize;
    if (c.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100);
      doc.text(c.subtitle, x + cardW / 2, ty, { align: "center", maxWidth: cardW - 10 });
      ty += 4.5;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60);
    doc.text(c.callToAction, x + cardW / 2, ty, { align: "center", maxWidth: cardW - 12 });
  }

  doc.save(`${safeFileName(filename)}.pdf`);
}
