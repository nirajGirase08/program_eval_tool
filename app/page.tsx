"use client";
import { useState } from "react";
import ProgramSelector from "../components/ProgramSelector";
import CompetitorTable, { Row } from "../components/CompetitorTable";

export default function Page() {
  const [program, setProgram] = useState("");
  const [rows, setRows] = useState<Row[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const load = async (p:string) => {
    setLoading(true); setErr(null); setRows(null);
    try{
      const r = await fetch(`/api/competitors?program=${encodeURIComponent(p)}`);
      const data = await r.json(); if(!r.ok) throw new Error(data?.error||"Failed");
      setProgram(p); setRows(data);
    }catch(e:any){ setErr(e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="stack">
      <ProgramSelector onSelect={load}/>
      {loading && <p className="container" style={{textAlign:"center"}}>Loading…</p>}
      {err && <p className="container" style={{textAlign:"center",color:"#dc2626"}}>Error: {err}</p>}
      {rows && <CompetitorTable program={program} rows={rows} />}
    </div>
  );
}
