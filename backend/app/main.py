"""SPECC mission API.

Run from the backend/ directory:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import robot_actions, scenarios, spec, store


@asynccontextmanager
async def lifespan(_app: FastAPI):
    store.set_event_loop(asyncio.get_running_loop())
    yield


app = FastAPI(title="SPECC Mission API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SelectBody(BaseModel):
    crew: str


class ScenarioBody(BaseModel):
    id: str


class RobotPauseBody(BaseModel):
    paused: bool


class RobotActionBody(BaseModel):
    id: str
    crew: Optional[str] = None


class EnvUpdateBody(BaseModel):
    module: Optional[str] = None
    co2: Optional[float] = None
    rad: Optional[float] = None
    spe: Optional[str] = None


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": True}


@app.get("/api/state")
def get_state() -> Dict[str, Any]:
    return store.envelope()


@app.get("/api/scenarios")
def get_scenarios() -> List[Dict[str, Any]]:
    return scenarios.meta()


@app.get("/api/robot/actions")
def get_robot_actions() -> List[Dict[str, Any]]:
    return robot_actions.meta()


@app.get("/api/meta")
def get_meta() -> Dict[str, Any]:
    """Static spec served to the frontend: sources, layout, thresholds."""
    return {
        "sources": spec.SOURCES,
        "modules": spec.MODULES,
        "links": spec.LINKS,
        "hazMeta": spec.HAZ_META,
        "regions": spec.REGIONS,
        "levels": spec.LEVEL,
        "landing": spec.LANDING,
        "evaDay": spec.EVA_DAY,
        "evaFloor": spec.EVA_FLOOR,
    }


@app.post("/api/select")
def post_select(body: SelectBody) -> Dict[str, Any]:
    return store.select(body.crew)


@app.post("/api/reset")
def post_reset() -> Dict[str, Any]:
    return store.reset()


@app.post("/api/scenario/start")
def post_start(body: ScenarioBody) -> Dict[str, Any]:
    result = store.start(body.id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {body.id}")
    return result


@app.post("/api/scenario/next")
def post_next() -> Dict[str, Any]:
    result = store.next_step()
    if result is None:
        raise HTTPException(status_code=409, detail="No scenario step available")
    return result


@app.post("/api/scenario/stop")
def post_stop() -> Dict[str, Any]:
    return store.stop()


@app.post("/api/robot/pause")
def post_robot_pause(body: RobotPauseBody) -> Dict[str, Any]:
    return store.set_robot_paused(body.paused)


@app.post("/api/robot/action/start")
def post_robot_start(body: RobotActionBody) -> Dict[str, Any]:
    result = store.begin_robot_action(body.id, body.crew)
    if result is None:
        raise HTTPException(status_code=409, detail="Robot unavailable or unknown action")
    return result


@app.post("/api/robot/action/complete")
def post_robot_complete(body: RobotActionBody) -> Dict[str, Any]:
    result = store.complete_robot_action(body.id, body.crew)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Unknown action: {body.id}")
    return result


@app.post("/api/env/update")
def post_env_update(body: EnvUpdateBody) -> Dict[str, Any]:
    result = store.update_environment(body.module, body.co2, body.rad, body.spe)
    if result is None:
        raise HTTPException(status_code=400, detail="Invalid environmental update")
    return result


@app.post("/api/env/snapshot")
def post_env_snapshot() -> Dict[str, Any]:
    return store.env_snapshot("manual")


@app.websocket("/ws/mission")
async def mission_ws(ws: WebSocket) -> None:
    await ws.accept()
    store.subscribe(ws)
    try:
        await ws.send_json(store.envelope())
        while True:
            # Clients may send pings; ignore payload and keep the socket alive.
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        store.unsubscribe(ws)
