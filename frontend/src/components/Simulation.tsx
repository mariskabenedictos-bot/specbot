import { useState } from "react";
import type { Envelope, Meta, ScenarioMeta } from "../types";
import { BodyMap } from "./BodyMap";
import { StationMap } from "./StationMap";
import { Pill } from "./ui";

const FLOW = [
  { id: "SENSOR", title: "Station sensors", sub: "Radiation, CO2, sleep, exercise log" },
  { id: "ROBOT", title: "SPECC robot", sub: "Dosimeter, vitals, swab, voice check-in" },
  { id: "BRAIN", title: "SPECC brain", sub: "Predicts, personalises, plans" },
  { id: "CONSOLE", title: "Mission Console", sub: "Shows status and the plan" },
];

type SimTab = "station" | "person";

export function Simulation({
  data,
  meta,
  scenarios,
  running,
  flowWho,
  speech,
  pings,
  selRegion,
  onSelectRegion,
  onScenario,
  onSelect,
  onGoto,
}: {
  data: Envelope;
  meta: Meta;
  scenarios: ScenarioMeta[];
  running: boolean;
  flowWho: string | null;
  speech: { text: string; n: number } | null;
  pings: { id: number; mod: string; tone: string }[];
  selRegion: string | null;
  onSelectRegion: (id: string) => void;
  onScenario: (id: string) => void;
  onSelect: (crew: string) => void;
  onGoto: (view: string) => void;
}) {
  const { state, evals } = data;
  const [tab, setTab] = useState<SimTab>("station");

  return (
    <section id="view-simulation" className="view" role="tabpanel" aria-labelledby="tab-simulation">
      <div className="sim-head">
        <div>
          <div className="eyebrow">Live simulation · Sample station based on the ISS</div>
          <h1>Sensors watch the station. SPECC looks after the person.</h1>
        </div>
        <div className="crew-pick" style={{ marginLeft: "auto" }}>
          <span className="eyebrow">Focus on</span>
          <div className="seg">
            {Object.keys(state.crew).map((id) => (
              <button key={id} aria-pressed={id === state.selected} onClick={() => onSelect(id)} disabled={running}>
                {state.crew[id].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="scen">
        {scenarios.map((s) => (
          <button key={s.id} className="btn" title={s.sub} disabled={running} onClick={() => onScenario(s.id)}>
            <span className="cat">{s.cat}</span>
            <b>{s.title}</b>
          </button>
        ))}
        <button className="btn" title="Back to mission day 180" disabled={running} onClick={() => onScenario("reset")}>
          <span className="cat">Restart</span>
          <b>Reset</b>
        </button>
      </div>

      <div className="console-tabs seg" role="tablist" aria-label="Simulation views">
        <button aria-pressed={tab === "station"} onClick={() => setTab("station")}>
          Station map
        </button>
        <button aria-pressed={tab === "person"} onClick={() => setTab("person")}>
          Astronaut body map
        </button>
      </div>

      {tab === "station" ? (
        <div className="sim-main">
          <StationMap state={state} meta={meta} running={running} speech={speech} pings={pings}>
            <details className="units" open>
              <summary>What do these units mean?</summary>
              <p>
                <b>mSv/d:</b> radiation dose rate in that module. ISS guide ~0.44–0.88 mSv/day; career limit 600 mSv.
              </p>
              <p>
                <b>mmHg:</b> cabin CO₂. NASA 1-hour limit 3.0 mmHg; 7-day watch 2.5 mmHg.
              </p>
            </details>
          </StationMap>

          <div className="panel logpanel">
            <div className="loghead">
              <h3 style={{ fontSize: 16 }}>Event log</h3>
              <span className="eyebrow">Mission day {state.day}</span>
            </div>
            <div className="logbox">
              <ul className="log">
                {state.log
                  .slice()
                  .reverse()
                  .map((e, i) => (
                    <li key={`${e.day}-${i}-${e.msg.slice(0, 12)}`} className={i === 0 && state.log.length > 1 ? "new" : undefined}>
                      <span className={`who ${e.who}`}>{e.who}</span>
                      <span>{e.msg}</span>
                      <span className="d">Day {e.day}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <BodyMap state={state} ev={evals[state.selected]} meta={meta} selRegion={selRegion} onSelect={onSelectRegion} />
      )}

      <div className="sim-foot">
        <div className="flow">
          {FLOW.map((n) => (
            <div key={n.id} className={`node${flowWho === n.id ? " on" : ""}`}>
              <b>{n.title}</b>
              <span>{n.sub}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Mission Console right now</h3>
          <div className="peek">
            {Object.keys(state.crew).map((id) => {
              const e = evals[id];
              const person = state.crew[id];
              return (
                <div key={id} style={{ display: "grid", gap: 8 }}>
                  <div className="row">
                    <b>{person.name}</b>
                    <Pill st={e.overall} />
                  </div>
                  {e.alerts.length ? (
                    e.alerts.slice(0, 3).map((a, i) => (
                      <div className="row" style={{ color: "var(--muted)" }} key={a.tile + i}>
                        <span>{a.what}</span>
                      </div>
                    ))
                  ) : (
                    <div className="row" style={{ color: "var(--muted)" }}>
                      <span>Clear to landing</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={() => onGoto("dashboard")}>
            Open Mission Console
          </button>
        </div>
      </div>
    </section>
  );
}
