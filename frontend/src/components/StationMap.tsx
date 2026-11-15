import { useEffect, useRef, useState } from "react";
import type { Meta, MissionState } from "../types";

const modById = (meta: Meta, id: string) => meta.modules.find((m) => m.id === id)!;
const center = (meta: Meta, id: string) => {
  const m = modById(meta, id);
  return { x: m.x + m.w / 2, y: m.y + m.h / 2 };
};

function slotPos(meta: Meta, mod: string, slot: number, isRobot: boolean) {
  const m = modById(meta, mod);
  const c = { x: m.x + m.w / 2, y: m.y + m.h / 2 };
  if (m.v) return isRobot ? { x: c.x, y: m.y + m.h - 24 } : { x: c.x, y: m.y + 20 + slot * 26 };
  return isRobot ? { x: m.x + m.w - 22, y: c.y } : { x: m.x + 20 + slot * 26, y: c.y };
}

function route(meta: Meta, a: string, b: string): string[] {
  const prev: Record<string, string | null> = { [a]: null };
  const queue = [a];
  while (queue.length) {
    const n = queue.shift()!;
    if (n === b) break;
    for (const [u, v] of meta.links) {
      const nx = u === n ? v : v === n ? u : null;
      if (nx && !(nx in prev)) {
        prev[nx] = n;
        queue.push(nx);
      }
    }
  }
  const path: string[] = [];
  let n: string | null = b;
  while (n != null) {
    path.unshift(n);
    n = prev[n];
  }
  return path;
}

interface Target {
  mod: string;
  x: number;
  y: number;
}

/** Walks a mover through module centres, then to its slot, like the original demo. */
function useTravel(meta: Meta, target: Target) {
  const [pos, setPos] = useState({ x: target.x, y: target.y });
  const cur = useRef<{ mod: string | null; x: number; y: number }>({ mod: null, x: target.x, y: target.y });
  const token = useRef(0);

  useEffect(() => {
    const c = cur.current;
    const tok = ++token.current;
    if (c.mod === null) {
      cur.current = { mod: target.mod, x: target.x, y: target.y };
      setPos({ x: target.x, y: target.y });
      return;
    }
    if (c.mod === target.mod && c.x === target.x && c.y === target.y) return;

    const hops: { x: number; y: number }[] = [];
    if (c.mod !== target.mod) {
      hops.push(center(meta, c.mod));
      for (const id of route(meta, c.mod, target.mod).slice(1, -1)) hops.push(center(meta, id));
      hops.push(center(meta, target.mod));
    }
    hops.push({ x: target.x, y: target.y });
    cur.current = { mod: target.mod, x: target.x, y: target.y };

    let i = 0;
    let timer = 0;
    const tick = () => {
      if (token.current !== tok) return;
      setPos(hops[i]);
      i += 1;
      if (i < hops.length) timer = window.setTimeout(tick, 360);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [meta, target.mod, target.x, target.y]);

  return pos;
}

function Mover({ meta, target, children }: { meta: Meta; target: Target; children: React.ReactNode }) {
  const pos = useTravel(meta, target);
  return (
    <g className="mover" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
      {children}
    </g>
  );
}

export function StationMap({
  state,
  meta,
  running,
  speech,
  pings,
  children,
  selectedModule,
  onSelectModule,
}: {
  state: MissionState;
  meta: Meta;
  running: boolean;
  speech: { text: string; n: number } | null;
  pings: { id: number; mod: string; tone: string }[];
  children?: React.ReactNode;
  selectedModule?: string | null;
  onSelectModule?: (id: string) => void;
}) {
  const [rings, setRings] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const seenPings = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!pings.length) return;
    const fresh = pings.filter((p) => !seenPings.current.has(p.id));
    if (!fresh.length) return;
    const added = fresh.map((p) => {
      const m = modById(meta, p.mod);
      return {
        id: p.id,
        x: m.v ? m.x + m.w - 9 : m.x + 10,
        y: m.v ? m.y + 9 : m.y + 10,
        color: p.tone === "act" ? "var(--act)" : p.tone === "watch" ? "var(--watch)" : "#7fd0ff",
      };
    });
    for (const p of fresh) seenPings.current.add(p.id);
    setRings((r) => [...r, ...added]);
    const timer = setTimeout(() => {
      const ids = new Set(added.map((a) => a.id));
      setRings((r) => r.filter((x) => !ids.has(x.id)));
    }, 1500);
    return () => clearTimeout(timer);
  }, [pings, meta]);

  useEffect(() => {
    if (!speech) return;
    const show = setTimeout(() => setBubble(speech.text), 900);
    const hide = setTimeout(() => setBubble(null), 3300);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [speech]);

  const robotTarget: Target = { mod: state.robot.at, ...slotPos(meta, state.robot.at, 0, true) };

  const storm = state.spe === "alert";
  const led = storm ? "var(--act)" : running ? "var(--watch)" : "var(--ok)";
  const bubbleW = bubble ? Math.max(90, bubble.length * 6.4 + 20) : 160;

  return (
    <div className="panel station">
      <svg id="station" viewBox="0 14 680 456" role="img" aria-label="Station map with modules, sensors, crew and the SPECC robot">
        <defs>
          <linearGradient id="arr" x1="0" x2="1">
            <stop offset="0" stopColor="#2a4a7a" />
            <stop offset="1" stopColor="#1c3354" />
          </linearGradient>
          <pattern id="cells" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="url(#arr)" />
            <path d="M0 0H8M0 0V8" stroke="#40639a" strokeWidth=".8" />
          </pattern>
        </defs>

        {Array.from({ length: 60 }, (_, i) => (
          <circle key={`s${i}`} cx={(i * 97) % 680} cy={(i * 53 + (i % 7) * 31) % 470} r={i % 5 ? 0.6 : 1.1} fill="var(--faint)" />
        ))}

        <rect x="219" y="34" width="12" height="404" fill="#3a4a5c" stroke="#55677a" />
        {[30, 400].map((yy) =>
          [128, 238].map((xx) => (
            <rect key={`a${xx}-${yy}`} x={xx} y={yy} width="84" height="40" fill="url(#cells)" stroke="#5a7fb8" strokeWidth="1" />
          )),
        )}
        <rect x="190" y="104" width="70" height="22" fill="#cfd8e2" opacity=".18" />
        <rect x="190" y="326" width="70" height="22" fill="#cfd8e2" opacity=".18" />

        <text x="14" y="22" fontSize="11" fill="var(--muted)" letterSpacing="1">STATION MAP</text>
        <text
          x="666"
          y="22"
          fontSize="11"
          fill={storm ? "var(--act)" : state.spe === "watch" ? "var(--watch)" : "var(--muted)"}
          textAnchor="end"
        >
          Space weather: {storm ? "SOLAR STORM ALERT" : state.spe === "watch" ? "watch" : "quiet"}
        </text>
        <text x="666" y="458" fontSize="10" fill="var(--faint)" textAnchor="end">
          Sample layout based on the ISS, not to scale. Shelter location is illustrative.
        </text>

        <circle cx="340" cy="404" r="13" fill="var(--panel-2)" stroke="var(--line-2)" strokeWidth="1.5" />
        <text x="358" y="408" fontSize="10" fill="var(--faint)">Cupola</text>

        <g opacity={storm ? 1 : 0}>
          {Array.from({ length: 28 }, (_, i) => (
            <line
              key={`p${i}`}
              className="particle"
              x1={30 + ((i * 23) % 640)}
              y1={40 + ((i * 37) % 380)}
              x2={22 + ((i * 23) % 640)}
              y2={52 + ((i * 37) % 380)}
              stroke="var(--act)"
              strokeWidth="1.6"
              style={{ animationDelay: `${(i % 9) * 0.17}s` }}
            />
          ))}
        </g>

        {meta.modules.map((m) => {
          const rad = state.rad[m.id];
          const co2 = state.co2[m.id];
          const hot = rad > 2 && !m.shielded;
          const warm = co2 >= 2.5;
          const rx = m.v ? m.w / 2 : m.h / 2;
          const cx = m.x + m.w / 2;
          const cy = m.y + m.h / 2;
          return (
            <g
              key={m.id}
              id={`mod-${m.id}`}
              style={{ cursor: onSelectModule ? "pointer" : undefined }}
              onClick={() => onSelectModule?.(m.id)}
            >
              <rect
                className="modbody"
                x={m.x}
                y={m.y}
                width={m.w}
                height={m.h}
                rx={Math.min(rx, 22)}
                fill={hot ? "var(--act-bg)" : warm ? "var(--watch-bg)" : "var(--panel-2)"}
                stroke={
                  selectedModule === m.id ? "var(--accent)" : m.shielded ? "var(--accent)" : "#6a7d92"
                }
                strokeWidth={selectedModule === m.id ? 3.5 : m.shielded ? 3.5 : 1.4}
              />
              {/* Module furniture / role cues */}
              {m.id === "gym" ? (
                <>
                  <rect x={cx - 8} y={m.y + 18} width="16" height="28" rx="2" fill="#6a7d92" opacity=".55" />
                  <rect x={cx - 14} y={m.y + m.h - 36} width="28" height="8" rx="2" fill="#8db4ff" opacity=".7" />
                </>
              ) : null}
              {m.id === "quarters" ? (
                <>
                  <rect x={m.x + 14} y={cy - 10} width="18" height="22" rx="3" fill="#7a8ea3" opacity=".5" />
                  <rect x={m.x + m.w - 32} y={cy - 8} width="16" height="16" rx="2" fill="#9aabbc" opacity=".45" />
                </>
              ) : null}
              {m.id === "lab" || m.id === "columbus" || m.id === "kibo" ? (
                <rect x={cx - 12} y={cy - 8} width="24" height="14" rx="2" fill="#5a7fb8" opacity=".4" />
              ) : null}
              {m.id === "shelter" ? (
                <rect
                  x={m.x + 10}
                  y={m.y + 10}
                  width={m.w - 20}
                  height={m.h - 20}
                  rx="8"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity=".8"
                />
              ) : null}
              {/* CO2 haze fills more of the module as levels rise */}
              {warm ? (
                <rect
                  x={m.x + 4}
                  y={m.y + 4}
                  width={m.w - 8}
                  height={m.h - 8}
                  rx={Math.min(rx, 18)}
                  fill="var(--watch)"
                  opacity={co2 >= 3 ? 0.28 : 0.14}
                />
              ) : null}
              {/* Radiation: denser particle streaks */}
              {hot
                ? Array.from({ length: 5 }, (_, i) => (
                    <line
                      key={`rad-${m.id}-${i}`}
                      className="particle"
                      x1={m.x + 8 + i * 10}
                      y1={m.y + 8}
                      x2={m.x + 2 + i * 10}
                      y2={m.y + m.h - 8}
                      stroke="var(--act)"
                      strokeWidth="1.4"
                      opacity=".75"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))
                : null}
              {m.v ? (
                <line x1={m.x + 6} x2={m.x + m.w - 6} y1={m.y + m.h / 2} y2={m.y + m.h / 2} stroke="var(--line)" />
              ) : (
                <line x1={m.x + m.w / 2} x2={m.x + m.w / 2} y1={m.y + 6} y2={m.y + m.h - 6} stroke="var(--line)" />
              )}
              <circle
                className="sensor-dot"
                cx={m.v ? m.x + m.w - 9 : m.x + 10}
                cy={m.v ? m.y + 9 : m.y + 10}
                r={hot || warm ? 5 : 3.5}
                fill={hot ? "var(--act)" : warm ? "var(--watch)" : "#7fd0ff"}
              />
              {(hot || warm) && (
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={hot ? "var(--act)" : "var(--watch)"}
                >
                  {hot ? "RAD↑" : "CO₂↑"}
                </text>
              )}
              <text x={m.lx} y={m.ly} fontSize="12" fontWeight="600" fill="var(--fg)">
                {m.name}
              </text>
              <text x={m.lx} y={m.ly + 13} fontSize="10" fill={m.shielded ? "var(--accent)" : "var(--muted)"}>
                {m.sub}
              </text>
            </g>
          );
        })}

        <g id="fx">
          {rings.map((r) => (
            <circle key={r.id} className="ring" cx={r.x} cy={r.y} r={14} fill="none" stroke={r.color} strokeWidth={2} />
          ))}
        </g>

        {Object.keys(state.crew).map((id) => {
          const p = state.crew[id];
          return (
            <Mover key={id} meta={meta} target={{ mod: p.at, ...slotPos(meta, p.at, p.slot, false) }}>
              <circle r="11" fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth="2" />
              <text y="4" textAnchor="middle" fontSize="11" fill="var(--fg)" fontWeight="600">
                {p.name[0]}
              </text>
            </Mover>
          );
        })}

        <Mover meta={meta} target={robotTarget}>
          <g transform="translate(-12,-18) scale(.6)">
            <rect x="-4" y="22" width="7" height="14" rx="3" fill="#b8c4d2" />
            <rect x="37" y="22" width="7" height="14" rx="3" fill="#b8c4d2" />
            <rect x="2" y="0" width="36" height="58" rx="18" fill="var(--robot)" />
            <rect x="7" y="13" width="26" height="12" rx="6" fill="#1a2533" />
            <circle cx="15" cy="19" r="2.6" fill="var(--accent)" />
            <circle cx="25" cy="19" r="2.6" fill="var(--accent)" />
            <circle cx="20" cy="40" r="4" fill={led} />
          </g>
          <g opacity={bubble ? 1 : 0} style={{ transition: "opacity .3s" }}>
            <rect x={-bubbleW / 2} y="-52" width={bubbleW} height="26" rx="7" fill="var(--robot)" />
            <path d="M-5 -26 L0 -19 L5 -26 Z" fill="var(--robot)" />
            <text x="0" y="-35" textAnchor="middle" fontSize="11" fill="#111922">
              {bubble}
            </text>
          </g>
        </Mover>
      </svg>

      <div className="sensors">
        {meta.modules.map((m) => {
          const rad = state.rad[m.id];
          const co2 = state.co2[m.id];
          const hot = rad > 2 && !m.shielded;
          const warm = co2 >= 2.5;
          return (
            <div
              key={m.id}
              className={`${hot ? "hot" : warm ? "warm" : ""}${selectedModule === m.id ? " selected" : ""}`}
              style={{ cursor: onSelectModule ? "pointer" : undefined }}
              onClick={() => onSelectModule?.(m.id)}
            >
              <b>{m.name}</b>
              <span>
                {rad.toFixed(rad >= 10 ? 0 : 2)} mSv/d · {co2.toFixed(1)} mmHg
              </span>
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
}