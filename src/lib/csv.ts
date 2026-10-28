/** Builds CSV files that open cleanly in Excel and Google Sheets. */
export type Cell = string | number | boolean | null | undefined;

export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  // Spreadsheet apps run text starting with these characters as a formula, so text from
  // applicants (names, notes) is prefixed with an apostrophe to keep it as plain text.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows to CSV text, with a byte-order mark so Excel reads accents and "–" correctly. */
export function toCsv(rows: Cell[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** A safe file name from a job title, e.g. "Office Administrator" → "office-administrator". */
export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "job"
  );
}
