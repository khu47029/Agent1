# Pragati Sahayak AI Agent Website Integration

## What this version does
The website now has a **Free AI Audit** button. A visitor submits business details and the secure backend runs this workflow:

1. Website Audit Agent
2. Local SEO Agent
3. Proposal Agent
4. Sales Follow-up Agent
5. CEO Review Agent

The visitor receives one final report and a WhatsApp button. The normal Riya website chatbot also uses the same Gemini backend.

> The public workflow is implemented as secure role-based AI orchestration. Your Ruflo agents running inside Termux remain local to your phone; a public website cannot call them while the phone is offline. This backend gives visitors the same business workflow 24/7 when deployed online.

## 1. Deploy the backend on Render
1. Upload this project to a private or public GitHub repository. Do not upload `.env`.
2. In Render choose **New > Blueprint** and select the repository. `render.yaml` is included.
3. Add the secret environment variable `GEMINI_API_KEY`.
4. Deploy and copy the backend URL, for example `https://pragati-sahayak-agent-api.onrender.com`.
5. Open `/health` on that URL. It should return `{"ok":true,...}`.

## 2. Connect pragatisahayak.in
Edit `ai-config.js`:

```js
window.PRAGATI_AI_ENDPOINT = 'https://YOUR-BACKEND.onrender.com/api/chat';
window.PRAGATI_AGENT_ENDPOINT = 'https://YOUR-BACKEND.onrender.com/api/agent-workflow';
```

Commit/push the website to GitHub Pages. Never put the Gemini API key in this file.

## 3. Test on mobile before deployment
Inside Ubuntu/Termux:

```bash
cd ~/PragatiSahayak
cp .env.example .env
nano .env
set -a; . ./.env; set +a
npm start
```

In another Termux session:

```bash
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/api/agent-workflow \
  -H 'content-type: application/json' \
  -d '{"businessName":"Demo Dental","businessType":"Dental clinic","city":"Agra","website":"https://example.com","whatsapp":"919999999999","goal":"More bookings"}'
```

Preview the website from the project folder:

```bash
python3 -m http.server 8080
```

For local browser testing, update `ai-config.js` temporarily to `http://127.0.0.1:8787/api/chat` and `http://127.0.0.1:8787/api/agent-workflow`.

## 4. Optional automatic lead saving
Set `LEAD_WEBHOOK_URL` to an n8n/Make webhook. Each completed report will POST the lead details and agent outputs to that webhook. From there, save it to Google Sheets or your CRM.

## Security
- Keep `.env` private.
- Never share the API key in screenshots or chat.
- Restrict `ALLOWED_ORIGINS` to your real domains.
- The backend rate-limits requests and validates lead data.
