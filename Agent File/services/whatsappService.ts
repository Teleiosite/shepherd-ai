
import { MessageLog } from '../types';

export type WhatsAppProvider = 'meta' | 'venom';

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  phoneId?: string;
  token?: string;
  bridgeUrl?: string;
}

// Backend API URL
const BACKEND_URL = 'http://localhost:8000';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// WebSocket connection for real-time incoming messages
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let messageCallback: ((message: any) => void) | null = null;
let connectionStatusCallback: ((status: string) => void) | null = null;

// Helper to clean phone numbers (E.164 without +)
const formatPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const whatsappService = {
  // Check WhatsApp connection status via backend
  // Backend automatically routes to WPPConnect bridge or Meta API
  checkStatus: async (): Promise<string> => {
    const token = getAuthToken();
    if (!token) return 'error: Not authenticated';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${BACKEND_URL}/api/whatsapp/status`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return `error: HTTP ${res.status}`;
      }

      const data = await res.json();
      return data.status || 'disconnected';
    } catch (e: any) {
      console.error("Status Check Failed:", e);
      return `error: ${e.message || e.toString()}`;
    }
  },

  // Connect to WebSocket for real-time incoming messages
  // For now, still connect directly to bridge (backend webhook coming soon)
  connectToIncoming(
    onMessage: (message: any) => void,
    onStatusChange?: (status: string) => void
  ): boolean {
    // Get bridge URL from localStorage (temporary until backend websocket)
    const bridgeUrl = localStorage.getItem('shepherd_bridge_url') || 'http://localhost:3001';

    // Store callbacks
    messageCallback = onMessage;
    if (onStatusChange) connectionStatusCallback = onStatusChange;

    // Get WebSocket URL
    let wsUrl = bridgeUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    if (wsUrl.includes(':3001')) {
      wsUrl = wsUrl.replace(':3001', ':3002');
    } else if (wsUrl.includes('localhost') && !wsUrl.match(/:\d+$/)) {
      wsUrl = `${wsUrl}:3002`;
    }

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected to bridge');
        if (connectionStatusCallback) connectionStatusCallback('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'incoming_message':
              if (messageCallback) messageCallback(data);
              break;
            case 'message_ack':
              console.log('Message ack:', data.ackStatus);
              break;
            case 'status':
              if (connectionStatusCallback) connectionStatusCallback(data.status);
              break;
            case 'state_change':
              console.log('WhatsApp state:', data.state);
              break;
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (connectionStatusCallback) connectionStatusCallback('error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, will retry in 5s...');
        if (connectionStatusCallback) connectionStatusCallback('disconnected');

        reconnectTimeout = setTimeout(() => {
          if (messageCallback) {
            whatsappService.connectToIncoming(messageCallback, connectionStatusCallback);
          }
        }, 5000);
      };

      return true;
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      return false;
    }
  },

  // Disconnect WebSocket
  disconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    messageCallback = null;
    connectionStatusCallback = null;
  },

  // Send message via backend API (automatically routes to WPPConnect or Meta)
  sendMessage: async (phone: string, text: string, whatsappId?: string, contactId?: string, maxRetries: number = 3): Promise<{ success: boolean; error?: string; provider?: string }> => {
    const token = getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated. Please login.' };
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone,
            message: text,
            whatsapp_id: whatsappId,
            contact_id: contactId
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // If it's the last attempt, return the error
          if (attempt === maxRetries - 1) {
            console.log(`❌ Failed after ${maxRetries} attempts:`, data.error);
            return { success: false, error: data.error || 'Send failed' };
          }

          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt + 1) * 1000;
          console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Success!
        return { success: true, provider: data.provider };
      } catch (e: any) {
        if (attempt === maxRetries - 1) {
          return { success: false, error: `Connection Failed: ${e.message}` };
        }

        const waitTime = Math.pow(2, attempt + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  },

  // Send media via backend API
  sendMedia: async (phone: string, mediaType: string, mediaData: string, caption?: string, filename?: string, whatsappId?: string, contactId?: string): Promise<{ success: boolean; error?: string; provider?: string }> => {
    const token = getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated. Please login.' };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/whatsapp/send-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          media_type: mediaType,
          media_data: mediaData,
          caption: caption || '',
          filename: filename || '',
          whatsapp_id: whatsappId,
          contact_id: contactId
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Media send failed' };
      }
      return { success: true, provider: data.provider };
    } catch (e: any) {
      return { success: false, error: `Connection Failed: ${e.message}` };
    }
  },

  // Deep link helper (unchanged)
  getDeepLink: (phone: string, text: string): string => {
    const cleaned = formatPhoneNumber(phone);
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${cleaned}?text=${encodedText}`;
  },

  // Legacy methods for backwards compatibility
  // These will be deprecated in favor of backend API

  getConfig: (): { provider: WhatsAppProvider; bridgeUrl?: string } | null => {
    // For now, return a default config
    // Will be replaced by backend settings API
    return {
      provider: 'venom',
      bridgeUrl: localStorage.getItem('shepherd_bridge_url') || 'http://localhost:3001'
    };
  },

  sendViaVenom: async (phone: string, text: string, config: any, whatsappId?: string) => {
    // Deprecated - use sendMessage() instead
    return whatsappService.sendMessage(phone, text, whatsappId);
  },

  sendViaMeta: async (phone: string, text: string, config: any) => {
    // Deprecated - use sendMessage() instead
    return whatsappService.sendMessage(phone, text);
  },

  // Scheduling methods - TODO: implement backend endpoints
  scheduleMessage: async (phone: string, text: string, scheduledFor: string): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    // TODO: Implement backend scheduling API
    return { success: false, error: 'Scheduling not yet implemented in backend' };
  },

  getScheduledMessages: async (): Promise<{ success: boolean; messages?: any[]; error?: string }> => {
    return { success: false, error: 'Not implemented' };
  },

  cancelScheduledMessage: async (jobId: string): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Not implemented' };
  }
};
