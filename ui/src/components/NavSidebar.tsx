import { type ReactNode } from "react";
import { NavLink } from "react-router";
import { useApiKey } from "../hooks/useApiKey";

const links = [
  { to: "/", label: "Dashboard", icon: "grid" },
  { to: "/joins", label: "Join Map", icon: "link" },
  { to: "/configure", label: "Configure", icon: "wrench" },
  { to: "/devices", label: "Devices", icon: "cpu" },
  { to: "/scenes", label: "Scenes", icon: "play" },
  { to: "/joinlist", label: "JoinList Editor", icon: "code" },
];

const icons: Record<string, ReactNode> = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  link: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  cpu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" />
      <path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
    </svg>
  ),
  play: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  wrench: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  code: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

export default function NavSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { apiKey, setApiKey } = useApiKey();

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <nav className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          <strong>CP4</strong>
          <span>Dashboard</span>
        </div>
        <ul className="sidebar-links">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}
                onClick={onClose}
              >
                {icons[link.icon]}
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          {apiKey && (
            <button
              className="button sidebar-logout"
              onClick={() => {
                setApiKey("");
                onClose();
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
