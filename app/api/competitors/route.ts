import { NextResponse } from "next/server";
import { readCsv, getField, getProgram } from "../../../lib/readCsv";

const toNum = (v: string) => {
  const n = Number((v || "").replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const selected = (url.searchParams.get("program") || "").trim();
    if (!selected) {
      return NextResponse.json({ error: "program required" }, { status: 400 });
    }

    const rows = readCsv();
    const filtered = rows
      .filter(r => getProgram(r) === selected)
      .map(r => ({
        Program: getProgram(r),
        cip_codes_used: getField(r, "cip_codes_used"),
        Institution: getField(r, "Institution"),
        appPercentile: toNum(getField(r, "app_percentile")),
        admissibilityPercentile: toNum(getField(r, "admissibility_percentile")),
        winPercentile: toNum(getField(r, "win_percentile")),
        overallPercentile: toNum(getField(r, "overall_percentile"))
      }));

    return NextResponse.json(filtered);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
