import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Dashboard, type Metric } from "./components/Dashboard";
import { Environment } from "./components/Environment";
import { PitchDeck } from "./components/PitchDeck";
import { RobotSim } from "./components/RobotSim";
import { Simulation } from "./components/Simulation";
import { TopBar } from "./components/TopBar";
import { useMission } from "./hooks/useMission";
import { isPopupMode } from "./popup";

export default function App() {
  const mission = useMission();
  const [metric, setMetric] = useState<Metric>("dose");
  const [pingConsole, setPingConsole] = useState(false);
  const [selRegion, setSelRegion] = useState<string | null>(null);
  const lastRev = useRef<number | null>(null);
  const loc = useLocation();
  const navigate = useNavigate();
  const popup = isPopupMode();

  useEffect(() => {
    if (!mission.data) return;
    if (
      lastRev.current !== null &&
      mission.data.state.rev !== lastRev.current &&
      !loc.pathname.startsWith("/console") &&
      loc.pathname !== "/" &&
      loc.pathname !== "/dashboard"
    ) {
      setPingConsole(true);
    }
    lastRev.current = mission.data.state.rev;
  }, [mission.data, loc.pathname]);

  useEffect(() => {
    if (loc.pathname.startsWith("/console") || loc.pathname === "/" || loc.pathname === "/dashboard") {
      setPingConsole(false);
    }
  }, [loc.pathname]);

  if (mission.error && !mission.data) {
    return (
      <div className="wrap" style={{ padding: 24 }}>
        <h1>SPECC demo</h1>
        <p className="foot-note" style={{ color: "var(--act)" }}>
          Could not reach the mission API: {mission.error}
        </p>
        <p className="foot-note">
          Start the backend with <code>uvicorn app.main:app --port 8000</code> inside <code>backend/</code>, then{" "}
          <code>npm run dev</code> in <code>frontend/</code>.
        </p>
      </div>
    );
  }

  if (!mission.data || !mission.meta) {
    return (
      <div className="wrap" style={{ padding: 24 }}>
        <p className="eyebrow">Loading mission…</p>
      </div>
    );
  }

  const { state, evals } = mission.data;

  return (
    <>
      {!popup ? <TopBar ping={pingConsole} wsStatus={mission.wsStatus} /> : null}
      <main className={`wrap${popup ? " popup-main" : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/console" replace />} />
          <Route path="/dashboard" element={<Navigate to="/console" replace />} />
          <Route
            path="/console"
            element={
              <Dashboard
                state={state}
                ev={evals[state.selected]}
                meta={mission.meta}
                metric={metric}
                onMetric={setMetric}
                onSelect={mission.select}
                data={mission.data}
              />
            }
          />
          <Route
            path="/simulation"
            element={
              <Simulation
                data={mission.data}
                meta={mission.meta}
                scenarios={mission.scenarios}
                running={mission.running}
                flowWho={mission.flowWho}
                speech={mission.speech}
                pings={mission.pings}
                selRegion={selRegion}
                onSelectRegion={setSelRegion}
                onScenario={mission.runScenario}
                onSelect={mission.select}
                onGoto={(view) => navigate(view === "dashboard" ? "/console" : `/${view}`)}
              />
            }
          />
          <Route
            path="/environment"
            element={
              <Environment
                data={mission.data}
                setData={mission.setData}
                meta={mission.meta}
                compact={popup}
              />
            }
          />
          <Route
            path="/robot"
            element={
              <RobotSim
                data={mission.data}
                setData={mission.setData}
                onSelect={mission.select}
                compact={popup}
              />
            }
          />
          <Route path="/pitch" element={<PitchDeck meta={mission.meta} />} />
          <Route path="*" element={<Navigate to="/console" replace />} />
        </Routes>
      </main>
    </>
  );
}
