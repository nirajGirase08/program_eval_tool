import { NextResponse } from "next/server";
import { readCsv, getProgram } from "../../../lib/readCsv";

export async function GET() {
  try {
    const rows = readCsv();
    const programs = Array.from(
      new Set(rows.map(r => getProgram(r)).filter(Boolean))
    ).sort();
    return NextResponse.json(programs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
