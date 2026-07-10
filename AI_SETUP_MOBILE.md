# Pragati Sahayak AI Setup (Mobile + Termux)

## What was added
- Secure Gemini backend (`api/server.js`)
- AI website connector with local fallback (`pragati-ai.js`)
- Approved business knowledge (`knowledge/pragati-sahayak.json`)
- Agent and workflow documentation
- API key safety using `.env.example`

## Important
Never put the Gemini API key inside `index.html`, `pragati-ai.js`, GitHub, screenshots or public chat.
GitHub Pages can host the website, but it cannot securely run this Node API. Run the API on a server/VPS/Render/Railway/Vercel-compatible backend, then set the public endpoint before `pragati-ai.js`:

```html
<script>window.PRAGATI_AI_ENDPOINT='https://YOUR-BACKEND.example/api/chat';</script>
<script src="pragati-ai.js" defer></script>
```

## Test locally in Ubuntu/Termux

```bash
cd ~/PragatiSahayak
cp .env.example .env
nano .env
set -a; . ./.env; set +a
npm start
```

Open another Termux session and test:

```bash
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/api/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Mere salon ke liye kaunsa plan best hai?"}'
```

## Website preview
From the project folder:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080` in the phone browser. The chatbot uses local approved answers until a public backend URL is configured.
