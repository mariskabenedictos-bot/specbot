import type { Evaluation, Meta, MissionState, Status, Tile } from "../types";
import { Pill } from "./ui";

const SEV: Record<Status, number> = { ok: 0, watch: 1, act: 2 };
const worst = (a: Status, b: Status): Status => (SEV[a] >= SEV[b] ? a : b);

const SHORT: Record<string, string> = {
  "Cabin CO2 where you sleep": "CO2",
  "Sleep, 7-night average": "sleep",
  "Mood and focus check-in": "mood",
  "Vision and eye (SANS)": "vision",
  "Virus shedding in saliva": "virus",
  "Immune risk factors": "risk factors",
  "Fainting risk after landing": "fainting risk",
  "Stand test before landing": "stand test",
  "Career effective dose": "dose",
  "Blood-forming organ dose, 30 days": "marrow dose",
  "Lymphocytes after a solar storm": "lymphocytes",
  "Solar storm alert": "storm",
  "Skin camera check": "rash",
  "Hip and spine bone density": "bone",
  "Vitamin D (25-OH)": "vitamin D",
  "Muscle strength": "strength",
  "Aerobic capacity (VO2max)": "VO2max",
  "Exercise sessions this week": "exercise",
};

function short(t: Tile): string {
  const name = SHORT[t.name] || t.name;
  return t.txt ? name : `${name} ${t.val}${t.unit && t.unit.length < 7 ? " " + t.unit : ""}`;
}

export function BodyMap({
  state,
  ev,
  meta,
  selRegion,
  onSelect,
}: {
  state: MissionState;
  ev: Evaluation;
  meta: Meta;
  selRegion: string | null;
  onSelect: (id: string) => void;
}) {
  const p = state.crew[state.selected];
  const all: Record<string, Tile> = {};
  for (const k in ev.H) for (const t of ev.H[k]) all[t.name] = t;

  const regions = meta.regions.map((r) => {
    const tiles = r.tiles.map((n) => all[n]).filter(Boolean);
    let st: Status = "ok";
    for (const t of tiles) st = worst(st, t.st);
    const issues = tiles.filter((t) => t.st !== "ok");
    const alert = ev.alerts.find((a) => r.tiles.includes(a.tile));
    return { ...r, tiles, st, issues, alert };
  });

  return (
    <div className="panel body-panel">
      <div className="loghead">
        <h3 style={{ fontSize: 16 }}>
          Body status: <span>{p.name}</span>
        </h3>
        <span className="eyebrow">Select a marker for its summary</span>
      </div>

      <div className="body-grid">
        <div className="figure">
          <svg id="body" viewBox="0 0 460 540" role="img" aria-label="Full-body status map with markers for each body area">
            <g fill="var(--panel-2)" stroke="var(--line-2)" strokeWidth="1.6">
              <ellipse cx="230" cy="54" rx="30" ry="37" />
              <rect x="219" y="86" width="22" height="20" rx="6" />
              <path d="M176 108 Q230 94 284 108 Q292 112 290 130 L286 196 Q280 250 272 306 L188 306 Q180 250 174 196 L170 130 Q168 112 176 108 Z" />
              <rect x="148" y="112" width="24" height="182" rx="12" transform="rotate(8 160 112)" />
              <rect x="288" y="112" width="24" height="182" rx="12" transform="rotate(-8 300 112)" />
              <ellipse cx="139" cy="300" rx="12" ry="15" />
              <ellipse cx="321" cy="300" rx="12" ry="15" />
              <rect x="190" y="296" width="38" height="214" rx="17" />
              <rect x="232" y="296" width="38" height="214" rx="17" />
              <ellipse cx="206" cy="514" rx="22" ry="9" />
              <ellipse cx="254" cy="514" rx="22" ry="9" />
            </g>
            <g fill="none" stroke="var(--line-2)" strokeWidth="1.2" opacity=".9">
              <line x1="230" y1="110" x2="230" y2="282" strokeDasharray="3 4" />
              <path d="M196 282 Q230 306 264 282" />
              <path d="M200 136 Q230 128 260 136 M198 152 Q230 144 262 152 M200 168 Q230 160 260 168" />
              <path d="M246 140 q8 -8 14 0 q6 8 -14 22 q-20 -14 -14 -22 q6 -8 14 0" transform="translate(-6,4)" />
            </g>

            {regions.map((r) => {
              const lx = r.side === "L" ? 8 : 452;
              const anchor = r.side === "L" ? "start" : "end";
              const elbow = r.side === "L" ? 120 : 340;
              const col = `var(--${r.st})`;
              const label = r.st === "ok" ? "OK" : (r.st === "act" ? "ACT NOW: " : "WATCH: ") + (r.issues[0] ? short(r.issues[0]) : "");
              return (
                <g
                  key={r.id}
                  className="hot"
                  id={`bm-${r.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={r.name}
                  onClick={() => onSelect(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(r.id);
                    }
                  }}
                >
                  <polyline
                    className="lead"
                    points={`${r.x},${r.y} ${elbow},${r.ly} ${r.side === "L" ? 112 : 348},${r.ly}`}
                    fill="none"
                    stroke={r.st === "ok" ? "var(--line-2)" : col}
                    strokeWidth="1"
                  />
                  <circle className="pulse" cx={r.x} cy={r.y} r="9" fill="none" stroke={col} strokeWidth="2" style={{ display: r.st === "ok" ? "none" : "" }} />
                  <circle className="m" cx={r.x} cy={r.y} r="8" fill={col} stroke="var(--panel)" strokeWidth="2" />
                  <text x={lx} y={r.ly - 4} textAnchor={anchor} fontSize="13" fontWeight="600" fill="var(--fg)">
                    {r.name}
                  </text>
                  <text className="st" x={lx} y={r.ly + 12} textAnchor={anchor} fontSize="11.5" fill={col} fontFamily="IBM Plex Mono, monospace">
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="regions">
          {regions.map((r) => (
            <div
              key={r.id}
              className={`region ${r.st}${selRegion === r.id ? " sel" : ""}`}
              id={`rg-${r.id}`}
              onClick={() => onSelect(r.id)}
            >
              <h4>
                {r.name} <Pill st={r.st} />
              </h4>
              <ul>
                {r.tiles.map((t) => (
                  <li key={t.name} className={t.st}>
                    <span>{t.name}</span>
                    <span>
                      {t.val}
                      {t.unit && !t.txt ? " " + t.unit : ""}
                    </span>
                  </li>
                ))}
                {r.id === "heart" ? (
                  <li>
                    <span>Last check-up (day {p.vitals.day})</span>
                    <span>
                      {p.vitals.hr} bpm, {p.vitals.bp}
                    </span>
                  </li>
                ) : null}
              </ul>
              <p className="sum">
                {r.st === "ok" ? "All readings in range." : (r.alert ? r.alert.why : r.issues[0]?.note)}
              </p>
              {r.alert && r.st !== "ok" ? (
                <p className="do">
                  <b>
                    {r.alert.st === "act" ? "Do now" : "To stay clear"} · {meta.levels[r.alert.level]}
                  </b>
                  {r.alert.plan}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}