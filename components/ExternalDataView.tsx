"use client";
import { useState } from 'react';

interface MergedCompetitor {
  Program: string;
  cip_codes_used: string;
  Institution: string;
  app_percentile: string;
  admissibility_percentile: string;
  win_percentile: string;
  overall_percentile: string;
  degreeType: string | null;
  programDuration: string | null;
  costPerCreditHour: string | null;
  totalTuition: string | null;
  deliveryMode: string | null;
  curriculumHighlights: string | null;
  accreditation: string | null;
  sourceUrl: string | null;
  lastScraped: string | null;
}

export default function ExternalDataView() {
  const [competitorData, setCompetitorData] = useState<MergedCompetitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const fetchExternalData = async () => {
    console.log('[FRONTEND] Starting fetch external data...');
    setLoading(true);
    try {
      console.log('[FRONTEND] Making POST request to /api/protected/externaldata');
      const response = await fetch('/api/protected/externaldata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[FRONTEND] Response status:', response.status);
      const result = await response.json();
      console.log('[FRONTEND] Response result:', result);
      
      if (result.success) {
        console.log('[FRONTEND] Success! Rows received:', result.rows?.length || 0);
        setCompetitorData(result.rows || []);
        setLastFetch(result.lastScraped);
      } else {
        console.error('[FRONTEND] API returned error:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('[FRONTEND] Network/parsing error:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = [
      "Institution",
      "Program", 
      "Degree Type",
      "Duration",
      "Cost per Credit",
      "Total Tuition",
      "Delivery Mode",
      "Curriculum Highlights",
      "Accreditation"
    ];
    const lines = [header.join(",")].concat(
      competitorData.map((r) =>
        [
          csv(r.Institution),
          csv(r.Program),
          csv(r.degreeType || ''),
          csv(r.programDuration || ''),
          csv(r.costPerCreditHour || ''),
          csv(r.totalTuition || ''),
          csv(r.deliveryMode || ''),
          csv(r.curriculumHighlights || ''),
          csv(r.accreditation || '')
        ].join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "external_competitor_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="external-data-view">
      <div className="view-card">
        <div className="view-card__header">
          <h2 className="view-card__title"> Phase 2: External Data Integration</h2>
          <div className="view-card__actions">
            <button 
              className="small-btn primary" 
              onClick={fetchExternalData}
              disabled={loading}
            >
              {loading ? 'Fetching...' : 'Fetch External Data'}
            </button>
            <button className="small-btn">Save Merged Data</button>
            <button className="small-btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>


        <div className="view-card__content">
          <div className="container">
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">Merged Competitor Analysis</h3>
              </div>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Program</th>
                      <th>Degree Type</th>
                      <th>Duration</th>
                      <th>Cost per Credit</th>
                      <th>Total Tuition</th>
                      <th>Delivery Mode</th>
                      <th>Curriculum Highlights</th>
                      <th>Accreditation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitorData.length > 0 ? (
                      competitorData.map((row, i) => (
                        <tr key={i}>
                          <td><strong>{row.Institution}</strong></td>
                          <td>{row.Program}</td>
                          <td>{row.degreeType || '-'}</td>
                          <td>{row.programDuration || '-'}</td>
                          <td>{row.costPerCreditHour || '-'}</td>
                          <td>{row.totalTuition || '-'}</td>
                          <td>{row.deliveryMode || '-'}</td>
                          <td>{row.curriculumHighlights || '-'}</td>
                          <td>{row.accreditation || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                          {loading ? 'Loading competitors...' : 'Click "Fetch External Data" to load competitor information from internal CSV'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function csv(v: string) {
  return /[,"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}