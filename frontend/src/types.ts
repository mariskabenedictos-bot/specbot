export type Status = "ok" | "watch" | "act";

export interface Limit {
  label: string;
  value: string;
  kind: string;
}

export interface Tile {
  name: string;
  val: string;
  unit: string;
  st: Status;
  spark?: number[];
  note: string;
  lims: Limit[];
  src: string;
  txt?: boolean;
}

export interface Alert {
  tile: string;
  st: Status;
  horn?: boolean;
  what: string;
  why: string;
  plan: string;
  level: string;
  src: string;
  metric?: string;
}

export interface Vitals {
  hr: number;
  bp: string;
  temp: number;
  spo2: number;
  day: number;
}

export interface Hist {
  dose: number[];
  bmd: number[];
  vo2: number[];
  muscle: number[];
  sleep: number[];
}

export interface Person {
  name: string;
  sex: string;
  role: string;
  preVo2: number;
  tscore: number;
  vitD: number;
  carries: string[];
  at: string;
  slot: number;
  dose: number;
  bmd: number;
  muscle: number;
  vo2: number;
  sleepBase: number;
  vitals: Vitals;
  hist: Hist;
  bfo: number[];
  exercise: number;
  stress: string;
  mood: string;
  shedding: string;
  lymph: string;
  vision: string;
  skin: string;
  stand: string;
  headache: boolean;
  doseRate: number;
}

export interface LogEntry {
  who: string;
  msg: string;
  day: number;
}

export interface Run {
  scenario: string | null;
  step: number;
}

export interface RobotState {
  at: string;
  slot: number;
  activity: string;
  busy: boolean;
  paused: boolean;
  targetCrew: string;
}

export interface MissionState {
  day: number;
  selected: string;
  spe: string;
  robot: RobotState;
  co2: Record<string, number>;
  rad: Record<string, number>;
  crew: Record<string, Person>;
  log: LogEntry[];
  rev: number;
  run: Run;
}

export interface Rates {
  bmd: number;
  vo2: number;
  muscle: number;
  dose: number;
  boneSens: number;
}

export interface Evaluation {
  H: Record<string, Tile[]>;
  alerts: Alert[];
  overall: Status;
  factors: string[];
  r: Rates;
  doseLand: number;
  bmdLand: number;
  vo2Eva: number;
  mlEva: number;
  floorPct: number;
  plan: { bmd: number; vo2: number };
}

export interface EnvHistoryEntry {
  day: number;
  reason: string;
  spe: string;
  co2: Record<string, number>;
  rad: Record<string, number>;
}

export interface RobotHistoryEntry {
  day: number;
  crew: string;
  action: string;
  title: string;
  readings: Record<string, unknown>;
  message: string;
}

export interface Envelope {
  state: MissionState;
  evals: Record<string, Evaluation>;
  envHistory: EnvHistoryEntry[];
  robotHistory: RobotHistoryEntry[];
}

export interface Ping {
  mod: string;
  tone: string;
}

export interface StepResult extends Envelope {
  actor: string;
  message: string;
  speak: string | null;
  pings: Ping[];
  done: boolean;
}

export interface ModuleDef {
  id: string;
  name: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
  v?: boolean;
  lx: number;
  ly: number;
  shielded?: boolean;
}

export interface RegionDef {
  id: string;
  name: string;
  x: number;
  y: number;
  side: string;
  ly: number;
  tiles: string[];
}

export interface Meta {
  sources: Record<string, [string, string]>;
  modules: ModuleDef[];
  links: [string, string][];
  hazMeta: Record<string, { title: string; sub: string }>;
  regions: RegionDef[];
  levels: Record<string, string>;
  landing: number;
  evaDay: number;
  evaFloor: number;
}

export interface ScenarioMeta {
  id: string;
  cat: string;
  title: string;
  sub: string;
}
