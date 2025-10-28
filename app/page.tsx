"use client";
import { useState } from "react";
import SideNav, { ViewMode } from "../components/SideNav";
import InternalCsvView from "../components/InternalCsvView";
import ExternalDataView from "../components/ExternalDataView";

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewMode>("internal");

  return (
    <>
      {/* Blue top header bar */}
      <div className="app-header">
        Vanderbilt Competitor Analysis <span className="pilot-tag">(Pilot)</span>
      </div>

      {/* Main 2-column layout */}
      <div className="main-layout">
        <SideNav currentView={currentView} onViewChange={setCurrentView} />
        <div className="main-content">
          {currentView === "internal" ? <InternalCsvView /> : <ExternalDataView />}
        </div>
      </div>
    </>
  );
}
