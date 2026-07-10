# Pragati Sahayak Agent Backend

Render-ready Node.js backend for the Pragati Sahayak AI audit form.

## Render settings
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`

## Required environment variable
- `GEMINI_API_KEY`

## Optional environment variables
- `GEMINI_MODEL` (default: `gemini-2.5-flash`)
- `ALLOWED_ORIGINS` (comma-separated origins)
- `LEAD_WEBHOOK_URL`

## Endpoints
- `GET /`
- `GET /health`
- `POST /api/chat`
- `POST /api/agent-workflow`
- `POST /api/agent-audit` (frontend-compatible alias)
