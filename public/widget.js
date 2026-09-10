/**
 * Shepherd AI — Universal Embeddable Live Chat & Concierge Widget
 * 
 * Embed code:
 * <script src="https://YOUR_DOMAIN/widget.js" data-org-id="YOUR_ORGANIZATION_UUID" data-api-url="https://YOUR_BACKEND_URL" defer></script>
 */

(function () {
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const orgId = currentScript.getAttribute('data-org-id') || new URLSearchParams(window.location.search).get('orgId') || '';
  const apiUrl = (currentScript.getAttribute('data-api-url') || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://shepherd-ai-backend.onrender.com')).replace(/\/+$/, '');
  let primaryColor = currentScript.getAttribute('data-color') || '#0d9488'; // teal-600 default
  let aiName = 'Live Concierge';
  let welcomeMsg = 'Hello! How can I assist you today?';
  let position = 'bottom-right';

  // Pre-warm backend server immediately to eliminate cold start sleep
  try {
    fetch(`${apiUrl}/health`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
  } catch (e) {}

  // Inject Styles
  const style = document.createElement('style');
  style.id = 'shepherd-widget-styles';
  style.innerHTML = `
    #shepherd-widget-container {
      position: fixed;
      bottom: 24px;
      ${position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #shepherd-widget-btn {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background-color: ${primaryColor};
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    #shepherd-widget-btn:hover {
      transform: scale(1.08);
    }
    #shepherd-widget-box {
      display: none;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 560px;
      max-height: calc(100vh - 110px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
      flex-direction: column;
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      animation: shepherdFadeIn 0.25s ease-out;
    }
    @keyframes shepherdFadeIn {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    #shepherd-widget-header {
      background: ${primaryColor};
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #shepherd-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .shepherd-msg {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.45;
      word-wrap: break-word;
      white-space: pre-line;
    }
    .shepherd-msg-in {
      background: #ffffff;
      color: #1e293b;
      align-self: flex-start;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .shepherd-msg-out {
      background: ${primaryColor};
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    /* Catalog Cards */
    .shepherd-cards-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      margin-top: 6px;
    }
    .shepherd-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
    }
    .shepherd-card-img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      background: #f1f5f9;
    }
    .shepherd-card-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .shepherd-card-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .shepherd-card-price {
      display: inline-block;
      font-size: 13px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .shepherd-card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }
    .shepherd-tag {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }
    .shepherd-card-btn {
      display: block;
      text-align: center;
      background: ${primaryColor};
      color: #ffffff;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 8px;
      margin-top: 6px;
      transition: opacity 0.2s;
    }
    .shepherd-card-btn:hover {
      opacity: 0.9;
    }
    /* Typing indicator */
    .shepherd-typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .shepherd-dot {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: shepherdBounce 1.4s infinite ease-in-out both;
    }
    .shepherd-dot:nth-child(1) { animation-delay: -0.32s; }
    .shepherd-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes shepherdBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    #shepherd-widget-input-bar {
      padding: 10px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
      align-items: center;
      position: relative;
    }
    #shepherd-widget-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 18px;
      padding: 9px 14px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    #shepherd-widget-input:focus {
      border-color: ${primaryColor};
    }
    #shepherd-widget-send, #shepherd-widget-mic {
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 50%;
      width: 38px;
      height: 38px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, background 0.2s;
      flex-shrink: 0;
    }
    #shepherd-widget-send:active, #shepherd-widget-mic:active {
      transform: scale(0.92);
    }
    #shepherd-widget-mic {
      background: #f1f5f9;
      color: #475569;
    }
    #shepherd-widget-mic:hover {
      background: #e2e8f0;
      color: #1e293b;
    }
    #shepherd-recording-overlay {
      display: none;
      position: absolute;
      left: 10px;
      right: 10px;
      top: 8px;
      bottom: 8px;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 20px;
      align-items: center;
      padding: 0 12px;
      gap: 10px;
      z-index: 5;
    }
    .shepherd-rec-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      animation: shepherdPulse 1s infinite alternate;
    }
    @keyframes shepherdPulse {
      0% { opacity: 0.3; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1.15); }
    }
    .shepherd-rec-timer {
      font-size: 13px;
      font-weight: 600;
      color: #991b1b;
      flex: 1;
    }
    .shepherd-rec-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .shepherd-rec-btn:hover {
      background: rgba(0,0,0,0.06);
    }
  `;
  document.head.appendChild(style);

  // Container
  const container = document.createElement('div');
  container.id = 'shepherd-widget-container';
  container.innerHTML = `
    <div id="shepherd-widget-box">
      <div id="shepherd-widget-header">
        <div>
          <strong id="shepherd-header-title" style="font-size: 16px; font-weight: 700;">Live Assistant</strong>
          <div style="font-size: 11px; opacity: 0.85;">Powered by Shepherd AI</div>
        </div>
        <button id="shepherd-widget-close" style="background:none; border:none; color:white; font-size:18px; cursor:pointer; padding:4px;">✕</button>
      </div>
      <div id="shepherd-widget-messages">
        <div class="shepherd-msg shepherd-msg-in" id="shepherd-welcome-bubble">
          ${welcomeMsg}
        </div>
      </div>
      <div id="shepherd-widget-input-bar">
        <textarea id="shepherd-widget-input" rows="1" placeholder="Ask a question or inquire about products..." autocomplete="off" style="resize:none; max-height:120px; overflow-y:auto; line-height:1.4; padding:9px 14px; font-family:inherit; font-size:14px; flex:1; border:1px solid #cbd5e1; border-radius:18px; outline:none; transition:border-color 0.2s;"></textarea>
        <button id="shepherd-widget-mic" title="Hold or click to record voice note" type="button" aria-label="Record voice note">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
        <button id="shepherd-widget-send" title="Send message" type="button" aria-label="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
        <div id="shepherd-recording-overlay">
          <div class="shepherd-rec-dot"></div>
          <span class="shepherd-rec-timer" id="shepherd-rec-timer">Recording 0:00</span>
          <button type="button" class="shepherd-rec-btn" id="shepherd-rec-cancel" title="Cancel recording" style="color:#ef4444; font-size:13px; font-weight:600;">Cancel</button>
          <button type="button" class="shepherd-rec-btn" id="shepherd-rec-send" title="Send recording" style="color:#16a34a; font-size:13px; font-weight:700;">Send ✓</button>
        </div>
      </div>
    </div>
    <button id="shepherd-widget-btn" aria-label="Open Chat">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
  `;
  document.body.appendChild(container);

  const btn = document.getElementById('shepherd-widget-btn');
  const box = document.getElementById('shepherd-widget-box');
  const closeBtn = document.getElementById('shepherd-widget-close');
  const input = document.getElementById('shepherd-widget-input');
  const sendBtn = document.getElementById('shepherd-widget-send');
  const msgs = document.getElementById('shepherd-widget-messages');
  const headerTitle = document.getElementById('shepherd-header-title');
  const welcomeBubble = document.getElementById('shepherd-welcome-bubble');

  // Auto-expand textarea as user types
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Load Dynamic Configuration
  if (orgId) {
    fetch(`${apiUrl}/api/widget/config/${orgId}`)
      .then(res => res.json())
      .then(cfg => {
        if (cfg.ai_name) {
          aiName = cfg.ai_name;
          headerTitle.textContent = aiName;
        }
        if (cfg.welcome_message) {
          welcomeMsg = cfg.welcome_message;
          if (welcomeBubble) welcomeBubble.textContent = welcomeMsg;
        }
        if (cfg.placeholder) {
          input.placeholder = cfg.placeholder;
        }
        if (cfg.primary_color && cfg.primary_color !== primaryColor) {
          primaryColor = cfg.primary_color;
          btn.style.backgroundColor = primaryColor;
          document.getElementById('shepherd-widget-header').style.backgroundColor = primaryColor;
          sendBtn.style.backgroundColor = primaryColor;
        }
      })
      .catch(e => console.warn('[Shepherd Widget] Config load error:', e));
  }

  // Session persistence
  const storageKey = `shepherd_chat_${orgId || 'default'}`;
  let visitorName = localStorage.getItem('shepherd_visitor_name') || 'Web Visitor';
  let visitorId = localStorage.getItem('shepherd_visitor_id');
  if (!visitorId) {
    visitorId = 'web_' + Math.random().toString(36).substring(2, 9);
    try { localStorage.setItem('shepherd_visitor_id', visitorId); } catch (e) {}
  }

  // Track seen messages to avoid duplicates
  const seenMessageIds = new Set();
  const seenMessageTexts = new Set();

  // Poll for replies from human agents in the dashboard
  const pollAgentMessages = async () => {
    if (!orgId || !visitorId || box.style.display !== 'flex') return;
    try {
      const pRes = await fetch(`${apiUrl}/api/widget/poll/${orgId}/${visitorId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.messages && pData.messages.length > 0) {
          let hasNew = false;
          pData.messages.forEach(m => {
            const cleanContent = (m.content || '').trim();
            if (!seenMessageIds.has(m.id) && !seenMessageTexts.has(cleanContent)) {
              seenMessageIds.add(m.id);
              seenMessageTexts.add(cleanContent);
              hasNew = true;
              const botBubble = document.createElement('div');
              botBubble.className = 'shepherd-msg shepherd-msg-in';
              botBubble.textContent = m.content;
              msgs.appendChild(botBubble);
            }
          });
          if (hasNew) msgs.scrollTop = msgs.scrollHeight;
        }
      }
    } catch (e) {}
  };
  setInterval(pollAgentMessages, 4000);

  // Toggle Box
  btn.addEventListener('click', () => {
    const isVisible = box.style.display === 'flex';
    box.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      input.focus();
      msgs.scrollTop = msgs.scrollHeight;
      pollAgentMessages();
    }
  });

  closeBtn.addEventListener('click', () => {
    box.style.display = 'none';
  });

  // Render typing indicator
  const showTyping = () => {
    const typing = document.createElement('div');
    typing.className = 'shepherd-typing';
    typing.id = 'shepherd-typing-indicator';
    typing.innerHTML = '<div class="shepherd-dot"></div><div class="shepherd-dot"></div><div class="shepherd-dot"></div>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
  };

  const hideTyping = () => {
    const el = document.getElementById('shepherd-typing-indicator');
    if (el) el.remove();
  };

  // Render Cards
  const renderCatalogCards = (items) => {
    if (!items || !items.length) return null;
    const list = document.createElement('div');
    list.className = 'shepherd-cards-list';

    items.forEach(itm => {
      const card = document.createElement('div');
      card.className = 'shepherd-card';

      let imgHtml = '';
      if (itm.image_url) {
        imgHtml = `<img src="${itm.image_url}" class="shepherd-card-img" alt="${itm.title}" onerror="this.onerror=null; this.src='https://decehub.com/wp-content/uploads/2024/07/cropped-PHEMpion-9-1-180x180.png';" />`;
      }

      let tagsHtml = '';
      if (itm.attributes && typeof itm.attributes === 'object') {
        const tagSpans = Object.entries(itm.attributes)
          .filter(([k, v]) => v && typeof v !== 'object')
          .slice(0, 4)
          .map(([k, v]) => `<span class="shepherd-tag">${v}</span>`)
          .join('');
        if (tagSpans) tagsHtml = `<div class="shepherd-card-tags">${tagSpans}</div>`;
      }

      const actionLink = itm.action_url || ('https://decehub.com/?s=' + encodeURIComponent(itm.title));
      const actionText = 'Buy Now →';

      card.innerHTML = `
        ${imgHtml}
        <div class="shepherd-card-body">
          <div class="shepherd-card-title">${itm.title}</div>
          <div class="shepherd-card-price">${itm.price || ''}</div>
          ${tagsHtml}
          <a href="${actionLink}" target="_blank" rel="noopener" class="shepherd-card-btn">${actionText}</a>
        </div>
      `;
      list.appendChild(card);
    });

    return list;
  };

  // Send Message
  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';

    // Render User Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'shepherd-msg shepherd-msg-out';
    userBubble.textContent = text;
    msgs.appendChild(userBubble);
    msgs.scrollTop = msgs.scrollHeight;

    showTyping();

    try {
      let res;
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          res = await fetch(`${apiUrl}/api/widget/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: orgId,
              visitor_name: visitorName,
              visitor_phone_or_email: visitorId,
              message: text
            })
          });
          if (res && res.ok) break;
        } catch (fetchErr) {
          if (attempts < 2) {
            // Server may be warming up on Render, pause 2.5s and retry automatically
            await new Promise(r => setTimeout(r, 2500));
          } else {
            throw fetchErr;
          }
        }
      }

      hideTyping();

      if (res && res.ok) {
        const data = await res.json();
        
        // Track message IDs and reply content to prevent duplicate bubble from poller
        if (data.message_id) seenMessageIds.add(data.message_id);
        if (data.outbound_message_id) seenMessageIds.add(data.outbound_message_id);
        if (data.inbound_message_id) seenMessageIds.add(data.inbound_message_id);
        function extractCleanReply(rawReply) {
          if (!rawReply || typeof rawReply !== 'string') return 'Hello! How can I assist you today?';
          let clean = rawReply.trim();
          if (clean.startsWith('{') && clean.includes('"reply"')) {
            try {
              const parsed = JSON.parse(clean);
              if (parsed.reply) return parsed.reply.trim();
            } catch (e) {
              const m = clean.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              if (m && m[1]) {
                return m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
              }
            }
          }
          return clean || 'Hello! How can I assist you today?';
        }

        const cleanReply = extractCleanReply(data.reply);
        if (cleanReply) seenMessageTexts.add(cleanReply.trim());

        // AI Text Reply
        const botBubble = document.createElement('div');
        botBubble.className = 'shepherd-msg shepherd-msg-in';
        botBubble.textContent = cleanReply;
        msgs.appendChild(botBubble);

        // Render Recommended Item Cards if present
        if (data.recommended_items && data.recommended_items.length > 0) {
          const cardsEl = renderCatalogCards(data.recommended_items);
          if (cardsEl) msgs.appendChild(cardsEl);
        }

        msgs.scrollTop = msgs.scrollHeight;
      } else {
        const errBubble = document.createElement('div');
        errBubble.className = 'shepherd-msg shepherd-msg-in';
        errBubble.textContent = "We couldn't connect right now. Please try again or refresh the page.";
        msgs.appendChild(errBubble);
      }
    } catch (err) {
      hideTyping();
      console.error('[Shepherd Widget Error]:', err);
      const errBubble = document.createElement('div');
      errBubble.className = 'shepherd-msg shepherd-msg-in';
      errBubble.textContent = "Server was warming up. Please send your message again now.";
      msgs.appendChild(errBubble);
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Voice Recording Implementation
  const micBtn = document.getElementById('shepherd-widget-mic');
  const recOverlay = document.getElementById('shepherd-recording-overlay');
  const recTimer = document.getElementById('shepherd-rec-timer');
  const recCancel = document.getElementById('shepherd-rec-cancel');
  const recSend = document.getElementById('shepherd-rec-send');

  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStartTime = 0;
  let recordingInterval = null;
  let isCancelled = false;
  let speechRecognizer = null;
  let clientTranscript = "";

  const updateRecTimer = () => {
    const elapsedSec = Math.floor((Date.now() - recordingStartTime) / 1000);
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    if (clientTranscript) {
      const snippet = clientTranscript.length > 28 ? "..." + clientTranscript.slice(-25) : clientTranscript;
      recTimer.textContent = `"${snippet}"`;
    } else {
      recTimer.textContent = `Recording ${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Voice recording is not supported in this browser.");
        return;
      }

      isCancelled = false;
      clientTranscript = "";
      audioChunks = [];

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // Initialize real-time client-side Speech Recognition synchronously in user gesture
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition && !speechRecognizer) {
        try {
          speechRecognizer = new SpeechRecognition();
          speechRecognizer.continuous = !isMobile;
          speechRecognizer.interimResults = true;
          speechRecognizer.lang = 'en-US';
          speechRecognizer.onresult = (event) => {
            let combined = '';
            for (let i = 0; i < event.results.length; ++i) {
              combined += event.results[i][0].transcript;
            }
            if (combined.trim()) {
              clientTranscript = combined.trim();
              updateRecTimer();
            }
          };
          speechRecognizer.onerror = (srErr) => {
            console.log('[Web Speech Info]:', srErr.error || srErr);
          };
          speechRecognizer.start();
        } catch (initErr) {
          console.log('[SpeechRecognition not available]:', initErr);
          speechRecognizer = null;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Select supported mime type (on iOS Safari, audio/mp4 is the native supported container)
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingInterval);
        recOverlay.style.display = 'none';

        if (speechRecognizer) {
          try { speechRecognizer.stop(); } catch (e) {}
          speechRecognizer = null;
        }

        if (isCancelled || !audioChunks.length) {
          audioChunks = [];
          clientTranscript = "";
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];
        const capturedSpeech = clientTranscript;
        clientTranscript = "";

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;

          // Render User Voice Note Bubble
          const userBubble = document.createElement('div');
          userBubble.className = 'shepherd-msg shepherd-msg-out';
          userBubble.textContent = capturedSpeech ? `🎙️ "${capturedSpeech}"` : '🎙️ [Voice Note sent]';
          msgs.appendChild(userBubble);
          msgs.scrollTop = msgs.scrollHeight;

          showTyping();

          try {
            const res = await fetch(`${apiUrl}/api/widget/voice-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                org_id: orgId,
                visitor_name: visitorName,
                visitor_phone_or_email: visitorId,
                audio_base64: base64Audio,
                audio_mime_type: mimeType,
                speech_transcript: capturedSpeech || null
              })
            });

            hideTyping();

            if (res.ok) {
              const data = await res.json();

              // Update user bubble with transcribed text if available
              if (data.transcription) {
                userBubble.textContent = `🎙️ "${data.transcription}"`;
              }

              if (data.message_id) seenMessageIds.add(data.message_id);
              if (data.outbound_message_id) seenMessageIds.add(data.outbound_message_id);
              const cleanVoiceReply = extractCleanReply(data.reply);
              if (cleanVoiceReply) seenMessageTexts.add(cleanVoiceReply.trim());

              // Render AI response
              const botBubble = document.createElement('div');
              botBubble.className = 'shepherd-msg shepherd-msg-in';
              botBubble.textContent = cleanVoiceReply;
              msgs.appendChild(botBubble);

              if (data.recommended_items && data.recommended_items.length > 0) {
                const cardsEl = renderCatalogCards(data.recommended_items);
                if (cardsEl) msgs.appendChild(cardsEl);
              }

              msgs.scrollTop = msgs.scrollHeight;
            } else {
              const errBubble = document.createElement('div');
              errBubble.className = 'shepherd-msg shepherd-msg-in';
              errBubble.textContent = "Could not process your voice note right now. Please type your message.";
              msgs.appendChild(errBubble);
            }
          } catch (vErr) {
            hideTyping();
            console.error('[Voice Note Send Error]:', vErr);
            const errBubble = document.createElement('div');
            errBubble.className = 'shepherd-msg shepherd-msg-in';
            errBubble.textContent = "Could not deliver voice note. Please try again.";
            msgs.appendChild(errBubble);
          }
        };
      };

      mediaRecorder.start();
      recordingStartTime = Date.now();
      recOverlay.style.display = 'flex';
      updateRecTimer();
      recordingInterval = setInterval(updateRecTimer, 1000);
    } catch (micErr) {
      console.error('[Mic Permission Error]:', micErr);
      alert("Microphone access is required to record voice notes. Please allow microphone access in your browser.");
    }
  };

  const stopRecording = (cancel = false) => {
    isCancelled = cancel;
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) {}
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else {
      clearInterval(recordingInterval);
      recOverlay.style.display = 'none';
    }
  };

  micBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording(false);
    } else {
      startRecording();
    }
  });

  recCancel.addEventListener('click', () => stopRecording(true));
  recSend.addEventListener('click', () => stopRecording(false));
})();
