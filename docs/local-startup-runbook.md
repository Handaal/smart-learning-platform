# Local Startup & Preview Runbook

This runbook standardizes local startup so preview does not fail silently.

## 1) Required services

- PostgreSQL (Docker service: `db`)
- Redis (Docker service: `redis`)
- Backend API (`http://127.0.0.1:3001`)
- Frontend app (`http://127.0.0.1:5173`)
- Face model assets (manifest available from frontend static path)

## 2) Environment files

### Backend

Copy:

- `backend/.env.example` -> `backend/.env`

Minimum required keys:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `AI_SERVICE_URL` (if AI integration is enabled)
- `AI_SERVICE_API_KEY` (if AI integration is enabled)

Optional but recommended:

- `FACE_MODEL_ASSETS_DIR` (absolute path fallback for model manifest checks)
- `REQUIRE_MODEL_ASSETS_CHECK` (`true` to fail readiness if model assets are missing)

### Frontend

Copy:

- `frontend/.env.example` -> `frontend/.env`

Keys:

- `VITE_API_BASE_URL=http://127.0.0.1:3001`
- `VITE_FACE_API_MODEL_URL=/faceapi-models/` (optional explicit model path)

## 3) Unified startup (Windows PowerShell)

From project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
```

Optional flags:

- `-SkipDocker` if DB/Redis already running
- `-NoInstall` to skip dependency installation

## 4) Health checks

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/health-check.ps1
```

Checks include:

- frontend root is reachable
- backend `GET /api/health`
- backend `GET /api/health/ready`
- face model manifest at:
  - `/faceapi-models/tiny_face_detector_model-weights_manifest.json`
  - `/models/faceapi/tiny_face_detector_model-weights_manifest.json`

## 5) Backend readiness semantics

`/api/health/ready` reports:

- DB connectivity
- Redis connectivity
- face model assets availability
- critical env presence

HTTP status:

- `200` = ready
- `503` = degraded (check `checks` payload for exact failure)

## 6) Common failure patterns

- Preview opens but no data: backend not running or token invalid.
- Emotion validation shows no detections: model manifest missing or inaccessible.
- Research dashboards show inconsistent/empty values: filters are active or source tables have partial logs.

Use the readiness endpoint and health script first before debugging UI.
