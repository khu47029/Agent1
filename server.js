import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knowledgePath = path.join(__dirname, '..', 'knowledge', 'pragati-sahayak.json');
const knowledge = JSON.parse(await readFile(knowledgePath, 'utf8'));

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_KEY = process.env.GEMINI_API_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || 'https://pragatisahayak.in')
  .split(',').map(value => value.trim()).filter(Boolean);
const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || '';
const MAX_BODY = 24_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 15;
const rateMap = new Map();

function originAllowed(origin) {
  if (!origin) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function json(req, res, status, data) {
  const origin = req.headers.origin || '';
  const allowedOrigin = originAllowed(origin) ? (origin || ALLOWED_ORIGINS[0] || '*') : (ALLOWED_ORIGINS[0] || '*');
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'Origin',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
  res.end(JSON.stringify(data));
}

function checkRate(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const item = rateMap.get(ip);
  if (!item || now - item.started > RATE_WINDOW_MS) {
    rateMap.set(ip, { started: now, count: 1 });
    return true;
  }
  item.count += 1;
  return item.count <= RATE_MAX;
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error('BODY_TOO_LARGE');
  }
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('INVALID_JSON'); }
}

async function gemini(prompt, maxOutputTokens = 900) {
  if (!API_KEY) throw new Error('MISSING_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens }
    })
  });
  if (!response.ok) throw new Error(`GEMINI_${response.status}`);
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
}

function chatSystem() {
  return `You are Riya, the official Pragati Sahayak website assistant.\nApproved business knowledge:\n${JSON.stringify(knowledge)}\nRules:\n- Reply in concise Hinglish unless the user uses English.\n- Never invent guarantees, rankings, testimonials, discounts or payment confirmation.\n- Never request OTP, passwords, card data, API keys, or sensitive credentials.\n- Recommend only approved packages and say final scope is confirmed by the human team.\n- For buying intent, collect business type, city, website, WhatsApp, budget and timeline.\n- Keep replies under 180 words.`;
}

async function runChat(message, history = []) {
  const context = history.slice(-8).map(item => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${String(item.content || '').slice(0, 1200)}`).join('\n');
  return gemini(`${chatSystem()}\n\nConversation:\n${context}\nUser: ${message}\nAssistant:`, 500);
}

function cleanLead(input) {
  const lead = {
    businessName: String(input.businessName || '').trim().slice(0, 120),
    businessType: String(input.businessType || '').trim().slice(0, 100),
    city: String(input.city || '').trim().slice(0, 100),
    website: String(input.website || '').trim().slice(0, 300),
    whatsapp: String(input.whatsapp || '').replace(/[^0-9+]/g, '').slice(0, 18),
    goal: String(input.goal || '').trim().slice(0, 800),
    budget: String(input.budget || '').trim().slice(0, 100),
    timeline: String(input.timeline || '').trim().slice(0, 100)
  };
  if (!lead.businessName || !lead.businessType || !lead.city || !lead.whatsapp) throw new Error('MISSING_LEAD_FIELDS');
  if (lead.website && !/^https?:\/\//i.test(lead.website)) lead.website = `https://${lead.website}`;
  return lead;
}

async function sendLeadWebhook(payload) {
  if (!LEAD_WEBHOOK_URL) return;
  try {
    await fetch(LEAD_WEBHOOK_URL, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[lead-webhook]', error.message);
  }
}

async function runAgentWorkflow(lead) {
  const shared = `Business details: ${JSON.stringify(lead)}\nPragati Sahayak approved knowledge: ${JSON.stringify(knowledge)}`;

  const audit = await gemini(`You are the Website Audit Agent for Pragati Sahayak. ${shared}\nCreate a practical preliminary audit using only supplied details. If the website cannot actually be fetched, clearly say it is a preliminary audit and do not pretend you visited it. Cover design/mobile, trust, conversion, speed/technical checks the human team should verify, and top 5 improvements. Hinglish, concise.`, 850);

  const seo = await gemini(`You are the Local SEO Agent for Pragati Sahayak. ${shared}\nBased on the business details and this preliminary audit:\n${audit}\nCreate a local SEO action plan: keyword themes, Google Business Profile, on-page, reviews, local citations and 30-day priorities. Never guarantee rankings. Hinglish, concise.`, 850);

  const proposal = await gemini(`You are the Proposal Agent for Pragati Sahayak. ${shared}\nAudit:\n${audit}\nSEO plan:\n${seo}\nRecommend exactly one approved Pragati Sahayak package from the knowledge. Explain why, list scope, realistic timeline and next step. Do not invent discounts. Hinglish, concise.`, 700);

  const sales = await gemini(`You are the Sales Agent for Pragati Sahayak. ${shared}\nProposal:\n${proposal}\nWrite one respectful WhatsApp follow-up under 110 words. No pressure, no fake urgency. Include a clear invitation to a short call. Hinglish.`, 350);

  const final = await gemini(`You are the CEO Review Agent for Pragati Sahayak. Review the following outputs for honesty, consistency and usefulness. Remove unsupported claims. Return a polished report with headings: Executive Summary, Preliminary Website Audit, Local SEO Plan, Recommended Package, Next Step, WhatsApp Message.\nAUDIT:\n${audit}\nSEO:\n${seo}\nPROPOSAL:\n${proposal}\nSALES:\n${sales}`, 1700);

  return { audit, seo, proposal, sales, final };
}

const server = http.createServer(async (req, res) => {
  if (!originAllowed(req.headers.origin || '')) return json(req, res, 403, { error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return json(req, res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return json(req, res, 200, { ok: true, model: MODEL, agents: ['chat', 'audit', 'seo', 'proposal', 'sales', 'ceo-review'] });
  if (!checkRate(req)) return json(req, res, 429, { error: 'Too many requests. Please wait one minute.' });

  try {
    if (req.method === 'POST' && req.url === '/api/chat') {
      const body = await readBody(req);
      const message = String(body.message || '').trim().slice(0, 2000);
      if (!message) return json(req, res, 400, { error: 'Message is required' });
      const reply = await runChat(message, Array.isArray(body.history) ? body.history : []);
      return json(req, res, 200, { reply });
    }

    if (req.method === 'POST' && req.url === '/api/agent-workflow') {
      const body = await readBody(req);
      const lead = cleanLead(body);
      const id = crypto.randomUUID();
      const result = await runAgentWorkflow(lead);
      const payload = { id, createdAt: new Date().toISOString(), lead, result };
      await sendLeadWebhook(payload);
      return json(req, res, 200, payload);
    }

    return json(req, res, 404, { error: 'Not found' });
  } catch (error) {
    const known = {
      BODY_TOO_LARGE: [413, 'Request is too large'], INVALID_JSON: [400, 'Invalid request'],
      MISSING_API_KEY: [503, 'AI service is not configured'], MISSING_LEAD_FIELDS: [400, 'Business name, type, city and WhatsApp are required']
    };
    const [status, message] = known[error.message] || [500, 'AI service is temporarily unavailable'];
    console.error('[api]', error.message);
    return json(req, res, status, { error: message });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Pragati Sahayak Agent API running on http://localhost:${PORT}`));
