import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { openMissionPopup } from "../popup";
import type { Envelope } from "../types";
import { RobotScene, type RobotPhase } from "./RobotScene";
import { Pill } from "./ui";

type RevealKey = "hr" | "bp" | "temp" | "spo2" | "dose";

const REVEAL_ORDER: RevealKey[] = ["hr", "bp", "temp", "spo2", "dose"];

export function RobotSim({
  data,
  setData,
  onSelect,
  compact,
}: {
  data: Envelope;
  setData: (e: Envelope) => void;
  onSelect: (crew: string) => void;
  compact?: boolean;
}) {
  const { state, evals } = data;
  const p = state.crew[state.selected];
  const [phase, setPhase] = useState<RobotPhase>(state.robot.paused ? "paused" : "idle");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState<Set<RevealKey>>(new Set());
  const [liveLine, setLiveLine] = useState("Waiting to scan…");
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (state.robot.paused) setPhase("paused");
  }, [state.robot.paused]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const togglePause = async () => {
    const next = !state.robot.paused;
    setData(await api.robotPause(next));
    setPhase(next ? "paused" : "idle");
  };

  const runScan = async () => {
    if (busy || state.robot.paused) return;
    setError(null);
    setBusy(true);
    setRevealed(new Set());
    setProgress(0);
    setLiveLine("Approaching astronaut…");
    setPhase("approach");
    clearTimers();

    try {
      await api.robotStart("vitals", state.selected);

      await new Promise<void>((r) => {
        const t = window.setTimeout(r, 1400);
        timers.current.push(t);
      });

      setPhase("scan");
      setLiveLine("Scanning vitals…");

      // Push measurement to shared backend mid-scan so the dashboard updates live.
      const done = await api.robotComplete("vitals", state.selected);
      setData(done);

      const step = 700;
      for (let i = 0; i < REVEAL_ORDER.length; i++) {
        await new Promise<void>((r) => {
          const t = window.setTimeout(r, step);
          timers.current.push(t);
        });
        const key = REVEAL_ORDER[i];
        setRevealed((prev) => new Set(prev).add(key));
        setProgress((i + 1) / REVEAL_ORDER.length);
        const labels: Record<RevealKey, string> = {
          hr: "Heart rate locked",
          bp: "Blood pressure locked",
          temp: "Temperature locked",
          spo2: "SpO₂ locked",
          dose: "Personal dosimeter locked",
        };
        setLiveLine(labels[key]);
      }

      setPhase("done");
      setLiveLine("Telemetry sent to mission brain");
      await new Promise<void>((r) => {
        const t = window.setTimeout(r, 900);
        timers.current.push(t);
      });
      setPhase(state.robot.paused ? "paused" : "idle");
      setLiveLine("Idle — ready for next scan");
    } catch (e) {
      setError(String(e));
      setPhase("idle");
      setLiveLine("Scan failed");
    } finally {
      setBusy(false);
    }
  };

  const vitals = p.vitals;

  return (
    <section className={`view live-view${compact ? " compact" : ""}`} aria-labelledby="tab-robot">
      {!compact ? (
        <div className="sim-head">
          <div>
            <div className="eyebrow">SPECC robot · close-up scan · simulated</div>
            <h1>Watch SPECC read vitals — Mission Console updates live.</h1>
          </div>
          <div className="crew-pick live-controls">
            <div className="seg">
              {Object.keys(state.crew).map((id) => (
                <button key={id} aria-pressed={id === state.selected} onClick={() => onSelect(id)} disabled={busy}>
                  {state.crew[id].name}
                </button>
              ))}
            </div>
            <button className="btn primary" onClick={runScan} disabled={busy || state.robot.paused}>
              <b>{busy ? "Scanning…" : "Start vital scan"}</b>
            </button>
            <button className="btn" onClick={togglePause} disabled={busy && phase === "scan"}>
              <b>{state.robot.paused ? "Resume" : "Pause"}</b>
            </button>
            <button className="btn" onClick={() => openMissionPopup("/robot", "SPECC Robot")}>
              <b>Pop out window</b>
            </button>
          </div>
        </div>
      ) : (
        <div className="popup-bar">
          <b>SPECC robot scan</b>
          <div className="seg">
            {Object.keys(state.crew).map((id) => (
              <button key={id} aria-pressed={id === state.selected} onClick={() => onSelect(id)} disabled={busy}>
                {state.crew[id].name}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={runScan} disabled={busy || state.robot.paused}>
            <b>{busy ? "Scanning…" : "Scan vitals"}</b>
          </button>
        </div>
      )}

      {error ? (
        <p className="foot-note" style={{ color: "var(--act)" }}>
          {error}
        </p>
      ) : null}

      <div className="live-layout">
        <RobotScene phase={phase} female={p.sex === "female"} />

        <aside className="panel live-panel">
          <div className="live-panel-head">
            <div>
              <div className="eyebrow">Live robot readout</div>
              <h3 style={{ fontSize: 16, margin: 0 }}>{p.name} · biometrics</h3>
            </div>
            <Pill st={evals[state.selected].overall} />
          </div>
          <p className="live-status">{liveLine}</p>
          <div className="bar">
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>

          <ul className="live-readings">
            <Reading
              label="Heart rate"
              value={revealed.has("hr") ? `${vitals.hr} bpm` : "—"}
              active={phase === "scan" && !revealed.has("hr")}
              locked={revealed.has("hr")}
            />
            <Reading
              label="Blood pressure"
              value={revealed.has("bp") ? `${vitals.bp} mmHg` : "—"}
              active={phase === "scan" && revealed.has("hr") && !revealed.has("bp")}
              locked={revealed.has("bp")}
            />
            <Reading
              label="Temperature"
              value={revealed.has("temp") ? `${vitals.temp.toFixed(1)} °C` : "—"}
              active={phase === "scan" && revealed.has("bp") && !revealed.has("temp")}
              locked={revealed.has("temp")}
            />
            <Reading
              label="SpO₂"
              value={revealed.has("spo2") ? `${vitals.spo2}%` : "—"}
              active={phase === "scan" && revealed.has("temp") && !revealed.has("spo2")}
              locked={revealed.has("spo2")}
            />
            <Reading
              label="Personal dose"
              value={revealed.has("dose") ? `${p.dose.toFixed(0)} mSv` : "—"}
              active={phase === "scan" && revealed.has("spo2") && !revealed.has("dose")}
              locked={revealed.has("dose")}
            />
          </ul>

          <p className="foot-note">
            Values are simulated. When a line locks, it is already in the shared mission state — keep Mission
            Console open on the Astronauts or Station heatmap tab to see it update live.
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="eyebrow">Mission day</span>
            <b className="mono">{state.day}</b>
          </div>
          <div className="row">
            <span className="eyebrow">Check-up day</span>
            <b className="mono">{vitals.day}</b>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Reading({
  label,
  value,
  active,
  locked,
}: {
  label: string;
  value: string;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <li className={`${active ? "reading" : ""}${locked ? " locked" : ""}`}>
      <span>{label}</span>
      <b className="mono">{active ? "reading…" : value}</b>
    </li>
  );
}
