import { Download, FileSpreadsheet, FileText, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportRows, type ExportColumn } from "@/lib/export";

interface Props<T> {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  disabled?: boolean;
}

/** Reusable Export button shown on every list/report page. */
export function ExportMenu<T>({ filename, title, subtitle, columns, rows, disabled }: Props<T>) {
  const run = (format: "csv" | "xlsx" | "pdf") =>
    exportRows(format, { filename, title, subtitle, columns, rows });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || rows.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("pdf")}>
          <FileText className="mr-2 h-4 w-4" /> PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("xlsx")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel Workbook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("csv")}>
          <TableIcon className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
