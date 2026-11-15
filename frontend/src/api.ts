import type { Envelope, Meta, ScenarioMeta, StepResult } from "./types";

const BASE = "/api";

async function req<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      /* keep status text */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

export interface RobotActionMeta {
  id: string;
  label: string;
  sub: string;
  duration_ms: number;
}

export interface RobotCompleteResult extends Envelope {
  actor: string;
  message: string;
  speak: string | null;
  telemetry: {
    title: string;
    readings: Record<string, unknown>;
    message: string;
    speak?: string;
    activity: string;
  };
}

export const api = {
  state: () => req<Envelope>("/state"),
  meta: () => req<Meta>("/meta"),
  scenarios: () => req<ScenarioMeta[]>("/scenarios"),
  robotActions: () => req<RobotActionMeta[]>("/robot/actions"),
  select: (crew: string) => req<Envelope>("/select", { crew }),
  reset: () => req<Envelope>("/reset", {}),
  start: (id: string) => req<Envelope>("/scenario/start", { id }),
  next: () => req<StepResult>("/scenario/next", {}),
  stop: () => req<Envelope>("/scenario/stop", {}),
  robotPause: (paused: boolean) => req<Envelope>("/robot/pause", { paused }),
  robotStart: (id: string, crew?: string) =>
    req<Envelope & { action: string; crew: string; duration_ms: number; label: string }>(
      "/robot/action/start",
      { id, crew },
    ),
  robotComplete: (id: string, crew?: string) =>
    req<RobotCompleteResult>("/robot/action/complete", { id, crew }),
  envUpdate: (body: { module?: string; co2?: number; rad?: number; spe?: string }) =>
    req<Envelope>("/env/update", body),
};

export function missionWsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws/mission`;
}
