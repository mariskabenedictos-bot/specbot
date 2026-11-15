"""Simulation engine: personal model, mission clock and stall-horn evaluation.

This is a direct port of the demo's in-browser engine. It is pure Python with no
I/O, so the API layer and the frontend both see one consistent prediction.
"""

from __future__ import annotations

import random
from typing import Any, Dict, List, Optional

from .spec import BASE_RAD, EVA_DAY, EVA_FLOOR, LANDING, LEVEL, PLANS

SEV = {"ok": 0, "watch": 1, "act": 2}

_rng = random.Random(7)


def rnd() -> float:
    return _rng.random()


def jitter(amount: float) -> float:
    return (_rng.random() - 0.5) * 2 * amount


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def fmt(value: float, digits: int) -> str:
    return f"{value:.{digits}f}"


def push(series: List[float], value: float, cap: int = 40) -> None:
    series.append(value)
    if len(series) > cap:
        series.pop(0)


def avg(series: List[float]) -> float:
    return sum(series) / len(series)


def worst(a: str, b: str) -> str:
    return a if SEV[a] >= SEV[b] else b


# --------------------------------------------------------------------------
# Personal model
# --------------------------------------------------------------------------

def rates(p: Dict[str, Any], opts: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
    """Rates are %/month for bone, muscle and VO2max; mSv/day for dose."""
    o = opts or {}
    exercise = o["exercise"] if "exercise" in o else p["exercise"]
    vit_d = o["vitD"] if "vitD" in o else p["vitD"]

    bone_sens = 1.2 if vit_d < 35 else 1.0  # team rule: vitamin D below NASA's 35 ng/ml
    bmd = (-0.4 if exercise >= 6 else -0.8 if exercise >= 4 else -1.25) * bone_sens
    vo2 = -1.2 if exercise >= 6 else -2.0 if exercise >= 4 else -3.0
    muscle = -0.5 if exercise >= 6 else -1.5 if exercise >= 4 else -2.5
    return {
        "bmd": bmd,
        "vo2": vo2,
        "muscle": muscle,
        "dose": p["doseRate"],
        "boneSens": bone_sens,
    }


def make_person(o: Dict[str, Any]) -> Dict[str, Any]:
    p: Dict[str, Any] = {
        "exercise": 6,
        "stress": "normal",
        "mood": "as usual",
        "shedding": "not detected",
        "lymph": "at baseline",
        "vision": "no change",
        "skin": "no change",
        "stand": "not done yet",
        "headache": False,
        "doseRate": 0.6,
        "hist": {"dose": [], "bmd": [], "vo2": [], "muscle": [], "sleep": []},
        "bfo": [],
    }
    p.update(o)
    r = rates(p)
    for i in range(13, -1, -1):
        p["hist"]["dose"].append(p["dose"] - r["dose"] * i)
        p["hist"]["bmd"].append(p["bmd"] - r["bmd"] / 30 * i + jitter(0.03))
        p["hist"]["vo2"].append(p["vo2"] - r["vo2"] / 30 * i + jitter(0.15))
        p["hist"]["muscle"].append(p["muscle"] - r["muscle"] / 30 * i + jitter(0.1))
        p["hist"]["sleep"].append(clamp(p["sleepBase"] + jitter(0.4), 4, 9))
    p["bfo"] = [0.6] * 30
    return p


def initial_state() -> Dict[str, Any]:
    global _rng
    _rng = random.Random(7)
    return {
        "day": 180,
        "selected": "maya",
        "spe": "none",
        "robot": {
            "at": "node",
            "slot": 2,
            "activity": "idle",
            "busy": False,
            "paused": False,
            "targetCrew": "maya",
        },
        "co2": {"quarters": 2.1, "columbus": 1.9, "kibo": 1.9, "lab": 2.0,
                "node": 1.9, "gym": 2.2, "zarya": 1.8, "shelter": 1.8},
        "rad": dict(BASE_RAD),
        "crew": {
            "maya": make_person({
                "name": "Maya", "sex": "female", "role": "Flight engineer",
                "preVo2": 35, "tscore": -0.6, "vitD": 31, "carries": ["EBV", "VZV"],
                "at": "lab", "slot": 0, "dose": 448, "bmd": 97.6, "muscle": 93,
                "vo2": 95.5, "sleepBase": 7.3,
                "vitals": {"hr": 64, "bp": "112/72", "temp": 36.7, "spo2": 98, "day": 179},
            }),
            "sam": make_person({
                "name": "Sam", "sex": "male", "role": "Commander",
                "preVo2": 40, "tscore": 0.2, "vitD": 48, "carries": ["EBV"],
                "at": "gym", "slot": 0, "dose": 302, "bmd": 98.2, "muscle": 94,
                "vo2": 96, "sleepBase": 7.2,
                "vitals": {"hr": 58, "bp": "118/76", "temp": 36.6, "spo2": 98, "day": 179},
            }),
        },
        "log": [{"who": "DASHBOARD", "msg": "Simulation ready at mission day 180. No stall horns sounding.", "day": 180}],
        "rev": 0,
        "run": {"scenario": None, "step": 0},
    }


def advance(state: Dict[str, Any], n: int, sleep_for: Optional[str] = None,
            sleep_val: Optional[float] = None) -> None:
    """Move the clock forward n days. sleep_for sets that astronaut's nightly sleep."""
    for _ in range(n):
        state["day"] += 1
        for cid, p in state["crew"].items():
            r = rates(p)
            p["dose"] += r["dose"]
            p["bmd"] += r["bmd"] / 30
            p["vo2"] += r["vo2"] / 30
            p["muscle"] += r["muscle"] / 30
            if cid == sleep_for and sleep_val is not None:
                sl = sleep_val + jitter(0.25)
            else:
                sl = p["sleepBase"] + jitter(0.35)
            push(p["hist"]["dose"], p["dose"])
            push(p["hist"]["bmd"], p["bmd"] + jitter(0.03))
            push(p["hist"]["vo2"], p["vo2"] + jitter(0.15))
            push(p["hist"]["muscle"], p["muscle"] + jitter(0.1))
            push(p["hist"]["sleep"], clamp(sl, 4, 9.5))
            p["bfo"].append(0.6)
            if len(p["bfo"]) > 30:
                p["bfo"].pop(0)


# --------------------------------------------------------------------------
# Stall-horn evaluation
# --------------------------------------------------------------------------

def evaluate(state: Dict[str, Any], cid: str) -> Dict[str, Any]:
    p = state["crew"][cid]
    r = rates(p)
    left = LANDING - state["day"]
    H: Dict[str, List[Dict[str, Any]]] = {"radiation": [], "gravity": [], "immune": [], "environment": []}
    alerts: List[Dict[str, Any]] = []

    def lim(label: str, value: str, kind: str) -> Dict[str, str]:
        return {"label": label, "value": value, "kind": kind}

    # ---- Radiation
    dose_land = p["dose"] + r["dose"] * left
    st = "act" if p["dose"] >= 600 else "watch" if p["dose"] >= 480 else "ok"
    if dose_land >= 600 and st == "ok":
        st = "watch"
        alerts.append({
            "tile": "Career effective dose", "st": "watch", "horn": True,
            "what": "Career dose heading past NASA's 600 mSv limit",
            "why": f"Projected {fmt(dose_land, 0)} mSv by landing.",
            "plan": "Plan shielded sleep and work spots. Move to the storm shelter before storms.",
            "level": "crewmate", "src": "TB020",
        })
    H["radiation"].append({
        "name": "Career effective dose", "val": fmt(p["dose"], 0), "unit": "mSv", "st": st,
        "spark": p["hist"]["dose"],
        "note": f"Projected at landing: {fmt(dose_land, 0)} mSv",
        "lims": [lim("Limit", "600", "nasa"), lim("Watch", "480", "team")], "src": "TB020",
    })

    spe_st = "act" if state["spe"] == "alert" else "watch" if state["spe"] == "watch" else "ok"
    H["radiation"].append({
        "name": "Solar storm alert", "unit": "", "st": spe_st,
        "val": "ALERT" if state["spe"] == "alert" else "WATCH" if state["spe"] == "watch" else "None",
        "note": ("Go to the storm shelter now." if state["spe"] == "alert"
                 else "Space-weather watch. Know your route to the shelter."
                 if state["spe"] == "watch" else "No solar particle event forecast."),
        "lims": [lim("Shelter rule", "alert", "nasa")], "src": "TB020",
    })
    if spe_st == "act":
        alerts.append({
            "tile": "Solar storm alert", "st": "act", "what": "Solar storm alert active",
            "why": "NASA requires a protected area during solar particle events (V2 6100).",
            "plan": "Go to the storm shelter now. SPECC will guide you.", "level": "surgeon", "src": "TB020",
        })

    bfo30 = sum(p["bfo"])
    H["radiation"].append({
        "name": "Blood-forming organ dose, 30 days", "val": fmt(bfo30, 1), "unit": "mGy-Eq",
        "st": "act" if bfo30 >= 250 else "watch" if bfo30 >= 200 else "ok",
        "note": "Short-term limit protects bone marrow.",
        "lims": [lim("Limit", "250", "nasa"), lim("Watch", "200", "team")], "src": "HRPRAD",
    })

    ly_st = "act" if p["lymph"] == "well below baseline" else "watch" if p["lymph"] == "below baseline" else "ok"
    H["radiation"].append({
        "name": "Lymphocytes after a solar storm", "val": p["lymph"], "unit": "", "st": ly_st, "txt": True,
        "note": "No storm recently." if p["lymph"] == "at baseline" else "Counts as an immune risk factor.",
        "lims": [lim("Bands", "baseline", "team")], "src": "MAKEDONAS19",
    })

    # ---- Altered gravity
    bmd_land = p["bmd"] + r["bmd"] / 30 * left
    st = "act" if p["bmd"] < 95 else "watch" if p["bmd"] < 97.5 else "ok"
    if bmd_land < 95 and p["bmd"] >= 95:
        cross = state["day"] + int(-(-(95 - p["bmd"]) // (r["bmd"] / 30))) if r["bmd"] else state["day"]
        st = worst(st, "watch")
        alerts.append({
            "tile": "Hip and spine bone density", "st": "watch", "horn": True,
            "what": "Bone density heading below NASA's 95% limit",
            "why": (f"Projected {fmt(bmd_land, 1)}% of pre-flight at landing, crossing 95% "
                    f"around day {cross}. NASA-STD-3001 V1 4027."),
            "plan": "Resistive exercise 6 to 7 sessions a week, and bring vitamin D into 35 to 90 ng/ml.",
            "level": "self", "src": "MTB013", "metric": "bmd",
        })
    H["gravity"].append({
        "name": "Hip and spine bone density", "val": fmt(p["bmd"], 1), "unit": "% of pre-flight", "st": st,
        "spark": p["hist"]["bmd"], "note": f"Projected at landing: {fmt(bmd_land, 1)}%",
        "lims": [lim("Limit", "95%", "nasa"), lim("Watch", "97.5%", "team")], "src": "MTB013",
    })

    ml = p["vo2"] * p["preVo2"] / 100
    floor_pct = EVA_FLOOR / p["preVo2"] * 100
    vo2_eva = p["vo2"] + r["vo2"] / 30 * max(0, EVA_DAY - state["day"])
    ml_eva = vo2_eva * p["preVo2"] / 100
    st = "act" if p["vo2"] < 80 else "watch" if p["vo2"] < 90 else "ok"
    if ml < EVA_FLOOR and state["day"] < EVA_DAY:
        st = "act"
        alerts.append({
            "tile": "Aerobic capacity (VO2max)", "st": "act",
            "what": "Below the spacewalk fitness floor",
            "why": f"{fmt(ml, 1)} ml/kg/min is under NASA's 32.9 floor (V1 4003).",
            "plan": "No spacewalk until the flight surgeon reviews your exercise plan.",
            "level": "surgeon", "src": "TB031",
        })
    elif state["day"] < EVA_DAY and ml_eva < EVA_FLOOR:
        st = worst(st, "watch")
        alerts.append({
            "tile": "Aerobic capacity (VO2max)", "st": "watch", "horn": True,
            "what": "Fitness heading below the spacewalk floor",
            "why": (f"Projected {fmt(ml_eva, 1)} ml/kg/min on spacewalk day {EVA_DAY}. NASA's floor is "
                    f"32.9, which for you is {fmt(floor_pct, 1)}% of pre-flight."),
            "plan": "Add interval and resistance sessions before the spacewalk.",
            "level": "self", "src": "TB031", "metric": "vo2",
        })
    H["gravity"].append({
        "name": "Aerobic capacity (VO2max)", "val": fmt(p["vo2"], 1), "unit": "% of pre-flight", "st": st,
        "spark": p["hist"]["vo2"],
        "note": f"{fmt(ml, 1)} ml/kg/min. Spacewalk floor 32.9.",
        "lims": [lim("Limit", "80%", "nasa"), lim("EVA floor", "32.9", "nasa")], "src": "TB031",
    })

    m_land = p["muscle"] + r["muscle"] / 30 * left
    st = "act" if p["muscle"] < 80 else "watch" if p["muscle"] < 90 else "ok"
    if m_land < 80 and p["muscle"] >= 80:
        st = worst(st, "watch")
        alerts.append({
            "tile": "Muscle strength", "st": "watch", "horn": True,
            "what": "Muscle strength heading below NASA's 80% limit",
            "why": f"Projected {fmt(m_land, 1)}% at landing (V1 4024).",
            "plan": "Add resistance sessions.", "level": "self", "src": "TB031",
        })
    H["gravity"].append({
        "name": "Muscle strength", "val": fmt(p["muscle"], 1), "unit": "% of pre-flight", "st": st,
        "spark": p["hist"]["muscle"], "note": f"Projected at landing: {fmt(m_land, 1)}%",
        "lims": [lim("Limit", "80%", "nasa"), lim("Watch", "90%", "team")], "src": "TB031",
    })

    st = "ok" if p["exercise"] >= 6 else "watch" if p["exercise"] >= 4 else "act"
    H["gravity"].append({
        "name": "Exercise sessions this week", "val": p["exercise"], "unit": "of 6", "st": st,
        "note": "NASA: 6 to 7 sessions a week maintained bone.",
        "lims": [lim("Green", "6+", "team")], "src": "MTB013",
    })

    st = "ok" if p["vision"] == "no change" else "act" if p["vision"].startswith("disc") else "watch"
    H["gravity"].append({
        "name": "Vision and eye (SANS)", "val": p["vision"], "unit": "", "st": st, "txt": True,
        "note": "16% of long-duration crew develop optic disc swelling (SANS). Near-vision card by SPECC.",
        "lims": [lim("Bands", "eye check", "team")], "src": "TB033",
    })

    st = "act" if p["stand"].startswith("presyncope") else "watch" if p["stand"].startswith("lightheaded") else "ok"
    H["gravity"].append({
        "name": "Stand test before landing", "val": p["stand"], "unit": "", "st": st, "txt": True,
        "note": "Presyncope: lightheaded, nausea, tunnel vision or systolic BP under 70.",
        "lims": [lim("Red", "presyncope", "nasa")], "src": "ORTHO",
    })

    prep = state["day"] >= LANDING - 14
    H["gravity"].append({
        "name": "Fainting risk after landing", "val": "80%" if p["sex"] == "female" else "20%",
        "unit": "NASA sample", "st": "watch" if prep else "ok",
        "note": ("Landing prep: fluid loading and compression garments." if prep
                 else f"Prep reminders start day {LANDING - 14}."),
        "lims": [lim("Rate", "sex", "nasa")], "src": "ORTHO",
    })
    if prep:
        alerts.append({
            "tile": "Fainting risk after landing", "st": "watch", "horn": True,
            "what": "Landing prep for fainting risk",
            "why": "About 83% of long-duration crew were presyncopal on a stand test.",
            "plan": "Fluid loading and compression garments before landing.",
            "level": "self", "src": "ORTHO",
        })

    # ---- Immune
    sleep7 = avg(p["hist"]["sleep"][-7:])
    factors: List[str] = []
    if sleep7 < 7:
        factors.append(f"sleep {fmt(sleep7, 1)} h")
    if p["stress"] == "high":
        factors.append("high stress")
    if p["vitD"] < 35:
        factors.append(f"vitamin D {p['vitD']} ng/ml")
    if p["lymph"] != "at baseline":
        factors.append("recent solar storm")
    st = "watch" if len(factors) >= 2 else "ok"
    if len(factors) >= 2:
        alerts.append({
            "tile": "Immune risk factors", "st": "watch", "horn": True,
            "what": "Higher risk of dormant virus reactivation",
            "why": (f"{len(factors)} risk factors at once: {', '.join(factors)}. "
                    f"You carry {' and '.join(p['carries'])}. 61% of ISS astronauts shed at least one virus."),
            "plan": "Sleep, 20 to 40 minutes of breathing exercises a day, vitamin D and an enriched diet.",
            "level": "self", "src": "MAKEDONAS19",
        })
    H["immune"].append({
        "name": "Immune risk factors", "val": len(factors), "unit": "factor" if len(factors) == 1 else "factors", "st": st,
        "note": ", ".join(factors) if factors else "Sleep, stress, vitamin D and storm all fine.",
        "lims": [lim("Horn", "2+", "team")], "src": "IMMUNE21",
    })

    st = ("act" if p["shedding"] == "detected with symptoms"
          else "watch" if p["shedding"] == "detected, no symptoms" else "ok")
    H["immune"].append({
        "name": "Virus shedding in saliva", "val": p["shedding"], "unit": "", "st": st, "txt": True,
        "note": f"Swab by SPECC. You carry {', '.join(p['carries'])}.",
        "lims": [lim("Bands", "swab", "team")], "src": "ROONEY19",
    })
    if st == "watch":
        alerts.append({
            "tile": "Virus shedding in saliva", "st": "watch", "what": "Virus detected in saliva, no symptoms",
            "why": "Reactivated virus can pass to crewmates.",
            "plan": "Tell the crew medical officer. Don't share food or drink.",
            "level": "crewmate", "src": "MAKEDONAS19",
        })
    if st == "act":
        alerts.append({
            "tile": "Virus shedding in saliva", "st": "act", "what": "Virus shedding with symptoms",
            "why": "Rash or symptoms alongside a positive swab.",
            "plan": "Flight surgeon decides on medication.", "level": "surgeon", "src": "MAKEDONAS19",
        })

    st = "ok" if p["skin"] == "no change" else "act" if p["skin"].startswith("spreading") else "watch"
    H["immune"].append({
        "name": "Skin camera check", "val": p["skin"], "unit": "", "st": st, "txt": True,
        "note": "Rash can be the first sign of a reactivated virus.",
        "lims": [lim("Bands", "photo", "team")], "src": "ROONEY19",
    })

    H["immune"].append({
        "name": "Vitamin D (25-OH)", "val": p["vitD"], "unit": "ng/ml",
        "st": "watch" if p["vitD"] < 35 else "ok",
        "note": "NASA range 35 to 90 ng/ml. Also protects bone.",
        "lims": [lim("Range", "35-90", "nasa")], "src": "MTB013",
    })

    # ---- Environment and behaviour
    co2 = state["co2"]["quarters"]
    st = "act" if co2 >= 3 else "watch" if co2 >= 2.5 else "ok"
    H["environment"].append({
        "name": "Cabin CO2 where you sleep", "val": fmt(co2, 1), "unit": "mmHg", "st": st,
        "note": ("Above 2.5 raises headache risk." if co2 >= 2.5 else "Within NASA limits."),
        "lims": [lim("Limit", "3.0", "nasa"), lim("Watch", "2.5", "nasa")], "src": "TB004",
    })
    if st != "ok":
        alerts.append({
            "tile": "Cabin CO2 where you sleep", "st": st,
            "what": ("CO2 above NASA's 3 mmHg limit" if st == "act" else "CO2 high in crew quarters"),
            "why": ((f"{fmt(co2, 1)} mmHg 1-hour average. NASA limit is 3 mmHg (V2 6004)."
                     + (" You reported a headache." if p["headache"] else ""))
                    if st == "act" else
                    f"{fmt(co2, 1)} mmHg 7-day average. NASA keeps it under 2.5 for headache risk below 1%."),
            "plan": ("Move to a module with better airflow now. Alert the crew and check the CO2 scrubbers."
                     if st == "act" else "Sleep in a module with better airflow. Check the scrubbers."),
            "level": "crewmate", "src": "TB004",
        })

    last_three = p["hist"]["sleep"][-3:]
    st = "act" if all(v < 6 for v in last_three) else "watch" if sleep7 < 7 else "ok"
    H["environment"].append({
        "name": "Sleep, 7-night average", "val": fmt(sleep7, 1), "unit": "h/night", "st": st,
        "spark": p["hist"]["sleep"],
        "note": "NASA recommends 7 to 9 h. Crews average 6 to 6.5 h.",
        "lims": [lim("Watch", "under 7", "nasa"), lim("Act", "under 6", "team")], "src": "SLEEP",
    })

    st = "ok" if p["mood"] == "as usual" else "watch"
    H["environment"].append({
        "name": "Mood and focus check-in", "val": p["mood"], "unit": "", "st": st, "txt": True,
        "note": "Voice check-in by SPECC.",
        "lims": [lim("Bands", "check-in", "team")], "src": "TB014",
    })

    # Any other tile that is not OK gets a plain action item, using the spec's actions.
    for key in H:
        for t in H[key]:
            if t["st"] == "ok" or t["name"] not in PLANS:
                continue
            if any(a["tile"] == t["name"] for a in alerts):
                continue
            plan, level, src = PLANS[t["name"]]
            # Preserve original demo rule: sleep "act" escalates to flight surgeon.
            if t["st"] == "act" and t["name"].startswith("Sleep"):
                plan = "Tell a crewmate and contact the flight surgeon."
                level = "surgeon"
            unit = f" {t['unit']}" if t["unit"] and not t.get("txt") else ""
            alerts.append({
                "tile": t["name"], "st": t["st"], "what": f"{t['name']}: {t['val']}{unit}",
                "why": t["note"], "plan": plan, "level": level, "src": src,
            })

    overall = "ok"
    for key in H:
        for t in H[key]:
            overall = worst(overall, t["st"])
    alerts.sort(key=lambda a: (-SEV[a["st"]], -1 if a.get("horn") else 0))

    return {
        "H": H,
        "alerts": alerts,
        "overall": overall,
        "factors": factors,
        "r": r,
        "doseLand": dose_land,
        "bmdLand": bmd_land,
        "vo2Eva": vo2_eva,
        "mlEva": ml_eva,
        "floorPct": floor_pct,
        # Prevention-plan rates, for the "with plan" projection line.
        "plan": {
            "bmd": rates(p, {"exercise": 6, "vitD": max(p["vitD"], 38)})["bmd"] / 30,
            "vo2": rates(p, {"exercise": 6})["vo2"] / 30,
        },
    }


def level_of(key: str) -> str:
    return LEVEL[key]