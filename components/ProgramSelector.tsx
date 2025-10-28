"use client";
import { useEffect, useState } from "react";

export default function ProgramSelector({
  onSelect,
}: {
  onSelect: (p: string) => void;
}) {
  const [programs, setPrograms] = useState<string[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch("/api/programs")
      .then((r) => r.json())
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, []);

  return (
    <div className="program-selector">
      <select
        className="program-selector__dropdown"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">
          {programs.length ? "Select a Program" : "Loading…"}
        </option>
        {programs.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <button
        className={`program-selector__btn ${
          selected ? "is-enabled" : ""
        }`}
        disabled={!selected}
        onClick={() => onSelect(selected)}
      >
        View Competitors
      </button>

      <div className="program-selector__meta">
        
      </div>
    </div>
  );
}
