"""Mission scenarios.

Each scenario is an ordered list of (actor, step) pairs. A step mutates the
mission state and returns the message shown in the event log. The API drives
the timing; the frontend paces the steps so the demo reads like a live feed.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Tuple

from . import engine
from .spec import BASE_RAD, EVA_DAY, EVA_FLOOR, LANDING, MODULES

MOD = {m["id"]: m for m in MODULES}


class Ctx:
    """What a scenario step is allowed to touch: state, the robot's voice and pings."""

    def __init__(self, state: Dict[str, Any]):
        self.s = state
        self.speaks: List[str] = []
        self.pings: List[Dict[str, str]] = []

    @property
    def selected(self) -> str:
        return self.s["selected"]

    @property
    def p(self) -> Dict[str, Any]:
        return self.s["crew"][self.s["selected"]]

    def other(self) -> Dict[str, Any]:
        cid = next(k for k in self.s["crew"] if k != self.s["selected"])
        return self.s["crew"][cid]

    def say(self, text: str) -> None:
        self.speaks.append(text)

    def ping(self, mod: str, tone: str = "sensor") -> None:
        self.pings.append({"mod": mod, "tone": tone})


Step = Tuple[str, Callable[[Ctx], str]]


def _storm(c: Ctx) -> Step:
    def watch(_c: Ctx) -> str:
        _c.s["spe"] = "watch"
        _c.ping("node")
        return "Space-weather feed forecasts a solar particle event. Station status set to watch."

    def alert(_c: Ctx) -> str:
        _c.s["spe"] = "alert"
        for m in MODULES:
            _c.s["rad"][m["id"]] = BASE_RAD[m["id"]] * (4 if m.get("shielded") else 20)
            _c.ping(m["id"], "act")
        return (f"Radiation sensors jump in every module. Destiny reads {engine.fmt(_c.s['rad']['lab'], 0)} "
                f"mSv/day, the shielded Zvezda area {engine.fmt(_c.s['rad']['shelter'], 1)} (simulated).")

    def brain(_c: Ctx) -> str:
        return ("Storm alert is a NASA red flag: crew must reach a protected area "
                "(NASA-STD-3001 V2 6100). Dispatching SPECC to the crew.")

    def dispatch(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = p["at"]
        c.say("Solar storm. Follow me.")
        return (f"SPECC reaches {p['name']} in {MOD[p['at']]['name']}: "
                f"\"Solar storm. Follow me to the storm shelter now.\"")

    def shelter(c: Ctx) -> str:
        p, o = c.p, c.other()
        p["at"], p["slot"] = "shelter", 0
        o["at"], o["slot"] = "shelter", 1
        c.s["robot"]["at"] = "shelter"
        c.say("Shelter reached.")
        return (f"{p['name']} and {o['name']} are in the Zvezda shelter. "
                f"SPECC's dosimeter stays with {p['name']}.")

    def passes(c: Ctx) -> str:
        for cid, p in c.s["crew"].items():
            add = 9 if cid == c.selected else 8
            p["dose"] += add
            p["hist"]["dose"][-1] = p["dose"]
            p["bfo"][-1] += add
        c.s["spe"] = "none"
        c.s["rad"] = dict(BASE_RAD)
        return ("Storm passes after 9 hours. Personal dose in the shelter: about 8 to 9 mSv each. "
                "Unsheltered it would have been about 40 mSv (simulated numbers).")

    def blood(c: Ctx) -> str:
        for p in c.s["crew"].values():
            p["lymph"] = "below baseline"
        c.say("Quick blood check, please.")
        return ("Post-storm blood check by SPECC: lymphocytes below baseline for both crew members (simulated).")

    def compare(c: Ctx) -> str:
        a, b = c.p, c.other()
        ea = len(engine.evaluate(c.s, c.selected)["factors"])
        eb = len(engine.evaluate(c.s, next(k for k in c.s["crew"] if k != c.selected))["factors"])
        return (f"Same storm, different prediction. {a['name']} has {ea} immune risk factor"
                f"{'' if ea == 1 else 's'}{', so the stall horn sounds' if ea >= 2 else ''}. "
                f"{b['name']} has {eb}{', so the horn sounds' if eb >= 2 else ', so no immune horn'}.")

    def done(c: Ctx) -> str:
        p, o = c.p, c.other()
        p["at"], p["slot"] = "lab", 0
        o["at"], o["slot"] = "gym", 0
        c.s["robot"]["at"] = "node"
        return "Dashboards updated with dose, storm flag and immune prediction. Crew back to work."

    return [
        ("SENSOR", watch), ("SENSOR", alert), ("BRAIN", brain), ("ROBOT", dispatch),
        ("ROBOT", shelter), ("SENSOR", passes), ("ROBOT", blood), ("BRAIN", compare), ("DASHBOARD", done),
    ]


def _workout(c: Ctx) -> Step:
    def skip(c: Ctx) -> str:
        p = c.p
        p["exercise"] = 3
        engine.advance(c.s, 7)
        c.ping("gym", "watch")
        return (f"Exercise module log: {p['name']} completed 3 of 6 planned sessions this week. "
                f"Seven days pass.")

    def brain(c: Ctx) -> str:
        e = engine.evaluate(c.s, c.selected)
        parts = [f"Bone projection now {engine.fmt(e['bmdLand'], 1)}% at landing"]
        if c.s["day"] < EVA_DAY:
            parts.append(f"fitness {engine.fmt(e['mlEva'], 1)} ml/kg/min on spacewalk day {EVA_DAY} (floor 32.9)")
        horns = len([a for a in e["alerts"] if a.get("horn")])
        return (", ".join(parts) + ". "
                + (f"Stall horn sounds for {c.p['name']} before any limit is crossed." if horns
                   else "Still clear, thanks to a good margin."))

    def robot(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = p["at"]
        c.say("Time for a session?")
        heads = [a["what"][0].lower() + a["what"][1:] for a in engine.evaluate(c.s, c.selected)["alerts"]
                 if a.get("horn")]
        tip = ("Heads up: " + " and ".join(heads) + ".") if heads else "Your numbers are holding, but let's keep the streak."
        return f"SPECC finds {p['name']}: \"{tip} Let's do a resistance session now.\""

    def reps(c: Ctx) -> str:
        p = c.p
        p["at"], p["slot"] = "gym", 1
        c.s["robot"]["at"] = "gym"
        c.say("Rep 12 of 12. Nice!")
        return ("In Tranquility, SPECC counts reps on the ARED resistance device: "
                "3 sets of squats and heel raises, logged.")

    def done(c: Ctx) -> str:
        c.p["exercise"] = 4
        c.s["robot"]["at"] = "node"
        return "Session logged (4 this week). Dashboard shows the horn and the plan that clears it."

    return [("SENSOR", skip), ("BRAIN", brain), ("ROBOT", robot), ("ROBOT", reps), ("DASHBOARD", done)]


def _sleep(c: Ctx) -> Step:
    def co2(c: Ctx) -> str:
        c.s["co2"]["quarters"] = 2.8
        c.ping("quarters", "watch")
        return "Harmony crew quarters CO2 sensor: 7-day average up to 2.8 mmHg. NASA keeps it under 2.5."

    def rest(c: Ctx) -> str:
        p = c.p
        engine.advance(c.s, 5, c.selected, 5.8)
        p["at"], p["slot"] = "quarters", 0
        c.ping("quarters")
        return f"Sleep station: {p['name']} averaged about 5.8 h over the last 5 nights."

    def brain(c: Ctx) -> str:
        e = engine.evaluate(c.s, c.selected)
        return (f"Immune risk factors for {c.p['name']}: {', '.join(e['factors']) or 'none'}. "
                + ("Two or more at once, so the stall horn sounds." if len(e["factors"]) >= 2
                   else "Still under the horn threshold.") + " Sending SPECC for a swab.")

    def swab(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = p["at"]
        p["shedding"] = "detected, no symptoms"
        c.say("Saliva swab, please.")
        return f"Saliva swab: {p['carries'][0]} detected, no symptoms (simulated)."

    def mood(c: Ctx) -> str:
        p = c.p
        p["mood"] = "poor focus several days"
        p["stress"] = "high"
        c.say("How have you been feeling?")
        return (f"Voice check-in: \"How have you been feeling?\" {p['name']} reports poor focus "
                f"for several days and high stress.")

    def plan(c: Ctx) -> str:
        return ("Plan sent: sleep in a module with better airflow, earlier lights-out, 20 to 40 minutes "
                "of breathing exercises, and don't share food or drink. Crew medical officer informed.")

    def done(c: Ctx) -> str:
        c.s["robot"]["at"] = "node"
        return "Dashboard updated: CO2, sleep, swab and mood all feed the immune prediction."

    return [("SENSOR", co2), ("SENSOR", rest), ("BRAIN", brain), ("ROBOT", swab),
            ("ROBOT", mood), ("BRAIN", plan), ("DASHBOARD", done)]


def _checkup(c: Ctx) -> Step:
    def visit(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = p["at"]
        c.say("Good morning! Quick check-up?")
        return f"SPECC goes to {p['name']} for the daily check-up."

    def vitals(c: Ctx) -> str:
        p = c.p
        v = p["vitals"]
        v["hr"] = round((64 if p["sex"] == "female" else 58) + engine.jitter(5))
        v["bp"] = f"{round(114 + engine.jitter(6))}/{round(74 + engine.jitter(4))}"
        v["temp"] = 36.6 + engine.jitter(0.2)
        v["spo2"] = round(97 + engine.rnd() * 2)
        v["day"] = c.s["day"]
        c.say("Hold still for 10 seconds.")
        return (f"Vitals (simulated): heart rate {v['hr']} bpm, blood pressure {v['bp']}, "
                f"{engine.fmt(v['temp'], 1)} °C, SpO2 {v['spo2']}%.")

    def mood(c: Ctx) -> str:
        c.say("How did you sleep?")
        return f"Mood question answered. {c.p['name']} reports \"{c.p['mood']}\"."

    def done(c: Ctx) -> str:
        c.s["robot"]["at"] = "node"
        return "Check-up stored. Latest readings shown on the dashboard."

    return [("ROBOT", visit), ("ROBOT", vitals), ("ROBOT", mood), ("DASHBOARD", done)]


def _co2(c: Ctx) -> Step:
    def spike(c: Ctx) -> str:
        p = c.p
        p["at"], p["slot"] = "quarters", 0
        c.s["co2"]["quarters"] = 3.4
        c.ping("quarters", "act")
        return "Harmony CO2 sensor: 1-hour average 3.4 mmHg, above NASA's 3 mmHg limit (V2 6004)."

    def brain(_c: Ctx) -> str:
        return f"Act now: CO2 over the 1-hour limit where {_c.p['name']} is working. Sending SPECC."

    def symptoms(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = "quarters"
        p["headache"] = True
        c.say("Any headache?")
        return (f"SPECC asks {p['name']} about symptoms. {p['name']} reports a mild headache, "
                f"a common early sign of high CO2.")

    def move(c: Ctx) -> str:
        p = c.p
        p["at"], p["slot"] = "lab", 0
        c.s["robot"]["at"] = "lab"
        c.say("Destiny air is better.")
        return f"SPECC guides {p['name']} to Destiny, which reads {engine.fmt(c.s['co2']['lab'], 1)} mmHg."

    def fixed(c: Ctx) -> str:
        p = c.p
        c.s["co2"]["quarters"] = 2.3
        p["headache"] = False
        c.ping("quarters")
        return "Crew swaps the scrubber cartridge. Harmony back to 2.3 mmHg, headache gone after an hour."

    def done(c: Ctx) -> str:
        c.s["robot"]["at"] = "node"
        return "Dashboard shows the CO2 event and the time spent above the limit."

    return [("SENSOR", spike), ("BRAIN", brain), ("ROBOT", symptoms), ("ROBOT", move),
            ("SENSOR", fixed), ("DASHBOARD", done)]


def _vision(c: Ctx) -> Step:
    def card(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = p["at"]
        p["vision"] = "new near blur or headache"
        c.say("Read the bottom line?")
        return f"Weekly near-vision card: {p['name']} can't read the line read easily last week."

    def brain(_c: Ctx) -> str:
        return ("About 16% of long-duration crew develop optic disc swelling (SANS). New near blur is a "
                "watch (team rule). Ordering a retina scan.")

    def scan(c: Ctx) -> str:
        c.say("Look at the light.")
        return "Retina scan (concept hardware): no disc swelling or folds yet (simulated)."

    def personal(c: Ctx) -> str:
        return (f"Personal factor: B-vitamin status and genetics change SANS risk (NASA, Zwart 2022). "
                f"Eye checks for {c.p['name']} move from weekly to every 3 days. Flight surgeon notified.")

    def done(c: Ctx) -> str:
        c.s["robot"]["at"] = "node"
        return "Head and eyes marked Watch on the body map, with the eye-exam plan."

    return [("ROBOT", card), ("BRAIN", brain), ("ROBOT", scan), ("BRAIN", personal), ("DASHBOARD", done)]


def _rash(c: Ctx) -> Step:
    def photo(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = p["at"]
        vzv = "VZV" in p["carries"]
        p["skin"] = "spreading or blistering rash, one-sided band" if vzv else "new rash or dermatitis"
        c.say("Let me photograph that.")
        what = ("a blistering rash in a band on one side of the chest" if vzv
                else "a small red rash on the forearm")
        return f"Skin camera: {p['name']} has {what} (simulated)."

    def brain(c: Ctx) -> str:
        p = c.p
        return (("One-sided band rash in a VZV carrier: possible shingles. Saliva swab ordered.")
                if "VZV" in p["carries"] else
                f"{p['name']} doesn't carry VZV, so shingles is ruled out. Treated as skin irritation and watched.")

    def swab(c: Ctx) -> str:
        p = c.p
        c.say("Saliva swab, please.")
        if "VZV" in p["carries"]:
            p["shedding"] = "detected with symptoms"
            return "Saliva swab: VZV detected, with symptoms (simulated)."
        p["shedding"] = "not detected"
        return "Saliva swab: no virus detected (simulated)."

    def plan(c: Ctx) -> str:
        return (("Act now: flight surgeon decides on medication (the NASA immune protocol lists valacyclovir). "
                 "Don't share food or drink.") if "VZV" in c.p["carries"]
                else "Crew medical officer gets the photos. Recheck tomorrow.")

    def done(c: Ctx) -> str:
        c.s["robot"]["at"] = "node"
        return "Skin and mouth marked on the body map with the plan."

    return [("ROBOT", photo), ("BRAIN", brain), ("ROBOT", swab), ("BRAIN", plan), ("DASHBOARD", done)]


def _mood(c: Ctx) -> Step:
    def sleep(c: Ctx) -> str:
        p = c.p
        engine.advance(c.s, 5, c.selected, 6.4)
        return (f"Sleep station: {p['name']} is down to about 6.4 h a night and has skipped two shared "
                f"crew meals (simulated).")

    def checkin(c: Ctx) -> str:
        p = c.p
        c.s["robot"]["at"] = p["at"]
        p["mood"] = "low mood or poor focus several days"
        c.say("Want to talk for a minute?")
        return (f"Voice check-in: {p['name']} says they feel flat and far from home. SPECC notes slower "
                f"speech than their baseline (simulated).")

    def brain(_c: Ctx) -> str:
        return ("Isolation and confinement is one of NASA's five hazards. Low mood for several days is a watch "
                "(team rule). Plan: protected time for a call home, a shared crew activity and earlier "
                "lights-out. If it lasts, the flight surgeon is told.")

    def dinner(c: Ctx) -> str:
        p, o = c.p, c.other()
        p["at"], p["slot"] = "node", 0
        o["at"], o["slot"] = "node", 1
        c.s["robot"]["at"] = "node"
        c.say("Dinner together in Unity?")
        return f"SPECC suggests dinner together in the Unity galley. {o['name']} joins."

    def done(c: Ctx) -> str:
        p, o = c.p, c.other()
        p["at"], p["slot"] = "lab", 0
        o["at"], o["slot"] = "gym", 0
        return "Mood and sleep marked Watch, with the plan and a check-in booked for tomorrow."

    return [("SENSOR", sleep), ("ROBOT", checkin), ("BRAIN", brain), ("ROBOT", dinner), ("DASHBOARD", done)]


def _eva(c: Ctx) -> Step:
    def test(c: Ctx) -> str:
        p = c.p
        if c.s["day"] >= EVA_DAY:
            return f"The spacewalk on day {EVA_DAY} is already done. No readiness check needed."
        c.s["robot"]["at"] = p["at"]
        c.say("3-minute step test.")
        return (f"SPECC runs a step test with {p['name']} and reads pulse with its camera "
                f"(indirect estimate).")

    def brain(c: Ctx) -> str:
        p = c.p
        if c.s["day"] >= EVA_DAY:
            return "Nothing to evaluate."
        ml = p["vo2"] * p["preVo2"] / 100
        e = engine.evaluate(c.s, c.selected)
        if ml < EVA_FLOOR:
            return (f"Estimated {engine.fmt(ml, 1)} ml/kg/min, under NASA's 32.9 floor. No spacewalk "
                    f"until the flight surgeon reviews the plan.")
        if e["mlEva"] < EVA_FLOOR:
            return (f"Estimated {engine.fmt(ml, 1)} ml/kg/min today, but projected "
                    f"{engine.fmt(e['mlEva'], 1)} on day {EVA_DAY}. Stall horn: add interval sessions now.")
        return (f"Estimated {engine.fmt(ml, 1)} ml/kg/min, projected {engine.fmt(e['mlEva'], 1)} on day "
                f"{EVA_DAY}. Clear of NASA's 32.9 floor.")

    def done(c: Ctx) -> str:
        c.s["robot"]["at"] = "node"
        return "Fitness and legs updated on the dashboard and body map."

    return [("ROBOT", test), ("BRAIN", brain), ("DASHBOARD", done)]


def _landing(c: Ctx) -> Step:
    def clock(c: Ctx) -> str:
        n = max(0, LANDING - 14 - c.s["day"])
        engine.advance(c.s, n)
        return (f"Mission clock moves {n} days ahead to day {c.s['day']}, 14 days before landing." if n
                else f"Already within 14 days of landing (day {c.s['day']}).")

    def brain(c: Ctx) -> str:
        a, b = c.p, c.other()
        return (f"Landing-prep horn on. About 83% of long-duration crew were presyncopal on a stand test. "
                f"NASA's rate by sex: {a['name']} {'80%' if a['sex'] == 'female' else '20%'}, "
                f"{b['name']} {'80%' if b['sex'] == 'female' else '20%'}.")

    def stand(c: Ctx) -> str:
        a, b = c.p, c.other()
        c.s["robot"]["at"] = a["at"]
        a["stand"] = ("lightheaded or heart rate well above baseline" if a["sex"] == "female"
                      else "no symptoms")
        b["stand"] = ("lightheaded or heart rate well above baseline" if b["sex"] == "female"
                      else "no symptoms")
        c.say("Stand up slowly for me.")
        return f"Stand test (simulated): {a['name']} {a['stand']}; {b['name']} {b['stand']}."

    def garments(c: Ctx) -> str:
        c.say("Compression garments ready.")
        return ("SPECC sets fluid-loading reminders for landing day and checks the fit of compression "
                "garments.")

    def done(c: Ctx) -> str:
        c.s["robot"]["at"] = "node"
        return "Heart and circulation marked on the body map with the landing plan."

    return [("SENSOR", clock), ("BRAIN", brain), ("ROBOT", stand), ("ROBOT", garments), ("DASHBOARD", done)]


def _plan(c: Ctx) -> Step:
    def start(c: Ctx) -> str:
        p = c.p
        p["exercise"] = 6
        p["vitD"] = max(p["vitD"], 38)
        c.s["co2"]["quarters"] = 2.1
        return (f"{p['name']} follows the plan: 6 sessions a week, vitamin D supplement, "
                f"scrubber repaired.")

    def run(c: Ctx) -> str:
        p = c.p
        engine.advance(c.s, 14, c.selected, 7.5)
        p["stress"] = "normal"
        p["mood"] = "as usual"
        p["lymph"] = "at baseline"
        p["shedding"] = "not detected"
        p["skin"] = "no change"
        return ("Fourteen days pass. Sleep back to about 7.5 h, CO2 at 2.1 mmHg, follow-up swab negative.")

    def brain(c: Ctx) -> str:
        e = engine.evaluate(c.s, c.selected)
        h = len([a for a in e["alerts"] if a.get("horn")])
        return (f"{h} prediction{'' if h == 1 else 's'} still above the line. Keep going." if h
                else f"All projections back inside NASA limits through landing. Horn off for {c.p['name']}.")

    def done(c: Ctx) -> str:
        return "Dashboard back to green where the plan worked."

    return [("BRAIN", start), ("SENSOR", run), ("BRAIN", brain), ("DASHBOARD", done)]


SCENARIOS: List[Dict[str, Any]] = [
    {"id": "storm", "cat": "Space radiation", "title": "Solar storm",
     "sub": "Radiation spikes. SPECC guides the crew to the shelter, then checks immunity.", "steps": _storm(None)},
    {"id": "workout", "cat": "Altered gravity", "title": "Skipped workouts",
     "sub": "A busy week with 3 exercise sessions. Bone and fitness projections cross NASA limits.", "steps": _workout(None)},
    {"id": "sleep", "cat": "Immune", "title": "Poor sleep and high CO2",
     "sub": "A scrubber runs low and sleep drops. SPECC swabs for dormant viruses.", "steps": _sleep(None)},
    {"id": "checkup", "cat": "Routine", "title": "Daily check-up",
     "sub": "SPECC visits for vitals and a mood question.", "steps": _checkup(None)},
    {"id": "co2", "cat": "Closed environment", "title": "Cabin CO2 spike",
     "sub": "Scrubber fault in Harmony. SPECC checks for headache and moves the crew.", "steps": _co2(None)},
    {"id": "vision", "cat": "Altered gravity", "title": "Vision change (SANS)",
     "sub": "Near vision blurs. SPECC runs an eye check and a retina scan.", "steps": _vision(None)},
    {"id": "rash", "cat": "Immune", "title": "Rash and shingles risk",
     "sub": "A new rash. SPECC photographs it and checks which viruses you carry.", "steps": _rash(None)},
    {"id": "mood", "cat": "Isolation", "title": "Isolation and low mood",
     "sub": "Month 7 slump. SPECC's check-in notices and brings the crew together.", "steps": _mood(None)},
    {"id": "eva", "cat": "Altered gravity", "title": "Spacewalk readiness",
     "sub": "Fitness check against NASA's 32.9 ml/kg/min floor before day 200.", "steps": _eva(None)},
    {"id": "landing", "cat": "Altered gravity", "title": "Landing prep",
     "sub": "Jump to 14 days before landing. Stand test and fainting prevention.", "steps": _landing(None)},
    {"id": "plan", "cat": "Countermeasures", "title": "Follow the prevention plan",
     "sub": "Two weeks of 6 sessions a week, vitamin D, good sleep and fixed scrubbers.", "steps": _plan(None)},
]

BY_ID = {s["id"]: s for s in SCENARIOS}


def meta() -> List[Dict[str, Any]]:
    return [{"id": s["id"], "cat": s["cat"], "title": s["title"], "sub": s["sub"]} for s in SCENARIOS]