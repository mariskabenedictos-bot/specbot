import { useCallback, useEffect, useRef, useState } from "react";
import { api, missionWsUrl, type RobotActionMeta } from "../api";
import type { Envelope, Meta, ScenarioMeta, StepResult } from "../types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useMission() {
  const [data, setData] = useState<Envelope | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [robotActions, setRobotActions] = useState<RobotActionMeta[]>([]);
  const [running, setRunning] = useState(false);
  const [flowWho, setFlowWho] = useState<string | null>(null);
  const [speech, setSpeech] = useState<{ text: string; n: number } | null>(null);
  const [pings, setPings] = useState<{ id: number; mod: string; tone: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "down">("connecting");

  const runToken = useRef(0);
  const applyRef = useRef<(e: Envelope) => void>(() => undefined);

  const apply = useCallback((e: Envelope) => {
    setData(e);
  }, []);
  applyRef.current = apply;

  useEffect(() => {
    Promise.all([api.state(), api.meta(), api.scenarios(), api.robotActions()])
      .then(([d, m, s, ra]) => {
        setData(d);
        setMeta(m);
        setScenarios(s);
        setRobotActions(ra);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: number | undefined;

    const connect = () => {
      if (closed) return;
      setWsStatus("connecting");
      ws = new WebSocket(missionWsUrl());
      ws.onopen = () => setWsStatus("live");
      ws.onmessage = (ev) => {
        try {
          applyRef.current(JSON.parse(ev.data) as Envelope);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        setWsStatus("down");
        if (!closed) retry = window.setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      ws?.close();
    };
  }, []);

  const select = async (crew: string) => {
    if (!data || crew === data.state.selected) return;
    setData(await api.select(crew));
  };

  const runScenario = async (id: string) => {
    if (running) return;
    if (id === "reset") {
      runToken.current++;
      setRunning(false);
      setFlowWho(null);
      setData(await api.reset());
      return;
    }
    const token = ++runToken.current;
    setRunning(true);
    setError(null);
    try {
      const started = await api.start(id);
      if (token !== runToken.current) return;
      setData(started);

      while (token === runToken.current) {
        await wait(2200);
        if (token !== runToken.current) return;
        const res: StepResult = await api.next();
        if (token !== runToken.current) return;
        setData(res);
        setFlowWho(res.actor);
        if (res.speak) setSpeech({ text: res.speak, n: Date.now() });
        if (res.pings.length) setPings(res.pings.map((p, i) => ({ ...p, id: Date.now() + i })));
        if (res.done) break;
      }

      await wait(900);
      if (token !== runToken.current) return;
      setData(await api.stop());
    } catch (e) {
      setError(String(e));
    } finally {
      if (token === runToken.current) {
        setRunning(false);
        setFlowWho(null);
      }
    }
  };

  return {
    data,
    setData,
    meta,
    scenarios,
    robotActions,
    running,
    flowWho,
    speech,
    setSpeech,
    pings,
    error,
    wsStatus,
    select,
    runScenario,
  };
}
