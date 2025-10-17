"use client";
import { useMemo, useState } from "react";

export type Row = {
  Program: string;
  cip_codes_used: string;
  Institution: string;
  appPercentile: number;
  admissibilityPercentile: number;
  winPercentile: number;
  overallPercentile: number;
};

type SortKey = keyof Pick<
  Row,
  | "Institution"
  | "Program"
  | "cip_codes_used"
  | "appPercentile"
  | "admissibilityPercentile"
  | "winPercentile"
  | "overallPercentile"
>;
type Dir = "asc" | "desc";

export default function CompetitorTable({
  program,
  rows: initial,
}: {
  program: string;
  rows: Row[];
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>(initial);
  const [sortKey, setSortKey] = useState<SortKey>("appPercentile");
  const [dir, setDir] = useState<Dir>("desc");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let r = rows.filter(
      (x) =>
        x.Institution.toLowerCase().includes(q) ||
        x.Program.toLowerCase().includes(q) ||
        x.cip_codes_used.toLowerCase().includes(q)
    );
    r = r.sort((a, b) => {
      const A = a[sortKey];
      const B = b[sortKey];
      if (typeof A === "number" && typeof B === "number") {
        return dir === "asc" ? A - B : B - A;
      }
      return dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return r;
  }, [rows, query, sortKey, dir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir("desc");
    }
  };

  const winClass = (v: number) =>
    v >= 75 ? "win-high" : v >= 60 ? "win-mid" : "win-low";

  const addRow = () => {
    const inst = prompt("Institution name?");
    if (!inst) return;
    setRows((prev) => [
      {
        Institution: inst,
        Program: program,
        cip_codes_used: "",
        appPercentile: 0,
        admissibilityPercentile: 0,
        winPercentile: 0,
        overallPercentile: 0,
      },
      ...prev,
    ]);
  };

  const confirmDelete = (i: number) => {
    const item = filtered[i];
    const idx = rows.indexOf(item);
    if (window.confirm(`Delete "${item.Institution}" from the current view?`)) {
      setRows((prev) => prev.filter((_, j) => j !== idx));
    }
  };

  const exportCsv = () => {
    const header = [
      "Institution",
      "Program",
      "cip_codes_used",
      "App Percentile(%)",
      "Admissibility Percentile(%)",
      "Win Rate(%)",
      "Overall Percentile(%)",
    ];
    const lines = [header.join(",")].concat(
      filtered.map((r) =>
        [
          csv(r.Institution),
          csv(r.Program),
          csv(r.cip_codes_used),
          `${r.appPercentile}%`,
          `${r.admissibilityPercentile}%`,
          `${r.winPercentile}%`,
          `${r.overallPercentile}%`,
        ].join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${program.replace(/\s+/g, "_")}_competitors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-head">
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            Top Competitors — {program}
          </h2>
          <div className="toolbar">
            <input
              className="input"
              placeholder="Search institutions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn" onClick={exportCsv}>
              Export CSV
            </button>
            <button className="btn btn-primary" onClick={addRow}>
              + Add Competitor
            </button>
          </div>
        </div>

        <div className="card-body" style={{ paddingTop: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("Institution")}>Institution</th>
                <th onClick={() => toggleSort("Program")}>Program</th>
                <th onClick={() => toggleSort("cip_codes_used")}>
                  CIP Codes Used
                </th>
                <th className="num" onClick={() => toggleSort("appPercentile")}>
                  App Percentile (%)
                </th>
                <th
                  className="num"
                  onClick={() => toggleSort("admissibilityPercentile")}
                >
                  Admissibility Percentile (%)
                </th>
                <th className="num" onClick={() => toggleSort("winPercentile")}>
                  Win Rate (%)
                </th>
                <th
                  className="num"
                  onClick={() => toggleSort("overallPercentile")}
                >
                  Overall Percentile (%)
                </th>
                <th className="num"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td>
                    <strong>{r.Institution}</strong>
                  </td>
                  <td style={{ color: "var(--muted)", fontStyle: "italic" }}>
                    {r.Program}
                  </td>
                  <td>{r.cip_codes_used || "—"}</td>
                  <td className="num">{`${r.appPercentile}%`}</td>
                  <td className="num">{`${r.admissibilityPercentile}%`}</td>
                  <td className={`num ${winClass(r.winPercentile)}`}>
                    {`${r.winPercentile}%`}
                  </td>
                  <td className="num">{`${r.overallPercentile}%`}</td>
                  <td className="num">
                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() => confirmDelete(i)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: 24,
                    }}
                  >
                    No competitors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function csv(v: string) {
  return /[,"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
