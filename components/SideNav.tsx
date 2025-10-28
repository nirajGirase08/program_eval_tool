"use client";

export type ViewMode = "internal" | "external";

export default function SideNav({
  currentView,
  onViewChange,
}: {
  currentView: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <aside className="side-nav">
      {/* Internal CSV card */}
      <button
        className={`side-card ${currentView === "internal" ? "active" : ""}`}
        onClick={() => onViewChange("internal")}
      >
        <div className="side-card-icon">📊</div>
        <div className="side-card-body">
          <div className="side-card-title">Internal CSV</div>
          <div className="side-card-desc">
            Phase 1: Analyze internal competitor data
          </div>
        </div>
      </button>

      {/* External Web Data card */}
      <button
        className={`side-card ${currentView === "external" ? "active" : ""}`}
        onClick={() => onViewChange("external")}
      >
        <div className="side-card-icon">🌐</div>
        <div className="side-card-body">
          <div className="side-card-title">External Web Data</div>
          <div className="side-card-desc">
            Phase 2: Integrated external data analysis
          </div>
        </div>
      </button>
    </aside>
  );
}
