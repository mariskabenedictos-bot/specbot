import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { openMissionPopup } from "../popup";
import type { Envelope, Meta } from "../types";
import { SensorScene } from "./SensorScene";
import { Pill } from "./ui";

function statusFor(co2: number, rad: number, shielded?: boolean): "ok" | "watch" | "act" {
  if (co2 >= 3 || (rad > 2 && !shielded)) return "act";
  if (co2 >= 2.5 || (rad > 1.2 && !shielded)) return "watch";
  return "ok";
}

type RevealKey = "rad" | "co2" | "spe" | "sleep" | "mirror";

const REVEAL: RevealKey[] = ["rad", "co2", "spe", "sleep", "mirror"];

export function Environment({
  data,
  setData,
  meta,
  compact,
}: {
  data: Envelope;
  setData: (e: Envelope) => void;
  meta: Meta;
  compact?: boolean;
}) {
  const { state, evals } = data;
  const focus = state.crew[state.selected];
  const sleepMod = "quarters";
  const [moduleId, setModuleId] = useState(focus.at || sleepMod);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  // Panel starts unread at zero so each scan is a visible 0 → reading transition.
  const [revealed, setRevealed] = useState<Set<RevealKey>>(new Set());
  const [displayCo2, setDisplayCo2] = useState(0);
  const [displayRad, setDisplayRad] = useState(0);
  const [displaySpe, setDisplaySpe] = useState("—");
  const [displaySleep, setDisplaySleep] = useState(0);
  const [liveLine, setLiveLine] = useState("Sensors unread (0). Run a scan to sample this bay.");
  const timers = useRef<number[]>([]);

  const mod = meta.modules.find((m) => m.id === moduleId) ?? meta.modules[0];
  const st = statusFor(
    revealed.has("co2") ? displayCo2 : 0,
    revealed.has("rad") ? displayRad : 0,
    mod.shielded,
  );

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  // Switching bays resets the local readout to unread zeros.
  useEffect(() => {
    setRevealed(new Set());
    setDisplayCo2(0);
    setDisplayRad(0);
    setDisplaySpe("—");
    setDisplaySleep(0);
    setProgress(0);
    setLiveLine(`Sensors unread (0) in ${mod.name}. Run a scan to sample.`);
  }, [moduleId, mod.name]);

  const sleepTile = useMemo(() => {
    const tiles = evals[state.selected]?.H?.environment || [];
    return tiles.find((t) => t.name.startsWith("Cabin CO2"));
  }, [evals, state.selected]);

  const doseTile = useMemo(() => {
    const tiles = evals[state.selected]?.H?.radiation || [];
    return tiles.find((t) => t.name.startsWith("Career effective dose"));
  }, [evals, state.selected]);

  const wait = (ms: number) =>
    new Promise<void>((r) => {
      const t = window.setTimeout(r, ms);
      timers.current.push(t);
    });

  const runScan = async (kind: "tick" | "co2" | "rad" | "clear") => {
    if (busy) return;
    setBusy(true);
    setScanning(true);
    setRevealed(new Set());
    setDisplayCo2(0);
    setDisplayRad(0);
    setDisplaySpe("—");
    setDisplaySleep(0);
    setProgress(0);
    setLiveLine("Zeroing readout… sampling bay sensors");
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];

    try {
      // Zero first so the panel and heatmap both show a clear 0 → reading change.
      setData(await api.envUpdate({ module: moduleId, co2: 0, rad: 0.05 }));
      await wait(500);

      let targetCo2 = 2.0;
      let targetRad = 0.6;
      if (kind === "co2") {
        targetCo2 = 3.4;
        targetRad = 0.7;
        setLiveLine("CO₂ spike sample…");
      } else if (kind === "rad") {
        targetCo2 = 2.1;
        targetRad = 2.4;
        setLiveLine("Radiation spike sample…");
      } else if (kind === "clear") {
        targetCo2 = moduleId === "shelter" ? 1.8 : 2.0;
        targetRad = moduleId === "shelter" ? 0.25 : 0.65;
        setLiveLine("Clearing bay to nominal…");
      } else {
        const n = Date.now() % 7;
        targetCo2 = Math.round((1.9 + n * 0.15 + Math.random() * 0.25) * 10) / 10;
        targetRad = Math.round((0.45 + (n % 4) * 0.1 + Math.random() * 0.06) * 100) / 100;
        setLiveLine("Reading cabin sensors…");
      }

      const env = await api.envUpdate({
        module: moduleId,
        co2: targetCo2,
        rad: targetRad,
        spe: kind === "clear" ? "none" : undefined,
      });
      setData(env);

      const finalCo2 = env.state.co2[moduleId];
      const finalRad = env.state.rad[moduleId];
      const finalSleep = env.state.co2[sleepMod];
      const finalSpe = env.state.spe === "none" ? "quiet" : env.state.spe;

      for (let i = 0; i < REVEAL.length; i++) {
        await wait(520);
        const key = REVEAL[i];
        if (key === "rad") setDisplayRad(finalRad);
        if (key === "co2") setDisplayCo2(finalCo2);
        if (key === "spe") setDisplaySpe(finalSpe);
        if (key === "sleep") setDisplaySleep(finalSleep);
        setRevealed((prev) => new Set(prev).add(key));
        setProgress((i + 1) / REVEAL.length);
        const labels: Record<RevealKey, string> = {
          rad: `Radiation ${finalRad.toFixed(2)} mSv/d`,
          co2: `CO₂ ${finalCo2.toFixed(1)} mmHg`,
          spe: `Space weather ${finalSpe}`,
          sleep: `Crew quarters CO₂ ${finalSleep.toFixed(1)} mmHg`,
          mirror: "Mission Console tiles mirrored",
        };
        setLiveLine(labels[key]);
      }

      setLiveLine("Scan complete — heatmap shows the new bay reading");
    } finally {
      setScanning(false);
      setBusy(false);
    }
  };

  return (
    <section className={`view live-view${compact ? " compact" : ""}`} aria-labelledby="tab-environment">
      {!compact ? (
        <div className="sim-head">
          <div>
            <div className="eyebrow">Station sensors · bay scan · simulated</div>
            <h1>Readout starts at zero — each scan samples the bay and updates the heatmap.</h1>
          </div>
          <div className="crew-pick live-controls">
            <select
              className="mod-select"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              aria-label="Module bay"
            >
              {meta.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button className="btn primary" disabled={busy} onClick={() => runScan("tick")}>
              <b>{busy ? "Scanning…" : "Run sensor scan"}</b>
            </button>
            <button className="btn" disabled={busy} onClick={() => runScan("co2")}>
              <b>CO₂ spike scan</b>
            </button>
            <button className="btn" disabled={busy} onClick={() => runScan("rad")}>
              <b>Rad spike scan</b>
            </button>
            <button className="btn" disabled={busy} onClick={() => runScan("clear")}>
              <b>Clear bay</b>
            </button>
            <button className="btn" onClick={() => openMissionPopup("/environment", "SPECC Environment")}>
              <b>Pop out window</b>
            </button>
          </div>
        </div>
      ) : (
        <div className="popup-bar">
          <b>Station sensor bay</b>
          <select className="mod-select" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            {meta.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={busy} onClick={() => runScan("tick")}>
            <b>{busy ? "Scanning…" : "Scan"}</b>
          </button>
          <button className="btn" disabled={busy} onClick={() => runScan("co2")}>
            <b>CO₂ spike</b>
          </button>
        </div>
      )}

      <div className="live-layout">
        <SensorScene
          moduleId={mod.id}
          co2={revealed.has("co2") ? displayCo2 : scanning ? 0 : displayCo2}
          rad={revealed.has("rad") ? displayRad : scanning ? 0 : displayRad}
          shielded={mod.shielded}
          scanning={scanning}
        />

        <aside className="panel live-panel">
          <div className="live-panel-head">
            <div>
              <div className="eyebrow">Live sensor readout</div>
              <h3 style={{ fontSize: 16, margin: 0 }}>
                {mod.name} · {mod.sub}
              </h3>
            </div>
            <Pill st={st} />
          </div>
          <p className="live-status">{liveLine}</p>
          <div className="bar">
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>

          <ul className="live-readings">
            <li className={revealed.has("rad") ? "locked" : scanning ? "reading" : ""}>
              <span>Module radiation</span>
              <b className="mono">
                {revealed.has("rad")
                  ? `${displayRad.toFixed(displayRad >= 10 ? 0 : 2)} mSv/d`
                  : scanning
                    ? "reading…"
                    : "0.00 mSv/d"}
              </b>
            </li>
            <li className={revealed.has("co2") ? "locked" : scanning ? "reading" : ""}>
              <span>Module CO₂</span>
              <b className="mono">
                {revealed.has("co2") ? `${displayCo2.toFixed(1)} mmHg` : scanning ? "reading…" : "0.0 mmHg"}
              </b>
            </li>
            <li className={revealed.has("spe") ? "locked" : scanning ? "reading" : ""}>
              <span>Space weather</span>
              <b>{revealed.has("spe") ? displaySpe : scanning ? "reading…" : "—"}</b>
            </li>
            <li
              className={
                revealed.has("sleep") ? (displaySleep >= 2.5 ? "locked reading" : "locked") : scanning ? "reading" : ""
              }
            >
              <span>Crew quarters CO₂</span>
              <b className="mono">
                {revealed.has("sleep") ? `${displaySleep.toFixed(1)} mmHg` : scanning ? "reading…" : "0.0 mmHg"}
              </b>
            </li>
          </ul>

          <h4 style={{ margin: "12px 0 6px", fontSize: 13 }}>Mission Console mirror</h4>
          <ul className="live-readings">
            <li className={revealed.has("mirror") ? "" : scanning ? "reading" : ""}>
              <span>Cabin CO₂ where you sleep</span>
              <b>
                {revealed.has("mirror") && sleepTile ? (
                  <>
                    <Pill st={sleepTile.st} /> {sleepTile.val} {sleepTile.unit}
                  </>
                ) : scanning ? (
                  "updating…"
                ) : (
                  "unread"
                )}
              </b>
            </li>
            <li className={revealed.has("mirror") ? "" : scanning ? "reading" : ""}>
              <span>Career effective dose</span>
              <b>
                {revealed.has("mirror") && doseTile ? (
                  <>
                    <Pill st={doseTile.st} /> {doseTile.val} {doseTile.unit}
                  </>
                ) : scanning ? (
                  "updating…"
                ) : (
                  "unread"
                )}
              </b>
            </li>
            <li>
              <span>{focus.name} overall</span>
              <b>
                <Pill st={evals[state.selected].overall} />
              </b>
            </li>
          </ul>

          <p className="foot-note">
            Each scan zeros the bay on the shared backend first, then writes a fresh sample so the Station heatmap
            visibly changes.
          </p>
        </aside>
      </div>
    </section>
  );
}
