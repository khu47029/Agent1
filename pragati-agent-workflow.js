(() => {
  'use strict';

  const API_ENDPOINT = window.PRAGATI_AGENT_ENDPOINT || '/api/agent-workflow';
  const WHATSAPP = '917253985468';

  function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  }

  function addStyles() {
    const style = el('style');
    style.textContent = `
      .ps-agent-launch{position:fixed;right:24px;bottom:102px;z-index:99998;border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;font:700 14px/1.2 system-ui;box-shadow:0 18px 50px rgba(34,211,238,.28);cursor:pointer}
      .ps-agent-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,7,18,.78);backdrop-filter:blur(10px)}
      .ps-agent-modal.open{display:flex}.ps-agent-card{width:min(760px,100%);max-height:90vh;overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:#07111f;color:#e5eefb;box-shadow:0 30px 100px rgba(0,0,0,.55);padding:22px;font-family:system-ui}
      .ps-agent-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.ps-agent-head h2{margin:0;font-size:24px}.ps-agent-head p{margin:6px 0 0;color:#9fb0c6;font-size:14px}.ps-agent-close{border:0;background:#172235;color:#fff;width:38px;height:38px;border-radius:12px;font-size:22px;cursor:pointer}
      .ps-agent-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}.ps-agent-field{display:flex;flex-direction:column;gap:6px}.ps-agent-field.full{grid-column:1/-1}.ps-agent-field label{font-size:12px;color:#a9b8ca}.ps-agent-field input,.ps-agent-field select,.ps-agent-field textarea{width:100%;box-sizing:border-box;border:1px solid #26364d;border-radius:12px;background:#0c1828;color:#fff;padding:12px;font:14px system-ui;outline:none}.ps-agent-field textarea{min-height:82px;resize:vertical}.ps-agent-field input:focus,.ps-agent-field textarea:focus,.ps-agent-field select:focus{border-color:#22d3ee}
      .ps-agent-submit{width:100%;margin-top:16px;border:0;border-radius:14px;padding:14px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;font:800 15px system-ui;cursor:pointer}.ps-agent-submit:disabled{opacity:.55;cursor:wait}.ps-agent-status{margin-top:14px;color:#a8b8ca;font-size:13px}.ps-agent-result{display:none;margin-top:18px;padding:16px;border-radius:16px;background:#0c1828;border:1px solid #20324b;white-space:pre-wrap;line-height:1.55;color:#dbeafe}.ps-agent-actions{display:none;gap:10px;margin-top:12px;flex-wrap:wrap}.ps-agent-actions a,.ps-agent-actions button{border:1px solid #2c405d;border-radius:12px;padding:10px 13px;background:#132139;color:#fff;text-decoration:none;font:700 13px system-ui;cursor:pointer}
      @media(max-width:640px){.ps-agent-launch{right:16px;bottom:94px;padding:12px 15px}.ps-agent-grid{grid-template-columns:1fr}.ps-agent-field.full{grid-column:auto}.ps-agent-card{padding:18px;border-radius:20px}.ps-agent-head h2{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function buildUI() {
    const launch = el('button', { class: 'ps-agent-launch', type: 'button', 'aria-label': 'Open free AI business audit' }, '✨ Free AI Audit');
    const modal = el('div', { class: 'ps-agent-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Pragati Sahayak AI Audit' });
    const card = el('div', { class: 'ps-agent-card' });
    const head = el('div', { class: 'ps-agent-head' });
    const heading = el('div');
    heading.append(el('h2', {}, 'Pragati Sahayak AI Team'), el('p', {}, 'Audit + Local SEO + Package recommendation + WhatsApp follow-up'));
    const close = el('button', { class: 'ps-agent-close', type: 'button', 'aria-label': 'Close' }, '×');
    head.append(heading, close);

    const form = el('form');
    const grid = el('div', { class: 'ps-agent-grid' });
    const fields = [
      ['businessName', 'Business name *', 'text', 'Example: Sharma Dental Care'],
      ['businessType', 'Business type *', 'text', 'Dental clinic, salon, gym...'],
      ['city', 'City *', 'text', 'Agra'],
      ['website', 'Website URL', 'url', 'https://example.com'],
      ['whatsapp', 'WhatsApp number *', 'tel', '+91...'],
      ['budget', 'Budget', 'text', '₹15,000–₹30,000'],
      ['timeline', 'Timeline', 'text', 'Within 2 weeks']
    ];
    fields.forEach(([name, label, type, placeholder]) => {
      const wrap = el('div', { class: 'ps-agent-field' });
      wrap.append(el('label', { for: `ps-${name}` }, label), el('input', { id: `ps-${name}`, name, type, placeholder, ...(label.includes('*') ? { required: 'required' } : {}) }));
      grid.appendChild(wrap);
    });
    const goalWrap = el('div', { class: 'ps-agent-field full' });
    goalWrap.append(el('label', { for: 'ps-goal' }, 'Main goal / problem'), el('textarea', { id: 'ps-goal', name: 'goal', placeholder: 'Example: More WhatsApp bookings and a premium online image' }));
    grid.appendChild(goalWrap);

    const submit = el('button', { class: 'ps-agent-submit', type: 'submit' }, 'Run My AI Agent Team');
    const status = el('div', { class: 'ps-agent-status', 'aria-live': 'polite' });
    const result = el('div', { class: 'ps-agent-result' });
    const actions = el('div', { class: 'ps-agent-actions' });
    const copy = el('button', { type: 'button' }, 'Copy Report');
    const whatsapp = el('a', { target: '_blank', rel: 'noopener' }, 'Discuss on WhatsApp');
    actions.append(copy, whatsapp);
    form.append(grid, submit, status, result, actions);
    card.append(head, form);
    modal.appendChild(card);
    document.body.append(launch, modal);

    const setOpen = value => {
      modal.classList.toggle('open', value);
      document.body.style.overflow = value ? 'hidden' : '';
      if (value) setTimeout(() => form.querySelector('input')?.focus(), 50);
    };
    launch.addEventListener('click', () => setOpen(true));
    close.addEventListener('click', () => setOpen(false));
    modal.addEventListener('click', event => { if (event.target === modal) setOpen(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });

    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(result.textContent || '');
      copy.textContent = 'Copied ✓';
      setTimeout(() => { copy.textContent = 'Copy Report'; }, 1500);
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Agents are working…';
      status.textContent = 'Audit Agent → SEO Agent → Proposal Agent → Sales Agent → CEO review';
      result.style.display = 'none';
      actions.style.display = 'none';

      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const response = await fetch(API_ENDPOINT, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        result.textContent = data.result?.final || 'Report generated, but no text was returned.';
        result.style.display = 'block';
        actions.style.display = 'flex';
        status.textContent = `Report ID: ${data.id}`;
        const msg = `Namaste Pragati Sahayak, maine AI audit complete kiya hai. Business: ${payload.businessName}, City: ${payload.city}. Report ID: ${data.id}. Main next step discuss karna chahta/chahti hoon.`;
        whatsapp.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
      } catch (error) {
        status.textContent = `Unable to run audit: ${error.message}. Backend URL configure karein ya WhatsApp par contact karein.`;
      } finally {
        submit.disabled = false;
        submit.textContent = 'Run My AI Agent Team';
      }
    });
  }

  const start = () => { addStyles(); buildUI(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
