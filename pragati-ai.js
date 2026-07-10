(() => {
  'use strict';

  const API_ENDPOINT = window.PRAGATI_AI_ENDPOINT || '/api/chat';
  const originalSend = window.sendChatMessage;
  const originalFallback = window.getRiyaResponse;

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function normalizeHistory(history) {
    return history.slice(-8).map(item => ({
      role: item.type === 'bot' ? 'assistant' : 'user',
      content: String(item.message || '').slice(0, 1500)
    }));
  }

  window.renderChatMessages = function renderSafeChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container || !Array.isArray(window.chatHistory)) return;
    container.innerHTML = '';

    window.chatHistory.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = msg.type === 'bot' ? 'flex gap-x-3 max-w-[85%]' : 'flex justify-end';
      const safe = escapeHTML(msg.message).replace(/\n/g, '<br>');
      bubble.innerHTML = msg.type === 'bot'
        ? `<div class="w-6 h-6 bg-gradient-to-br from-purple-400 to-cyan-400 rounded-2xl flex-none flex items-center justify-center text-xs text-white">R</div><div class="chat-bubble-bot px-5 py-3 text-zinc-700">${safe}</div>`
        : `<div class="chat-bubble-user px-5 py-3">${safe}</div>`;
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  };

  window.sendChatMessage = async function sendAIChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (!text || !Array.isArray(window.chatHistory)) return;

    window.chatHistory.push({ type: 'user', message: text });
    input.value = '';
    window.renderChatMessages();

    const typing = { type: 'bot', message: 'Riya is thinking…' };
    window.chatHistory.push(typing);
    window.renderChatMessages();

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, history: normalizeHistory(window.chatHistory.slice(0, -1)) })
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      typing.message = String(data.reply || '').trim() || 'Please try again.';
    } catch (error) {
      console.warn('[Pragati AI] Cloud AI unavailable; using safe local answers.', error.message);
      typing.message = typeof originalFallback === 'function'
        ? originalFallback(text.toLowerCase(), text)
        : 'AI service abhi available nahi hai. WhatsApp par +91 72539 85468 par message karein.';
    }
    window.renderChatMessages();
  };

  window.addEventListener('error', event => {
    if (String(event.message || '').includes('ScrollTrigger')) {
      console.warn('[Pragati UI] ScrollTrigger animation skipped.');
      event.preventDefault();
    }
  });

  if (typeof originalSend !== 'function') {
    console.info('[Pragati AI] Chat enhancement loaded; waiting for chat UI.');
  }
})();
