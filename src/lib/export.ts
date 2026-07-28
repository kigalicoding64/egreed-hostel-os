/**
 * Shared export engine used across every EGREED module.
 * Provides consistent CSV, Excel and PDF exports with hotel branding
 * so any list/report can call `exportRows(...)` in one line.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportColumn<T> {
  header: string;
  /** Cell value accessor. Return a primitive (string, number, Date). */
  value: (row: T) => string | number | null | undefined | Date;
  /** Optional cell alignment for PDF/Excel. */
  align?: "left" | "right" | "center";
}

export interface ExportOptions<T> {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  brand?: string;
}

function normalize(v: unknown): string | number {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace("T", " ");
  if (typeof v === "number") return v;
  return String(v);
}

function toMatrix<T>(cols: ExportColumn<T>[], rows: T[]): (string | number)[][] {
  return rows.map((r) => cols.map((c) => normalize(c.value(r))));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV<T>(opts: ExportOptions<T>) {
  const headers = opts.columns.map((c) => c.header);
  const rows = toMatrix(opts.columns, opts.rows);
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${opts.filename}.csv`);
}

function exportXLSX<T>(opts: ExportOptions<T>) {
  const headers = opts.columns.map((c) => c.header);
  const data = [headers, ...toMatrix(opts.columns, opts.rows)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = opts.columns.map((c) => ({
    wch: Math.max(c.header.length + 2, 14),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (opts.title ?? "Export").slice(0, 30));
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  download(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${opts.filename}.xlsx`,
  );
}

function exportPDF<T>(opts: ExportOptions<T>) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const brand = opts.brand ?? "EGREED Hospitality Enterprise";

  doc.setFontSize(16);
  doc.setTextColor(20, 84, 90);
  doc.text(brand, 40, 40);

  if (opts.title) {
    doc.setFontSize(13);
    doc.setTextColor(30);
    doc.text(opts.title, 40, 62);
  }
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    [opts.subtitle, `Generated ${new Date().toLocaleString("en-GB")}`]
      .filter(Boolean)
      .join("  •  "),
    40,
    78,
  );

  autoTable(doc, {
    head: [opts.columns.map((c) => c.header)],
    body: toMatrix(opts.columns, opts.rows).map((r) => r.map((c) => String(c ?? ""))),
    startY: 92,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [20, 84, 90], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 249, 250] },
    columnStyles: Object.fromEntries(
      opts.columns.map((c, i) => [i, { halign: c.align ?? "left" }]),
    ),
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() - 60,
        doc.internal.pageSize.getHeight() - 20,
      );
    },
  });

  doc.save(`${opts.filename}.pdf`);
}

/** Single entry-point used by every module. */
export function exportRows<T>(format: ExportFormat, opts: ExportOptions<T>) {
  if (format === "csv") return exportCSV(opts);
  if (format === "xlsx") return exportXLSX(opts);
  return exportPDF(opts);
}
