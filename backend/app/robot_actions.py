"""Interactive SPECC robot check-ups.

Each action mutates the shared mission state the same way the scripted scenarios
do, then returns a short telemetry summary for the 3D UI. All values are
simulated — there is no live medical hardware.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from . import engine
from .spec import EVA_DAY, EVA_FLOOR, MODULES

MOD = {m["id"]: m for m in MODULES}

ActionFn = Callable[[Dict[str, Any], str], Dict[str, Any]]


def _person(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    return state["crew"][crew]


def _go_to_crew(state: Dict[str, Any], crew: str) -> None:
    p = _person(state, crew)
    state["robot"]["at"] = p["at"]
    state["robot"]["slot"] = 1


def _vitals(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    _go_to_crew(state, crew)
    v = p["vitals"]
    v["hr"] = round((64 if p["sex"] == "female" else 58) + engine.jitter(5))
    v["bp"] = f"{round(114 + engine.jitter(6))}/{round(74 + engine.jitter(4))}"
    v["temp"] = 36.6 + engine.jitter(0.2)
    v["spo2"] = round(97 + engine.rnd() * 2)
    v["day"] = state["day"]
    return {
        "title": "Personal biometrics (simulated)",
        "readings": {
            "heart_rate_bpm": v["hr"],
            "blood_pressure": v["bp"],
            "temperature_c": round(v["temp"], 1),
            "spo2_pct": v["spo2"],
        },
        "message": (
            f"Vitals for {p['name']} (simulated): {v['hr']} bpm, {v['bp']}, "
            f"{engine.fmt(v['temp'], 1)} °C, SpO2 {v['spo2']}%."
        ),
        "speak": "Hold still for 10 seconds.",
        "activity": "vitals",
    }


def _dosimetry(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    _go_to_crew(state, crew)
    local = state["rad"].get(p["at"], p["doseRate"])
    # Personal dosimeter samples the module rate; cumulative dose already tracks daily.
    sample = round(local + engine.jitter(0.05), 2)
    return {
        "title": "Personal radiation dosimetry (simulated)",
        "readings": {
            "module": p["at"],
            "module_rate_mSv_d": sample,
            "career_dose_mSv": round(p["dose"], 1),
        },
        "message": (
            f"SPECC dosimeter with {p['name']} in {MOD[p['at']]['name']}: "
            f"{engine.fmt(sample, 2)} mSv/day (simulated). Career dose {engine.fmt(p['dose'], 0)} mSv."
        ),
        "speak": "Dosimeter reading logged.",
        "activity": "dosimetry",
    }


def _skin(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    _go_to_crew(state, crew)
    if p["skin"] == "no change":
        p["skin"] = (
            "spreading or blistering rash, one-sided band"
            if "VZV" in p["carries"]
            else "new rash or dermatitis"
        )
    return {
        "title": "Skin camera check (simulated)",
        "readings": {"skin": p["skin"]},
        "message": f"Skin camera: {p['name']} — {p['skin']} (simulated).",
        "speak": "Let me photograph that.",
        "activity": "skin",
    }


def _vision(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    _go_to_crew(state, crew)
    if p["vision"] == "no change":
        p["vision"] = "new near blur or headache"
    return {
        "title": "Near-vision check (simulated)",
        "readings": {"vision": p["vision"]},
        "message": f"Near-vision card: {p['name']} reports {p['vision']} (simulated).",
        "speak": "Read the bottom line?",
        "activity": "vision",
    }


def _swab(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    _go_to_crew(state, crew)
    if p["shedding"] == "not detected":
        p["shedding"] = "detected, no symptoms"
    return {
        "title": "Saliva swab (simulated)",
        "readings": {"shedding": p["shedding"], "carries": list(p["carries"])},
        "message": f"Saliva swab: {p['carries'][0]} — {p['shedding']} (simulated).",
        "speak": "Saliva swab, please.",
        "activity": "swab",
    }


def _mood(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    _go_to_crew(state, crew)
    if p["mood"] == "as usual":
        p["mood"] = "poor focus several days"
        p["stress"] = "high"
    return {
        "title": "Voice and behavioural check-in (simulated)",
        "readings": {"mood": p["mood"], "stress": p["stress"]},
        "message": f"Voice check-in: {p['name']} reports {p['mood']}; stress {p['stress']} (simulated).",
        "speak": "How have you been feeling?",
        "activity": "mood",
    }


def _exercise(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    p["at"], p["slot"] = "gym", 1
    state["robot"]["at"] = "gym"
    p["exercise"] = min(7, int(p["exercise"]) + 1)
    return {
        "title": "Guided resistance session (simulated)",
        "readings": {"exercise_sessions": p["exercise"]},
        "message": (
            f"ARED session logged for {p['name']}: {p['exercise']} of 6 planned this week (simulated)."
        ),
        "speak": "Rep 12 of 12. Nice!",
        "activity": "exercise",
    }


def _fitness(state: Dict[str, Any], crew: str) -> Dict[str, Any]:
    p = _person(state, crew)
    _go_to_crew(state, crew)
    ml = p["vo2"] * p["preVo2"] / 100
    e = engine.evaluate(state, crew)
    status = "clear"
    note = f"Estimated {engine.fmt(ml, 1)} ml/kg/min."
    if state["day"] < EVA_DAY:
        if ml < EVA_FLOOR:
            status = "below_floor"
            note = f"{note} Under NASA's 32.9 floor."
        elif e["mlEva"] < EVA_FLOOR:
            status = "projected_below"
            note = f"{note} Projected {engine.fmt(e['mlEva'], 1)} on day {EVA_DAY}."
        else:
            note = f"{note} Projected {engine.fmt(e['mlEva'], 1)} on day {EVA_DAY}. Clear of floor."
    return {
        "title": "Spacewalk fitness step test (simulated)",
        "readings": {
            "vo2_ml_kg_min": round(ml, 1),
            "vo2_pct_preflight": round(p["vo2"], 1),
            "eva_floor": EVA_FLOOR,
            "status": status,
        },
        "message": f"Step test for {p['name']}: {note} (simulated).",
        "speak": "3-minute step test.",
        "activity": "fitness",
    }


ACTIONS: Dict[str, Dict[str, Any]] = {
    "vitals": {
        "id": "vitals",
        "label": "Biometric check-up",
        "sub": "Heart rate, BP, temperature, SpO2",
        "duration_ms": 4200,
        "fn": _vitals,
    },
    "dosimetry": {
        "id": "dosimetry",
        "label": "Personal dosimeter",
        "sub": "Module radiation sample",
        "duration_ms": 3600,
        "fn": _dosimetry,
    },
    "skin": {
        "id": "skin",
        "label": "Skin camera",
        "sub": "Photograph skin for rash",
        "duration_ms": 4000,
        "fn": _skin,
    },
    "vision": {
        "id": "vision",
        "label": "Near-vision card",
        "sub": "SANS watch check",
        "duration_ms": 4000,
        "fn": _vision,
    },
    "swab": {
        "id": "swab",
        "label": "Saliva swab",
        "sub": "Dormant virus shedding",
        "duration_ms": 3800,
        "fn": _swab,
    },
    "mood": {
        "id": "mood",
        "label": "Voice check-in",
        "sub": "Mood and focus",
        "duration_ms": 4000,
        "fn": _mood,
    },
    "exercise": {
        "id": "exercise",
        "label": "Guided exercise",
        "sub": "ARED resistance session",
        "duration_ms": 4800,
        "fn": _exercise,
    },
    "fitness": {
        "id": "fitness",
        "label": "Fitness / EVA readiness",
        "sub": "Step test vs 32.9 floor",
        "duration_ms": 4500,
        "fn": _fitness,
    },
}


def meta() -> List[Dict[str, Any]]:
    return [
        {"id": a["id"], "label": a["label"], "sub": a["sub"], "duration_ms": a["duration_ms"]}
        for a in ACTIONS.values()
    ]


def run(state: Dict[str, Any], action_id: str, crew: str) -> Optional[Dict[str, Any]]:
    action = ACTIONS.get(action_id)
    if not action or crew not in state["crew"]:
        return None
    result = action["fn"](state, crew)
    state["robot"]["activity"] = result["activity"]
    state["robot"]["busy"] = False
    return result
