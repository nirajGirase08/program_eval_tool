
"use client";
import { useState } from "react";
import ProgramSelector from "./ProgramSelector";
import CompetitorTable, { Row } from "./CompetitorTable";
export default function InternalCsvView() {
  const [program, setProgram] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function load(p: string) {
    setLoading(true);
    setErr(null);
    setRows(null);
    try {
      const r = await fetch(
        `/api/competitors?program=${encodeURIComponent(p)}`
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to load data");
      setProgram(p);
      setRows(data);
    } catch (e: any) {
      setErr(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #d1d5db",
        borderRadius: 6,
        padding: 16,
      }}
    >
      {/* Section header */}
      <header style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 4,
          }}
        >
          Internal CSV Data Analysis
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: "#6b7280",
          }}
        >
          
        </div>
      </header>
      {/* Program picker block */}
      <section
        style={{
          borderTop: "1px solid #e5e7eb",
          paddingTop: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 12,
          }}
        >
      
        </div>
        {/* ProgramSelector handles the dropdown + "View Competitors" button.
            We call load() when user clicks the button. */}
        <ProgramSelector onSelect={load} />
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
  
        </div>
      </section>
      {/* Status states */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#6b7280",
            marginTop: 16,
          }}
        >
          Loading…
        </div>
      )}
      {err && (
        <div
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#dc2626",
            marginTop: 16,
          }}
        >
          Error: {err}
        </div>
      )}
      {/* Competitor table */}
      {rows && (
        <section
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: 16,
          }}
        >
          {/* We DO NOT render our own "Top Competitors — X" header here.
              CompetitorTable already renders:
              - title "Top Competitors — {program}"
              - search box / Export CSV / + Add Competitor
              - the table itself
          */}
          {/* Horizontal scroll wrapper so right columns & trash icon never get cut off */}
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
            }}
          >
            <CompetitorTable program={program} rows={rows} />
          </div>
        </section>
      )}
    </div>
  );
}
