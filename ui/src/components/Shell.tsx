import { useState } from "react";
import { Outlet } from "react-router";
import NavSidebar from "./NavSidebar";
import ApiKeyGate from "./ApiKeyGate";

export default function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ApiKeyGate>
      <div className="shell">
        <NavSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="shell-main">
          <header className="shell-header">
            <button
              className="hamburger"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="shell-header-title">Crestron CP4</span>
          </header>
          <main className="shell-content">
            <Outlet />
          </main>
        </div>
      </div>
    </ApiKeyGate>
  );
}
