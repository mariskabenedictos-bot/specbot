import type { Status } from "../types";

const LABEL: Record<Status, string> = { ok: "OK", watch: "Watch", act: "Act now" };

export function Pill({ st }: { st: Status }) {
  return <span className={`pill ${st}`}>{LABEL[st]}</span>;
}

export function Spark({ values, st }: { values?: number[]; st: Status }) {
  if (!values || values.length < 2) return null;
  const v = values.slice(-14);
  const mn = Math.min(...v);
  const mx = Math.max(...v);
  const span = mx - mn || 1;
  const pts = v.map((y, i) => `${((i / (v.length - 1)) * 196 + 2).toFixed(1)},${(26 - ((y - mn) / span) * 22).toFixed(1)}`);
  const last = pts[pts.length - 1].split(",");
  const col = `var(--${st === "ok" ? "accent" : st})`;
  return (
    <svg viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={col} />
    </svg>
  );
}

export function KV({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Num({ v, d = 1 }: { v: number; d?: number }) {
  return <>{v.toFixed(d)}</>;
}