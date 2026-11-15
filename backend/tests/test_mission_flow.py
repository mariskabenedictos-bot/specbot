"""Critical backend data-flow tests for SPECC shared mission state."""

from __future__ import annotations

import importlib

from fastapi.testclient import TestClient


def _fresh_app():
    """Reload store/engine so each test gets a clean process-level state."""
    import app.engine as engine
    import app.store as store
    import app.main as main

    importlib.reload(engine)
    importlib.reload(store)
    importlib.reload(main)
    return TestClient(main.app)


def test_health_and_shared_state():
    client = _fresh_app()
    assert client.get("/api/health").json()["ok"] is True
    data = client.get("/api/state").json()
    assert data["state"]["day"] == 180
    assert "maya" in data["evals"] and "sam" in data["evals"]
    assert len(data["envHistory"]) >= 1


def test_env_update_feeds_dashboard_eval():
    client = _fresh_app()
    before = client.get("/api/state").json()
    maya_before = before["evals"]["maya"]["H"]["environment"]
    co2_tile = next(t for t in maya_before if t["name"].startswith("Cabin CO2"))
    assert co2_tile["st"] == "ok"

    res = client.post(
        "/api/env/update",
        json={"module": "quarters", "co2": 3.4},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["state"]["co2"]["quarters"] == 3.4
    assert data["envHistory"][-1]["co2"]["quarters"] == 3.4

    co2_after = next(
        t for t in data["evals"]["maya"]["H"]["environment"] if t["name"].startswith("Cabin CO2")
    )
    assert co2_after["st"] == "act"
    assert any("CO2" in a["what"] or "CO2" in a["tile"] for a in data["evals"]["maya"]["alerts"])


def test_robot_vitals_update_shared_state():
    client = _fresh_app()
    initial = client.get("/api/state").json()
    initial_hr = next(
        t for group in initial["evals"]["maya"]["H"].values() for t in group if t["name"] == "Heart rate"
    )
    assert initial_hr["val"] == 64
    assert initial_hr["st"] == "ok"
    assert not any(a["tile"] == "Heart rate" for a in initial["evals"]["maya"]["alerts"])

    start = client.post("/api/robot/action/start", json={"id": "vitals", "crew": "maya"})
    assert start.status_code == 200
    assert start.json()["state"]["robot"]["busy"] is True
    assert start.json()["state"]["robot"]["activity"] == "navigate"
    during = start.json()
    during_hr = next(
        t for group in during["evals"]["maya"]["H"].values() for t in group if t["name"] == "Heart rate"
    )
    assert during_hr["st"] == "ok"

    done = client.post("/api/robot/action/complete", json={"id": "vitals", "crew": "maya"})
    assert done.status_code == 200
    body = done.json()
    assert body["state"]["crew"]["maya"]["vitals"]["day"] == body["state"]["day"]
    assert body["state"]["robot"]["busy"] is False
    assert body["robotHistory"][-1]["action"] == "vitals"
    assert "simulated" in body["telemetry"]["title"].lower()
    completed_hr = next(
        t for group in body["evals"]["maya"]["H"].values() for t in group if t["name"] == "Heart rate"
    )
    assert completed_hr["st"] == "act"
    assert any(a["tile"] == "Heart rate" and a["st"] == "act" for a in body["evals"]["maya"]["alerts"])


def test_robot_swab_updates_health_tiles():
    client = _fresh_app()
    client.post("/api/robot/action/start", json={"id": "swab", "crew": "maya"})
    done = client.post("/api/robot/action/complete", json={"id": "swab", "crew": "maya"}).json()
    assert done["state"]["crew"]["maya"]["shedding"] != "not detected"
    immune = done["evals"]["maya"]["H"]["immune"]
    swab = next(t for t in immune if t["name"].startswith("Virus shedding"))
    assert swab["st"] in ("watch", "act")


def test_scenario_and_select_share_one_clock():
    client = _fresh_app()
    client.post("/api/select", json={"crew": "sam"})
    started = client.post("/api/scenario/start", json={"id": "checkup"}).json()
    assert started["state"]["selected"] == "sam"
    assert started["state"]["run"]["scenario"] == "checkup"

    step = client.post("/api/scenario/next", json={}).json()
    assert step["actor"] == "ROBOT"
    day = step["state"]["day"]

    again = client.get("/api/state").json()
    assert again["state"]["day"] == day
    assert again["state"]["run"]["scenario"] == "checkup"


def test_sleep_act_plan_escalates_to_surgeon():
    import app.engine as engine

    state = engine.initial_state()
    # Force three nights under 6 h so Sleep tile is act.
    p = state["crew"]["maya"]
    p["hist"]["sleep"] = [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0]
    ev = engine.evaluate(state, "maya")
    sleep_alerts = [a for a in ev["alerts"] if a["tile"].startswith("Sleep")]
    assert sleep_alerts
    act = next(a for a in sleep_alerts if a["st"] == "act")
    assert act["level"] == "surgeon"
