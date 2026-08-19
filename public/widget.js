/**
 * Shepherd AI — Embeddable Live Chat Widget
 * Usage:
 * <script src="https://YOUR_DOMAIN/widget.js" data-org-id="YOUR_ORGANIZATION_UUID" data-api-url="https://YOUR_BACKEND_URL"></script>
 */

(function () {
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const orgId = currentScript.getAttribute('data-org-id') || new URLSearchParams(window.location.search).get('orgId') || '';
  const apiUrl = currentScript.getAttribute('data-api-url') || 'http://localhost:8000';
  const primaryColor = currentScript.getAttribute('data-color') || '#0d9488'; // teal-600

  // Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #shepherd-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #shepherd-widget-btn {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background-color: ${primaryColor};
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      transition: transform 0.2s;
    }
    #shepherd-widget-btn:hover {
      transform: scale(1.05);
    }
    #shepherd-widget-box {
      display: none;
      width: 360px;
      height: 520px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      flex-direction: column;
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
    }
    #shepherd-widget-header {
      background: ${primaryColor};
      color: #ffffff;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #shepherd-widget-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .shepherd-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.4;
    }
    .shepherd-msg-in {
      background: #ffffff;
      color: #1e293b;
      align-self: flex-start;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 2px;
    }
    .shepherd-msg-out {
      background: ${primaryColor};
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    #shepherd-widget-input-bar {
      padding: 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
    }
    #shepherd-widget-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 14px;
      outline: none;
    }
    #shepherd-widget-input:focus {
      border-color: ${primaryColor};
    }
    #shepherd-widget-send {
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
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
          <strong style="font-size: 16px;">Live Assistant</strong>
          <div style="font-size: 12px; opacity: 0.9;">Powered by Shepherd AI</div>
        </div>
        <button id="shepherd-widget-close" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
      </div>
      <div id="shepherd-widget-messages">
        <div class="shepherd-msg shepherd-msg-in">
          Hello! 👋 How can we help you today?
        </div>
      </div>
      <div id="shepherd-widget-input-bar">
        <input type="text" id="shepherd-widget-input" placeholder="Type a message..." />
        <button id="shepherd-widget-send">➤</button>
      </div>
    </div>
    <button id="shepherd-widget-btn">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

  let visitorName = 'Web Visitor';

  btn.addEventListener('click', () => {
    box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
  });

  closeBtn.addEventListener('click', () => {
    box.style.display = 'none';
  });

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // Add user message
    const userBubble = document.createElement('div');
    userBubble.className = 'shepherd-msg shepherd-msg-out';
    userBubble.textContent = text;
    msgs.appendChild(userBubble);
    msgs.scrollTop = msgs.scrollHeight;

    // Call API
    try {
      const res = await fetch(`${apiUrl}/api/widget/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          visitor_name: visitorName,
          message: text
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botBubble = document.createElement('div');
        botBubble.className = 'shepherd-msg shepherd-msg-in';
        botBubble.textContent = data.reply || 'Thanks for reaching out!';
        msgs.appendChild(botBubble);
        msgs.scrollTop = msgs.scrollHeight;
      }
    } catch (err) {
      console.error('Widget error:', err);
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
})();
