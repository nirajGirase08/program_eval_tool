"use client";
import { useEffect, useState } from "react";

export default function ProgramSelector({ onSelect }: { onSelect: (p: string) => void }) {
  const [programs, setPrograms] = useState<string[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch("/api/programs").then(r => r.json()).then(setPrograms).catch(() => setPrograms([]));
  }, []);

  return (
    <section className="hero is-primary is-fullheight">
      <div className="hero-body has-text-centered">
        
        <h2 className="subtitle is-4">Select a program to view competitors</h2>
        
        <select
          id="program"
          className="hero-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">{programs.length ? "Select a Program" : "Loading…"}</option>
          {programs.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <button
          className={`hero-btn ${selected ? "is-enabled" : ""}`}
          disabled={!selected}
          onClick={() => onSelect(selected)}
        >
          View Competitors
        </button>

        <div className="hero-divider" />
        <div className="hero-foot">Data source: <strong>Internal CSV</strong> </div>
      </div>
    </section>
  );
}
