# SPECC

**Spatial Predictive Environmental Computing Companion** — NASA Space Apps Challenge 2026 demo.

Team: Sophie, Lohitha, Ruhi, Anushka, Terry

SPECC links station environmental sensors and a companion robot to one mission brain. The React UI shows astronaut health, a station heatmap, sensor scans, and a 3D robot check-up; a FastAPI backend owns all mission state and evaluations (NASA / TEAM thresholds from the original demo).

## Architecture

- **Single source of truth:** one Python process holds mission clock, crew, CO₂, radiation, and robot telemetry.
- **Clients are views:** React screens read/write via REST; WebSocket `/ws/mission` keeps tabs in sync.
- **Separation:** health formulas and scenarios live in the backend (`engine`, `scenarios`, `spec`); the frontend renders and paces demos only.
- All readings are **simulated**.

## Run

Requires Python 3.11+ and Node 18+.

```bash
# Terminal 1 — API (port 8000)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — UI (port 5174; proxies /api and /ws → 8000)
cd frontend
npm install
npm run dev
```

Open [http://127.0.0.1:5174/console](http://127.0.0.1:5174/console).

| Route | Purpose |
| --- | --- |
| `/console` | Mission Console (astronauts + station heatmap) |
| `/robot` | 3D robot vital scan |
| `/environment` | Station sensor bay scan |
| `/simulation` | Scripted mission scenarios |
| `/pitch` | Pitch deck |

## Test / build

```bash
cd backend && pytest -q
cd frontend && npm run build
```
