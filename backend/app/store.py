"""In-memory mission store.

The backend is the single source of truth for the demo. There is one mission
state per process; the frontend never simulates mission physics itself.
WebSocket subscribers receive the same envelope after every mutation.
"""

from __future__ import annotations

import asyncio
import threading
from typing import Any, Dict, List, Optional, Set

from . import engine, robot_actions, scenarios
from .spec import MODULES

_lock = threading.Lock()
_state: Dict[str, Any] = engine.initial_state()
_env_history: List[Dict[str, Any]] = []
_robot_history: List[Dict[str, Any]] = []
_subscribers: Set[Any] = set()
_loop: Optional[asyncio.AbstractEventLoop] = None


def _ensure_robot_fields(state: Dict[str, Any]) -> None:
    robot = state.setdefault("robot", {"at": "node", "slot": 2})
    robot.setdefault("activity", "idle")
    robot.setdefault("busy", False)
    robot.setdefault("paused", False)
    robot.setdefault("targetCrew", state.get("selected", "maya"))


def _seed_env_history() -> None:
    global _env_history
    _env_history = []
    _snapshot_env("boot")


def _snapshot_env(reason: str) -> None:
    entry = {
        "day": _state["day"],
        "reason": reason,
        "spe": _state["spe"],
        "co2": dict(_state["co2"]),
        "rad": dict(_state["rad"]),
    }
    _env_history.append(entry)
    if len(_env_history) > 120:
        _env_history.pop(0)


def _log(who: str, msg: str) -> None:
    _state["log"].append({"who": who, "msg": msg, "day": _state["day"]})
    if len(_state["log"]) > 60:
        _state["log"].pop(0)


def _bump() -> None:
    _state["rev"] += 1


def _focus_name() -> str:
    return _state["crew"][_state["selected"]]["name"]


def envelope() -> Dict[str, Any]:
    with _lock:
        _ensure_robot_fields(_state)
        return {
            "state": _state,
            "evals": {cid: engine.evaluate(_state, cid) for cid in _state["crew"]},
            "envHistory": list(_env_history),
            "robotHistory": list(_robot_history),
        }


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def subscribe(ws: Any) -> None:
    _subscribers.add(ws)


def unsubscribe(ws: Any) -> None:
    _subscribers.discard(ws)


def _broadcast(payload: Dict[str, Any]) -> None:
    if not _subscribers or _loop is None:
        return

    async def _send_all() -> None:
        dead = []
        for ws in list(_subscribers):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _subscribers.discard(ws)

    try:
        asyncio.run_coroutine_threadsafe(_send_all(), _loop)
    except Exception:
        pass


def publish(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    data = payload or envelope()
    _broadcast(data)
    return data


def reset() -> Dict[str, Any]:
    global _state, _robot_history
    with _lock:
        keep = _state["selected"]
        _state = engine.initial_state()
        _ensure_robot_fields(_state)
        _state["selected"] = keep if keep in _state["crew"] else "maya"
        _robot_history = []
        _seed_env_history()
        out = {
            "state": _state,
            "evals": {cid: engine.evaluate(_state, cid) for cid in _state["crew"]},
            "envHistory": list(_env_history),
            "robotHistory": list(_robot_history),
        }
    return publish(out)


def select(cid: str) -> Dict[str, Any]:
    with _lock:
        if cid in _state["crew"]:
            _state["selected"] = cid
            _state["robot"]["targetCrew"] = cid
            _bump()
    return publish()


def start(sid: str) -> Optional[Dict[str, Any]]:
    with _lock:
        sc = scenarios.BY_ID.get(sid)
        if not sc:
            return None
        _state["run"] = {"scenario": sid, "step": 0}
        _log("DASHBOARD", f"Scenario started: {sc['title']} (focus: {_focus_name()}). {sc['sub']}")
        _bump()
    return publish()


def next_step() -> Optional[Dict[str, Any]]:
    with _lock:
        run = _state["run"]
        sid = run["scenario"]
        if not sid:
            return None
        sc = scenarios.BY_ID[sid]
        idx = run["step"]
        if idx >= len(sc["steps"]):
            return None

        before_co2 = dict(_state["co2"])
        before_rad = dict(_state["rad"])
        before_spe = _state["spe"]

        actor, fn = sc["steps"][idx]
        ctx = scenarios.Ctx(_state)
        message = fn(ctx)
        _log(actor, message)
        run["step"] = idx + 1
        _bump()

        if (
            _state["co2"] != before_co2
            or _state["rad"] != before_rad
            or _state["spe"] != before_spe
        ):
            _snapshot_env(f"scenario:{sid}:{actor.lower()}")

        result = {
            "actor": actor,
            "message": message,
            "speak": ctx.speaks[-1] if ctx.speaks else None,
            "pings": ctx.pings,
            "done": run["step"] >= len(sc["steps"]),
            "state": _state,
            "evals": {cid: engine.evaluate(_state, cid) for cid in _state["crew"]},
            "envHistory": list(_env_history),
            "robotHistory": list(_robot_history),
        }
    return publish(result)


def stop() -> Dict[str, Any]:
    with _lock:
        _state["run"] = {"scenario": None, "step": 0}
        _state["robot"]["activity"] = "idle"
        _state["robot"]["busy"] = False
    return publish()


def set_robot_paused(paused: bool) -> Dict[str, Any]:
    with _lock:
        _ensure_robot_fields(_state)
        _state["robot"]["paused"] = bool(paused)
        if paused:
            _state["robot"]["activity"] = "paused"
        elif _state["robot"]["activity"] == "paused":
            _state["robot"]["activity"] = "idle"
        _bump()
    return publish()


def begin_robot_action(action_id: str, crew: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with _lock:
        _ensure_robot_fields(_state)
        if _state["robot"].get("paused"):
            return None
        if action_id not in robot_actions.ACTIONS:
            return None
        target = crew or _state["selected"]
        if target not in _state["crew"]:
            return None
        _state["robot"]["busy"] = True
        _state["robot"]["activity"] = "navigate"
        _state["robot"]["targetCrew"] = target
        p = _state["crew"][target]
        _state["robot"]["at"] = p["at"]
        _bump()
        meta = robot_actions.ACTIONS[action_id]
        out = {
            "action": action_id,
            "crew": target,
            "duration_ms": meta["duration_ms"],
            "label": meta["label"],
            **{
                "state": _state,
                "evals": {cid: engine.evaluate(_state, cid) for cid in _state["crew"]},
                "envHistory": list(_env_history),
                "robotHistory": list(_robot_history),
            },
        }
    return publish(out)


def complete_robot_action(action_id: str, crew: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with _lock:
        _ensure_robot_fields(_state)
        target = crew or _state["robot"].get("targetCrew") or _state["selected"]
        result = robot_actions.run(_state, action_id, target)
        if result is None:
            return None
        _log("ROBOT", result["message"])
        entry = {
            "day": _state["day"],
            "crew": target,
            "action": action_id,
            "title": result["title"],
            "readings": result["readings"],
            "message": result["message"],
        }
        _robot_history.append(entry)
        if len(_robot_history) > 80:
            _robot_history.pop(0)
        _state["robot"]["activity"] = "idle"
        _state["robot"]["busy"] = False
        _bump()
        out = {
            "actor": "ROBOT",
            "message": result["message"],
            "speak": result.get("speak"),
            "telemetry": result,
            "state": _state,
            "evals": {cid: engine.evaluate(_state, cid) for cid in _state["crew"]},
            "envHistory": list(_env_history),
            "robotHistory": list(_robot_history),
        }
    return publish(out)


def update_environment(
    module_id: Optional[str] = None,
    co2: Optional[float] = None,
    rad: Optional[float] = None,
    spe: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Apply an environmental sensor update. Only existing metrics/modules allowed."""
    with _lock:
        valid_mods = {m["id"] for m in MODULES}
        if module_id is not None and module_id not in valid_mods:
            return None
        if spe is not None and spe not in ("none", "watch", "alert"):
            return None
        changed = False
        if module_id is not None and co2 is not None:
            _state["co2"][module_id] = float(co2)
            changed = True
        if module_id is not None and rad is not None:
            _state["rad"][module_id] = float(rad)
            changed = True
        if spe is not None:
            _state["spe"] = spe
            changed = True
        if not changed:
            return None
        reason = f"sensor:{module_id or 'station'}"
        _snapshot_env(reason)
        parts = []
        if module_id and co2 is not None:
            parts.append(f"{module_id} CO2 {co2:.1f} mmHg")
        if module_id and rad is not None:
            parts.append(f"{module_id} rad {rad:.2f} mSv/d")
        if spe is not None:
            parts.append(f"space weather {spe}")
        _log("SENSOR", "Environmental update (simulated): " + ", ".join(parts))
        _bump()
    return publish()


def env_snapshot(reason: str = "tick") -> Dict[str, Any]:
    with _lock:
        _snapshot_env(reason)
        _bump()
    return publish()


# Initialise history for a fresh process.
_ensure_robot_fields(_state)
_seed_env_history()
