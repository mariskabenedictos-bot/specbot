import { Link, useLocation } from "react-router-dom";

const VIEWS = [
  { id: "console", path: "/console", label: "Mission Console" },
  { id: "robot", path: "/robot", label: "Robot Scan" },
  { id: "environment", path: "/environment", label: "Station Sensors" },
  { id: "simulation", path: "/simulation", label: "SPECC Bot Simulation" },
  { id: "pitch", path: "/pitch", label: "Pitch" },
];

export function TopBar({
  ping,
  wsStatus,
}: {
  ping?: boolean;
  wsStatus?: "connecting" | "live" | "down";
}) {
  const loc = useLocation();

  return (
    <header className="top">
      <div className="wrap">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true">
            <rect x="6" y="4" width="28" height="32" rx="14" fill="var(--robot)" />
            <rect x="10" y="13" width="20" height="9" rx="4.5" fill="#1a2533" />
            <circle cx="16" cy="17.5" r="2" fill="#8db4ff" />
            <circle cx="24" cy="17.5" r="2" fill="#8db4ff" />
          </svg>
          <div>
            <b>SPECC</b>
            <br />
            <span>Spatial Predictive Environmental Computing Companion</span>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Demo sections">
          {VIEWS.map((v) => {
            const selected =
              loc.pathname === v.path ||
              (v.path === "/console" && (loc.pathname === "/" || loc.pathname === "/dashboard"));
            return (
              <Link
                key={v.id}
                to={v.path}
                className="tab"
                role="tab"
                id={`tab-${v.id}`}
                aria-selected={selected}
              >
                {v.label}
                {v.id === "console" && ping ? <span className="ping" /> : null}
              </Link>
            );
          })}
        </nav>
        {wsStatus ? (
          <span className={`ws-pill ${wsStatus}`} title="Shared mission WebSocket">
            {wsStatus === "live" ? "Live sync" : wsStatus === "connecting" ? "Connecting…" : "Sync offline"}
          </span>
        ) : null}
      </div>
    </header>
  );
}
