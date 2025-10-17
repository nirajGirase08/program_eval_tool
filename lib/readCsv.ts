import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export type AnyRow = Record<string, string>;

export function findCsvPath(): string {
  const dir = path.join(process.cwd(), "data");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const csv = files.find(f => f.toLowerCase().endsWith(".csv"));
  if (!csv) throw new Error("No CSV found in /data");
  return path.join(dir, csv);
}

export function readCsv(): AnyRow[] {
  const csvPath = findCsvPath();
  const buf = fs.readFileSync(csvPath);
  const records = parse(buf, {
    bom: true,
    columns: (header: string[]) => header.map(h => h.trim()),
    skip_empty_lines: true,
    trim: true
  }) as AnyRow[];
  return records;
}

export function getField(row: AnyRow, name: string): string {
  const n = name.toLowerCase();
  const key = Object.keys(row).find(k => k.trim().toLowerCase() === n);
  return key ? String(row[key]).trim() : "";
}
export function getProgram(row: AnyRow): string {
  return getField(row, "Program");
}
