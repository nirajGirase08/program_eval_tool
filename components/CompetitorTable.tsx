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
  | "appPercentile"
  | "admissibilityPercentile"
  | "winPercentile"
  | "overallPercentile"
>;
type Dir = "asc" | "desc";

export default function CompetitorTable({
  program,
  rows: initial,
  hideHeader = false, // NEW
}: {
  program: string;
  rows: Row[];
  hideHeader?: boolean; // NEW
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>(initial);
  const [sortKey, setSortKey] = useState<SortKey>("appPercentile");
  const [dir, setDir] = useState<Dir>("desc");

  // ---- Add Competitor form state ----
  const [showAdd, setShowAdd] = useState(false);
  type NewRow = {
    Institution: string;
    Program: string;
    cip_codes_used: string;
    appPercentile: string;
    admissibilityPercentile: string;
    winPercentile: string;
    overallPercentile: string;
  };
  const emptyNewRow = (): NewRow => ({
    Institution: "",
    Program: program || "",
    cip_codes_used: "",
    appPercentile: "",
    admissibilityPercentile: "",
    winPercentile: "",
    overallPercentile: "",
  });
  const [newRow, setNewRow] = useState<NewRow>(emptyNewRow());

  const clampPct = (v: string) => {
    const num = Number(String(v).replace(/%/g, "").trim());
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let r = rows.filter((x) =>
      x.Institution.toLowerCase().includes(q)
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
    if (k === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setDir("desc");
    }
  };

  const winClass = (v: number) =>
    v >= 75 ? "win-high" : v >= 60 ? "win-mid" : "win-low";

  // ---- Add Competitor ----
  const saveNewRow = () => {
    if (!newRow.Institution.trim())
      return alert("Institution is required.");

    const toAdd: Row = {
      Institution: newRow.Institution.trim(),
      Program: newRow.Program.trim(),
      cip_codes_used: newRow.cip_codes_used.trim(),
      appPercentile: clampPct(newRow.appPercentile),
      admissibilityPercentile: clampPct(
        newRow.admissibilityPercentile
      ),
      winPercentile: clampPct(newRow.winPercentile),
      overallPercentile: clampPct(newRow.overallPercentile),
    };
    setRows((prev) => [toAdd, ...prev]);
    setShowAdd(false);
    setNewRow(emptyNewRow());
  };

  const cancelNewRow = () => {
    setShowAdd(false);
    setNewRow(emptyNewRow());
  };

  const exportCsv = () => {
    const header = [
      "Institution",
      "App Percentile(%)",
      "Admissibility Percentile(%)",
      "Win Rate(%)",
      "Overall Percentile(%)",
    ];
    const lines = [header.join(",")].concat(
      filtered.map((r) =>
        [
          csv(r.Institution),
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
        {/* ONLY render the section header + toolbar if hideHeader is false */}
        {!hideHeader && (
          <div className="card-head card-head--two">
            <h2 className="card-title">
              Top Competitors — {program}
            </h2>

            <div className="toolbar">
              <input
                className="small-input"
                placeholder="Search institutions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="small-btn" onClick={exportCsv}>
                Export CSV
              </button>
              <button
                className="small-btn primary"
                onClick={() => setShowAdd((v) => !v)}
              >
                {showAdd ? "Close" : "+ Add Competitor"}
              </button>
            </div>
          </div>
        )}

        <div className="card-body" style={{ paddingTop: 0 }}>
          {/* Inline Add Competitor form */}
          {showAdd && (
            <div
              className="card"
              style={{
                margin: "12px 0 16px",
                padding: 12,
                border: "1px dashed var(--line)",
                background: "#fcfdff",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label>Institution</label>
                  <input
                    className="small-input"
                    value={newRow.Institution}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        Institution: e.target.value,
                      })
                    }
                    placeholder="e.g., Harvard Graduate School of Education"
                  />
                </div>

                <div>
                  <label>App Percentile (%)</label>
                  <input
                    className="small-input"
                    inputMode="numeric"
                    value={newRow.appPercentile}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        appPercentile: e.target.value,
                      })
                    }
                    placeholder="0–100"
                  />
                </div>

                <div>
                  <label>Admissibility Percentile (%)</label>
                  <input
                    className="small-input"
                    inputMode="numeric"
                    value={newRow.admissibilityPercentile}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        admissibilityPercentile:
                          e.target.value,
                      })
                    }
                    placeholder="0–100"
                  />
                </div>

                <div>
                  <label>Win Rate (%)</label>
                  <input
                    className="small-input"
                    inputMode="numeric"
                    value={newRow.winPercentile}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        winPercentile: e.target.value,
                      })
                    }
                    placeholder="0–100"
                  />
                </div>

                <div>
                  <label>Overall Percentile (%)</label>
                  <input
                    className="small-input"
                    inputMode="numeric"
                    value={newRow.overallPercentile}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        overallPercentile: e.target.value,
                      })
                    }
                    placeholder="0–100"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 12,
                }}
              >
                <button className="small-btn" onClick={cancelNewRow}>
                  Cancel
                </button>
                <button
                  className="small-btn primary"
                  onClick={saveNewRow}
                >
                  Save Competitor
                </button>
              </div>
            </div>
          )}

          {/* --- Table --- */}
          <table className="table">
            <thead>
              <tr>
                <th
                  onClick={() => toggleSort("Institution")}
                  style={{ cursor: "pointer" }}
                >
                  Institution
                </th>
                <th
                  className="num"
                  onClick={() => toggleSort("appPercentile")}
                  style={{ cursor: "pointer" }}
                >
                  App Percentile (%)
                </th>
                <th
                  className="num"
                  onClick={() =>
                    toggleSort("admissibilityPercentile")
                  }
                  style={{ cursor: "pointer" }}
                >
                  Admissibility Percentile (%)
                </th>
                <th
                  className="num"
                  onClick={() => toggleSort("winPercentile")}
                  style={{ cursor: "pointer" }}
                >
                  Win Rate (%)
                </th>
                <th
                  className="num"
                  onClick={() => toggleSort("overallPercentile")}
                  style={{ cursor: "pointer" }}
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
                  <td className="num">{`${r.appPercentile}%`}</td>
                  <td className="num">{`${r.admissibilityPercentile}%`}</td>
                  <td
                    className={`num ${winClass(r.winPercentile)}`}
                  >{`${r.winPercentile}%`}</td>
                  <td className="num">{`${r.overallPercentile}%`}</td>
                  <td className="num">
                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() => {
                        const item = filtered[i];
                        const idx = rows.indexOf(item);
                        if (
                          window.confirm(
                            `Delete "${item.Institution}" from the current view?`
                          )
                        ) {
                          setRows((prev) =>
                            prev.filter((_, j) => j !== idx)
                          );
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
