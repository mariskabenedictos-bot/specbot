import { useEffect, useMemo, useRef, useState } from "react";
import type { Envelope, Evaluation, Meta, MissionState, Status, Tile } from "../types";
import { StationHeatmap } from "./StationHeatmap";
import { KV, Pill, Spark } from "./ui";

export type Metric = "dose" | "bmd" | "vo2";
type ConsoleTab = "astronauts" | "heatmap";

const HAZ_ORDER = ["radiation", "gravity", "immune", "environment"];
const SEV: Record<Status, number> = { ok: 0, watch: 1, act: 2 };

export function Dashboard({
  state,
  ev,
  meta,
  metric,
  onMetric,
  onSelect,
  data,
}: {
  state: MissionState;
  ev: Evaluation;
  meta: Meta;
  metric: Metric;
  onMetric: (m: Metric) => void;
  onSelect: (crew: string) => void;
  data: Envelope;
}) {
  const [tab, setTab] = useState<ConsoleTab>("astronauts");
  const p = state.crew[state.selected];
  const left = meta.landing - state.day;
  const checkupSig = `${p.vitals.day}|${p.vitals.hr}|${p.vitals.bp}|${p.vitals.temp}|${p.vitals.spo2}`;
  const checkupRef = useRef(checkupSig);
  const [checkupLive, setCheckupLive] = useState(false);
  useEffect(() => {
    if (checkupRef.current === checkupSig) return;
    checkupRef.current = checkupSig;
    setCheckupLive(true);
    const t = window.setTimeout(() => setCheckupLive(false), 2800);
    return () => window.clearTimeout(t);
  }, [checkupSig]);

  // Flash tiles whose value or status changed since the previous render.
  const sig = useMemo(() => JSON.stringify(ev.H), [ev]);
  const sigRef = useRef<string>("");
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (sigRef.current === "") {
      sigRef.current = sig;
      return;
    }
    if (sigRef.current === sig) return;
    const prev = JSON.parse(sigRef.current) as Record<string, Tile[]>;
    const next: Record<string, boolean> = {};
    for (const k in ev.H) {
      for (const t of ev.H[k]) {
        const old = (prev[k] || []).find((x) => x.name === t.name);
        if (old && (old.val !== t.val || old.st !== t.st)) next[state.selected + k + t.name] = true;
      }
    }
    sigRef.current = sig;
    if (Object.keys(next).length === 0) return;
    setFlash(next);
    const timer = setTimeout(() => setFlash({}), 1600);
    return () => clearTimeout(timer);
  }, [sig, ev.H, state.selected]);

  const top: Status = ev.alerts.length ? ev.alerts[0].st : "ok";
  const nHorn = ev.alerts.filter((a) => a.horn).length;

  return (
    <section id="view-console" className="view" role="tabpanel" aria-labelledby="tab-console">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Mission Console · shared live state</div>
          <h1>{tab === "astronauts" ? `${p.name} · ${p.role}` : "Station environment heatmap"}</h1>
        </div>
        {tab === "astronauts" ? (
          <div className="crew-pick" style={{ marginLeft: "auto" }}>
            <span className="eyebrow">Astronaut</span>
            <div className="seg">
              {Object.keys(state.crew).map((id) => (
                <button key={id} aria-pressed={id === state.selected} onClick={() => onSelect(id)}>
                  {state.crew[id].name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="meta" style={{ flexBasis: "100%" }}>
          <span>
            Mission day <b className="mono">{state.day}</b>
          </span>
          {tab === "astronauts" ? (
            <>
              <span>
                Landing day <b className="mono">{meta.landing}</b> (<b className="mono">{left}</b> days)
              </span>
              <span>
                Spacewalk planned day <b className="mono">{meta.evaDay}</b>
              </span>
              <span>
                Overall <span id="d-overall"><Pill st={ev.overall} /></span>
              </span>
            </>
          ) : (
            <span className="foot-note" style={{ margin: 0 }}>
              Module CO₂ / radiation from station sensors — no astronaut focus on this tab
            </span>
          )}
        </div>
      </div>

      <div className="console-tabs seg" role="tablist" aria-label="Mission Console views">
        <button aria-pressed={tab === "astronauts"} onClick={() => setTab("astronauts")}>
          Astronauts
        </button>
        <button aria-pressed={tab === "heatmap"} onClick={() => setTab("heatmap")}>
          Station heatmap
        </button>
      </div>

      {tab === "heatmap" ? <StationHeatmap data={data} meta={meta} /> : null}

      {tab === "astronauts" ? (
      <>
      <div className={`panel checkup-live${checkupLive ? " flash" : ""}`}>
        <div className="row" style={{ marginBottom: 8 }}>
          <div>
            <div className="eyebrow">{checkupLive ? "Live update from SPECC robot" : "Latest SPECC check-up"}</div>
            <h3 style={{ margin: 0, fontSize: 16 }}>{p.name} · simulated vitals</h3>
          </div>
          {checkupLive ? <span className="live-chip">LIVE</span> : <Pill st={ev.overall} />}
        </div>
        <div className="checkup-grid">
          <div><span>Heart rate</span><b className="mono">{p.vitals.hr} bpm</b></div>
          <div><span>Blood pressure</span><b className="mono">{p.vitals.bp}</b></div>
          <div><span>Temperature</span><b className="mono">{p.vitals.temp.toFixed(1)} °C</b></div>
          <div><span>SpO₂</span><b className="mono">{p.vitals.spo2}%</b></div>
          <div><span>Taken</span><b className="mono">day {p.vitals.day}</b></div>
          <div><span>Personal dose</span><b className="mono">{p.dose.toFixed(0)} mSv</b></div>
        </div>
        <p className="foot-note" style={{ marginBottom: 0 }}>
          Run a Robot Scan (pop-out works) — this card flashes when shared mission state receives new vitals.
        </p>
      </div>

      <div className={`horn ${top}`}>
        {ev.alerts.length === 0 ? (
          <>
            <h2>
              <Pill st="ok" /> Clear to landing
            </h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              Every projection stays inside NASA limits through landing day {meta.landing}. Keep the current plan.
            </p>
          </>
        ) : (
          <>
            <h2>
              <Pill st={top} /> {top === "act" ? "Act now" : nHorn ? "Stall horn: warning before the limit" : "Keep an eye on"}{" "}
              <span className="eyebrow">
                {ev.alerts.length} item{ev.alerts.length > 1 ? "s" : ""}
                {nHorn ? `, ${nHorn} predicted` : ""}
              </span>
            </h2>
            <ul>
              {ev.alerts.slice(0, 5).map((a, i) => (
                <li key={a.tile + i}>
                  <span><Pill st={a.st} /></span>
                  <span className="what">{a.what}</span>
                  <span className="why">
                    {a.why} <span className="tag nasa">{a.src}</span>
                  </span>
                  <span className="plan">
                    <b>{a.st === "act" ? "Do now" : "To stay clear"} · {meta.levels[a.level]}</b>
                    {a.plan}
                  </span>
                </li>
              ))}
            </ul>
            {ev.alerts.length > 5 ? (
              <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13 }}>
                {ev.alerts.length - 5} more watch item{ev.alerts.length - 5 > 1 ? "s" : ""} on the tiles below.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="dash-grid">
        <div>
          {HAZ_ORDER.map((k) => (
            <div className="hazard" key={k}>
              <div className="hazard-head">
                <h3>{meta.hazMeta[k].title}</h3>
                <p>{meta.hazMeta[k].sub}</p>
              </div>
              <div className="tiles">
                {ev.H[k].map((t) => (
                  <div key={t.name} className={`tile ${t.st}${flash[state.selected + k + t.name] ? " flash" : ""}`}>
                    <div className="t-head">
                      <span className="t-name">{t.name}</span>
                      <Pill st={t.st} />
                    </div>
                    <div className="t-val" style={t.txt ? { fontSize: 15, fontFamily: "var(--f-body)" } : undefined}>
                      {t.val}
                      {t.unit ? <small>{t.unit}</small> : null}
                    </div>
                    <Spark values={t.spark} st={t.st} />
                    <div className="t-note">{t.note}</div>
                    <div className="t-lim">
                      {t.lims.map((l) => (
                        <span
                          key={l.label}
                          className={`tag${l.kind === "nasa" ? " nasa" : ""}`}
                          title={l.kind === "nasa" ? "NASA limit" : "Team rule"}
                        >
                          {l.kind === "nasa" ? "NASA" : "TEAM"} {l.label} {l.value}
                        </span>
                      ))}
                      <span className="tag" title={meta.sources[t.src]?.[0] ?? t.src}>
                        {t.src}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="side">
          <div className="panel">
            <h3>Future you</h3>
            <div className="seg" style={{ marginBottom: 10 }}>
              {(["dose", "bmd", "vo2"] as Metric[]).map((m) => (
                <button key={m} aria-pressed={metric === m} onClick={() => onMetric(m)}>
                  {m === "dose" ? "Radiation dose" : m === "bmd" ? "Bone" : "Fitness"}
                </button>
              ))}
            </div>
            <div className="chart-wrap">
              <FutureChart state={state} ev={ev} metric={metric} landing={meta.landing} evaDay={meta.evaDay} />
            </div>
            <Legend state={state} ev={ev} metric={metric} landing={meta.landing} evaDay={meta.evaDay} />
            <p className="foot-note">{NOTES[metric]}</p>
          </div>

          <div className="panel">
            <h3>Why your predictions differ</h3>
            <KV
              rows={[
                ["Sex", p.sex],
                ["Pre-flight VO2max", `${p.preVo2} ml/kg/min`],
                ["Pre-flight bone T-score", p.tscore.toFixed(1)],
                ["Vitamin D", `${p.vitD} ng/ml`],
                ["Carries dormant", p.carries.join(", ")],
              ]}
            />
            <ul className="sens">
              <li>
                <b>Bone sensitivity ×{ev.r.boneSens.toFixed(1)}</b>{" "}
                <span>
                  {ev.r.boneSens > 1
                    ? "Vitamin D below NASA's 35 ng/ml makes the same microgravity cost more bone (team rule)."
                    : "Vitamin D in range, so NASA's average rate applies."}
                </span>
              </li>
              {state.day < meta.evaDay ? (
                <li>
                  <b>Spacewalk margin {(p.preVo2 * p.vo2 / 100 - meta.evaFloor).toFixed(1)} ml/kg/min</b>{" "}
                  <span>
                    NASA's 32.9 floor is {ev.floorPct.toFixed(1)}% of your pre-flight fitness.{" "}
                    {p.preVo2 * p.vo2 / 100 - meta.evaFloor < 1.5 ? "Small margin, so the horn sounds sooner." : "Comfortable margin."}
                  </span>
                </li>
              ) : (
                <li>
                  <b>Spacewalk done</b>{" "}
                  <span>NASA's 32.9 floor was {ev.floorPct.toFixed(1)}% of your pre-flight fitness.</span>
                </li>
              )}
              <li>
                <b>Fainting after landing {p.sex === "female" ? "80%" : "20%"}</b>{" "}
                <span>NASA tilt-test rate for {p.sex === "female" ? "women (small sample, n=6)" : "men"}.</span>
              </li>
              <li>
                <b>Virus risk</b> <span>Carries {p.carries.join(" and ")}. A virus you don't carry can't reactivate.</span>
              </li>
            </ul>
          </div>

          <div className="panel">
            <h3>How this stays in sync</h3>
            <div className="pipeline" style={{ marginBottom: 8 }}>
              <span>Robot / sensors</span>
              <span className="pipe">→</span>
              <span>Backend</span>
              <span className="pipe">→</span>
              <span>This console</span>
            </div>
            <p className="foot-note" style={{ margin: 0 }}>
              The check-up card above is the same vitals object Robot Scan writes. Station heatmap uses the same CO₂ and
              radiation maps Station Sensors writes.
            </p>
          </div>
        </aside>
      </div>

      <p className="foot-note">
        All readings are simulated for the demo. Every threshold is labelled{" "}
        <span className="tag nasa">NASA</span> when it comes from a NASA standard or brief, or{" "}
        <span className="tag">TEAM</span> when it is our own band built on a cited NASA finding. Sources are listed on the
        last pitch slide.
      </p>
      </>
      ) : null}
    </section>
  );
}

const NOTES: Record<Metric, string> = {
  dose: "Straight-line projection at your current daily dose (NASA range 0.44 to 0.88 mSv/day on ISS). Storms add sudden jumps.",
  bmd: "Uses NASA's 1 to 1.5% per month loss without countermeasures, scaled by your sensitivity. The plan line rate is illustrative.",
  vo2: "Uses NASA's average 7% loss over 178 days with exercise. The spacewalk floor is 32.9 ml/kg/min, shown as a share of your own pre-flight fitness.",
};

function Legend({
  state,
  ev,
  metric,
  landing,
  evaDay,
}: {
  state: MissionState;
  ev: Evaluation;
  metric: Metric;
  landing: number;
  evaDay: number;
}) {
  const projCol = projectionColor(state, ev, metric, landing, evaDay);
  return (
    <div className="legend">
      <span><i style={{ borderColor: "var(--fg)" }} />Last 14 days</span>
      <span><i style={{ borderColor: projCol, borderTopStyle: "dashed" }} />If nothing changes</span>
      {metric !== "dose" ? <span><i style={{ borderColor: "var(--ok)", borderTopStyle: "dotted" }} />With prevention plan</span> : null}
    </div>
  );
}

/** Colour of the "if nothing changes" projection: watch when it crosses a limit. */
function projectionColor(state: MissionState, ev: Evaluation, metric: Metric, landing: number, evaDay: number): string {
  const p = state.crew[state.selected];
  const cur = metric === "dose" ? p.hist.dose[p.hist.dose.length - 1] : metric === "bmd" ? p.hist.bmd[p.hist.bmd.length - 1] : p.hist.vo2[p.hist.vo2.length - 1];
  const rate = metric === "dose" ? ev.r.dose : metric === "bmd" ? ev.r.bmd / 30 : ev.r.vo2 / 30;
  const left = landing - state.day;
  const end = cur + rate * left;
  if (metric === "dose") return end >= 600 ? "var(--watch)" : "var(--accent)";
  if (metric === "bmd") return end < 95 ? "var(--watch)" : "var(--accent)";
  return cur + rate * Math.max(0, evaDay - state.day) < ev.floorPct && state.day < evaDay ? "var(--watch)" : "var(--accent)";
}

function FutureChart({
  state,
  ev,
  metric,
  landing,
  evaDay,
}: {
  state: MissionState;
  ev: Evaluation;
  metric: Metric;
  landing: number;
  evaDay: number;
}) {
  const p = state.crew[state.selected];
  const W = 420, Hh = 270, L = 40, R = 10, T = 16, B = 34;
  const d0 = state.day - 13, d1 = landing;

  let hist: number[];
  let rateNow: number;
  let ratePlan: number | null;
  let unit: string;
  let lines: { v: number; label: string; cls: string }[];
  let yMin: number;
  let yMax: number;

  if (metric === "dose") {
    hist = p.hist.dose.slice(-14);
    rateNow = ev.r.dose;
    ratePlan = null;
    unit = "mSv";
    lines = [
      { v: 600, label: "NASA limit 600", cls: "act" },
      { v: 480, label: "Team watch 480", cls: "watch" },
    ];
    yMin = Math.floor((Math.min(...hist) - 20) / 20) * 20;
    yMax = Math.max(620, Math.ceil((p.dose + rateNow * (landing - state.day) + 20) / 20) * 20);
  } else if (metric === "bmd") {
    hist = p.hist.bmd.slice(-14);
    rateNow = ev.r.bmd / 30;
    ratePlan = ev.plan.bmd;
    unit = "% of pre-flight";
    lines = [
      { v: 95, label: "NASA limit 95%", cls: "act" },
      { v: 97.5, label: "Team watch 97.5%", cls: "watch" },
    ];
    yMin = 93;
    yMax = 100;
  } else {
    hist = p.hist.vo2.slice(-14);
    rateNow = ev.r.vo2 / 30;
    ratePlan = ev.plan.vo2;
    unit = "% of pre-flight";
    lines = [{ v: 80, label: "NASA limit 80%", cls: "act" }];
    if (state.day < evaDay) lines.unshift({ v: ev.floorPct, label: `Your spacewalk floor ${ev.floorPct.toFixed(1)}%`, cls: "act" });
    yMin = Math.min(78, Math.floor(ev.floorPct) - 2);
    yMax = 100;
  }
  if (ratePlan != null && Math.abs(ratePlan - rateNow) < 1e-6) ratePlan = null;

  const x = (d: number) => L + ((d - d0) / (d1 - d0)) * (W - L - R);
  const y = (v: number) => T + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * (Hh - T - B);

  const grid: JSX.Element[] = [];
  const step = yMax - yMin > 60 ? 40 : yMax - yMin > 12 ? 5 : 1;
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    grid.push(
      <g key={`y${v}`}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
        <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{v}</text>
      </g>,
    );
  }
  for (let d = Math.ceil(d0 / 20) * 20; d <= d1; d += 20) {
    grid.push(
      <text key={`x${d}`} x={x(d)} y={Hh - B + 16} textAnchor="middle" fontSize={11} fill="var(--muted)">
        {d}
      </text>,
    );
  }
  grid.push(
    <text key="xlabel" x={(L + W - R) / 2} y={Hh - 4} textAnchor="middle" fontSize={11} fill="var(--faint)">
      Mission day
    </text>,
  );

  for (const l of lines) {
    grid.push(
      <g key={l.label}>
        <line
          x1={L}
          x2={W - R}
          y1={y(l.v)}
          y2={y(l.v)}
          stroke={`var(--${l.cls})`}
          strokeWidth={1.5}
          strokeDasharray={l.cls === "watch" ? "4 4" : "0"}
        />
        <text x={W - R - 4} y={y(l.v) - 5} textAnchor="end" fontSize={11} fill={`var(--${l.cls})`}>
          {l.label}
        </text>
      </g>,
    );
  }

  const mark = (d: number, label: string, end: boolean) => (
    <g key={`m${label}`}>
      <line x1={x(d)} x2={x(d)} y1={T} y2={Hh - B} stroke="var(--line-2)" strokeDasharray="2 3" />
      <text
        x={end ? x(d) - 3 : x(d) + 3}
        y={Hh - B - 4}
        textAnchor={end ? "end" : "start"}
        fontSize={10}
        fill="var(--muted)"
      >
        {label}
      </text>
    </g>
  );
  grid.push(mark(state.day, "Today", false));
  grid.push(mark(landing, "Landing", true));
  if (metric === "vo2" && state.day < evaDay) grid.push(mark(evaDay, "Spacewalk", false));

  const histPts = hist
    .map((v, i) => `${x(state.day - hist.length + 1 + i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const cur = hist[hist.length - 1];

  const endNow = cur + rateNow * (landing - state.day);
  const projCol = projectionColor(state, ev, metric, landing, evaDay);

  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label={`Projection of ${unit} to landing`}>
      {grid}
      <polyline points={histPts} fill="none" stroke="var(--fg)" strokeWidth={2} />
      <line
        x1={x(state.day)}
        y1={y(cur)}
        x2={x(landing)}
        y2={y(endNow)}
        stroke={projCol}
        strokeWidth={2}
        strokeDasharray="6 5"
      />
      {ratePlan != null ? (
        <line
          x1={x(state.day)}
          y1={y(cur)}
          x2={x(landing)}
          y2={y(cur + ratePlan * (landing - state.day))}
          stroke="var(--ok)"
          strokeWidth={2}
          strokeDasharray="2 4"
        />
      ) : null}
      <circle cx={x(state.day)} cy={y(cur)} r={4} fill="var(--fg)" />
    </svg>
  );
}