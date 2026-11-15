import { useMemo, useState } from "react";
import type { Envelope, Meta, Status } from "../types";
import { StationMap } from "./StationMap";
import { Pill } from "./ui";

function band(co2: number, rad: number, shielded?: boolean): Status {
  if (co2 >= 3 || (rad > 2 && !shielded)) return "act";
  if (co2 >= 2.5 || (rad > 1.2 && !shielded)) return "watch";
  return "ok";
}

export function StationHeatmap({
  data,
  meta,
}: {
  data: Envelope;
  meta: Meta;
}) {
  const { state, evals } = data;
  const [moduleId, setModuleId] = useState("quarters");
  const mod = meta.modules.find((m) => m.id === moduleId) ?? meta.modules[0];
  const co2 = state.co2[mod.id];
  const rad = state.rad[mod.id];
  const st = band(co2, rad, mod.shielded);

  const sleepTile = useMemo(() => {
    return (evals[state.selected]?.H?.environment || []).find((t) => t.name.startsWith("Cabin CO2"));
  }, [evals, state.selected]);

  const feed = state.log.filter((e) => e.who === "SENSOR" || e.who === "ROBOT").slice(-6).reverse();

  return (
    <div className="console-heatmap">
      <p className="foot-note" style={{ marginTop: 0 }}>
        Heatmap of the same CO₂ and radiation the station sensors and SPECC write into shared mission state. Watch
        this map update when a popped-out Robot Scan or Station Sensors window posts telemetry.
      </p>
      <div className="heat-grid">
        <StationMap
          state={state}
          meta={meta}
          running={!!state.robot.busy}
          speech={null}
          pings={[]}
          selectedModule={moduleId}
          onSelectModule={setModuleId}
        />
        <div className="panel">
          <div className="row">
            <h3 style={{ fontSize: 16, margin: 0 }}>{mod.name}</h3>
            <Pill st={st} />
          </div>
          <p className="foot-note">{mod.sub}</p>
          <ul className="live-readings">
            <li className="locked">
              <span>Radiation</span>
              <b className="mono">
                {rad.toFixed(rad >= 10 ? 0 : 2)} mSv/d
              </b>
            </li>
            <li className="locked">
              <span>CO₂</span>
              <b className="mono">{co2.toFixed(1)} mmHg</b>
            </li>
            <li className="locked">
              <span>Space weather</span>
              <b>{state.spe === "none" ? "quiet" : state.spe}</b>
            </li>
            <li>
              <span>Sleep CO₂ tile (astronaut view)</span>
              <b>
                {sleepTile ? (
                  <>
                    <Pill st={sleepTile.st} /> {sleepTile.val}
                  </>
                ) : (
                  "—"
                )}
              </b>
            </li>
          </ul>

          <h4 style={{ margin: "14px 0 6px", fontSize: 13 }}>Live feed into Mission Console</h4>
          <div className="pipeline">
            <span>Sensors / SPECC</span>
            <span className="pipe">→</span>
            <span>Shared backend</span>
            <span className="pipe">→</span>
            <span>Mission Console</span>
          </div>
          <div className="logbox" style={{ maxHeight: 180, marginTop: 8 }}>
            <ul className="log">
              {feed.length === 0 ? (
                <li>
                  <span className="who SENSOR">SENSOR</span>
                  <span>Waiting for robot or station samples…</span>
                </li>
              ) : (
                feed.map((e, i) => (
                  <li key={`${e.day}-${i}-${e.msg.slice(0, 10)}`}>
                    <span className={`who ${e.who}`}>{e.who}</span>
                    <span>{e.msg}</span>
                    <span className="d">Day {e.day}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
