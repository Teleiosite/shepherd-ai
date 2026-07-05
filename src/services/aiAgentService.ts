/**
 * AI Agent Service
 * ================
 * The core brain of Shepherd AI's auto-reply system.
 * Works for ANY business type (church, restaurant, salon, clinic, etc.)
 *
 * When a contact sends a WhatsApp message, this service:
 * 1. Builds a business-specific system prompt
 * 2. Injects Knowledge Base context (RAG)
 * 3. Injects conversation history
 * 4. Calls the configured AI provider (Gemini, OpenAI, etc.)
 * 5. Parses the structured response for: reply text + optional action
 */

import { Contact, KnowledgeResource, MessageLog, AgentResult, AgentAction, MediaFile, AIConfig } from '../types';

const getAIConfig = (): AIConfig => {
  const configStr = localStorage.getItem('shepherd_ai_config');
  if (configStr) return JSON.parse(configStr);
  const legacyKey = localStorage.getItem('shepherd_google_api_key');
  return { provider: 'gemini', apiKey: legacyKey || '', model: 'gemini-2.5-flash' };
};

export const getAgentSettings = () => {
  return {
    enabled: localStorage.getItem('shepherd_agent_enabled') === 'true',
    mode: (localStorage.getItem('shepherd_agent_mode') || 'suggest') as 'suggest' | 'auto-send',
    replyDelay: parseInt(localStorage.getItem('shepherd_agent_delay') || '5', 10),
    businessType: localStorage.getItem('shepherd_business_type') || 'Organization',
    toneDescription: localStorage.getItem('shepherd_agent_tone') || 'Warm, professional, and helpful',
    paymentLinkUrl: localStorage.getItem('shepherd_payment_link') || '',
  };
};

const buildSystemPrompt = (
  contact: Contact,
  history: MessageLog[],
  knowledgeBase: KnowledgeResource[],
  mediaFiles: MediaFile[],
  aiName: string,
  organizationName: string,
  businessType: string,
  toneDescription: string,
  paymentLinkUrl: string,
): string => {
  const daysSinceJoin = Math.floor(
    (Date.now() - new Date(contact.joinDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const kbContext = knowledgeBase.length > 0
    ? knowledgeBase.map(k => `--- ${k.title} ---\n${k.content.substring(0, 600)}`).join('\n\n')
    : 'No knowledge base content configured yet.';

  const historyText = history.length > 0
    ? history.slice(-10).map(m => `${m.type === 'Outbound' ? aiName : contact.name}: ${m.content}`).join('\n')
    : 'No previous messages.';

  const availableFiles = mediaFiles.length > 0
    ? mediaFiles.map(f => `"${f.name}" (${f.type})`).join(', ')
    : 'None uploaded yet.';

  const paymentSection = paymentLinkUrl
    ? `Payment/Purchase Link: ${paymentLinkUrl}`
    : 'Payment link: Not configured.';

  return `You are ${aiName}, the AI assistant for ${organizationName} (${businessType}).

CONTACT INFO:
- Name: ${contact.name}
- Segment/Category: ${contact.category}
- Customer since: ${contact.joinDate} (${daysSinceJoin} days ago)
- Phone: ${contact.phone}
${contact.notes ? `- Notes: ${contact.notes}` : ''}

YOUR TONE & STYLE: ${toneDescription}
CRITICAL: Sound like a real human representative, never robotic. Never admit you are AI unless directly and explicitly asked. Keep messages concise and WhatsApp-appropriate.

KNOWLEDGE BASE (use this to answer questions):
${kbContext}

FILES YOU CAN SEND (use exact names):
${availableFiles}

${paymentSection}

CONVERSATION HISTORY:
${historyText}

RESPONSE FORMAT — return ONLY valid JSON:
{
  "reply": "Your WhatsApp message text",
  "action": {
    "type": "NONE",
    "documentName": "",
    "imageName": "",
    "purpose": "",
    "preferredDate": "",
    "query": "",
    "reason": "",
    "question": ""
  }
}

ACTION SELECTION GUIDE:
- NONE → standard text reply (most common)
- SEND_DOCUMENT → contact asks for a file, form, PDF, manual, menu, brochure
- SEND_IMAGE → contact asks to see a photo, image, location map, product image
- CREATE_BOOKING → contact wants to book, schedule, register, reserve, make appointment
- SEND_PAYMENT_LINK → contact asks about price, payment, how to pay, fees, purchase
- WEB_SEARCH → contact asks something time-sensitive or factual not in your knowledge base
- FLAG_FOR_HUMAN → contact is upset, in crisis, making complaints, or needs urgent personal help
- COLLECT_INFO → you need more details from contact to proceed

Return ONLY the JSON object. No markdown code blocks, no extra text.`;
};

const callAI = async (systemPrompt: string, userTurn: string): Promise<string> => {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error('No AI API key configured. Please set up your AI provider in Settings.');

  if (config.provider === 'gemini') {
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await genai.models.generateContent({
      model: config.model || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userTurn}` }] }],
      config: { temperature: 0.75 }
    });
    return response.text || '';
  }

  // OpenAI-compatible providers
  let baseUrl = config.baseUrl;
  if (!baseUrl) {
    if (config.provider === 'openai') baseUrl = 'https://api.openai.com/v1';
    else if (config.provider === 'deepseek') baseUrl = 'https://api.deepseek.com';
    else if (config.provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
  }
  if (!baseUrl) throw new Error('No base URL configured for AI provider.');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userTurn }
      ],
      temperature: 0.75,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) throw new Error(`AI Provider error: ${res.statusText}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '{}';
};

const parseAgentResponse = (rawText: string, fallback: string): AgentResult => {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');
    const parsed = JSON.parse(jsonMatch[0]);
    const action: AgentAction = parsed.action || { type: 'NONE' };
    return {
      reply: parsed.reply || fallback,
      action: (!action.type || action.type === 'NONE') ? undefined : action,
    };
  } catch {
    // If JSON parse fails, use raw text as reply
    const cleanText = rawText.replace(/```json?|```/g, '').trim();
    return { reply: cleanText || fallback };
  }
};

export const searchWeb = async (query: string): Promise<string> => {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');
    const res = await fetch(
      `${backendUrl}/api/browse?q=${encodeURIComponent(query)}`,
      { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
    );
    if (!res.ok) return '';
    const data = await res.json();
    return data.summary || data.content || '';
  } catch {
    return '';
  }
};

/**
 * MAIN ENTRY POINT
 * Generate an AI agent reply for an incoming WhatsApp message.
 */
export const generateAgentReply = async (
  contact: Contact,
  incomingMessage: string,
  conversationHistory: MessageLog[],
  knowledgeBase: KnowledgeResource[],
  mediaFiles: MediaFile[],
  aiName: string,
  organizationName: string
): Promise<AgentResult> => {
  const { businessType, toneDescription, paymentLinkUrl } = getAgentSettings();

  const systemPrompt = buildSystemPrompt(
    contact, conversationHistory, knowledgeBase, mediaFiles,
    aiName, organizationName, businessType, toneDescription, paymentLinkUrl
  );

  const userTurn = `New incoming message from ${contact.name}:\n"${incomingMessage}"\n\nRespond in JSON format.`;

  try {
    let rawResponse = await callAI(systemPrompt, userTurn);
    let result = parseAgentResponse(rawResponse, '');

    // If AI wants a web search, perform it and re-run
    if (result.action?.type === 'WEB_SEARCH' && result.action.query) {
      const webContent = await searchWeb(result.action.query);
      if (webContent) {
        const enhancedTurn = `${userTurn}\n\nWEB SEARCH RESULT for "${result.action.query}":\n${webContent}\n\nNow generate the final reply using this information.`;
        const enhanced = await callAI(systemPrompt, enhancedTurn);
        result = parseAgentResponse(enhanced, result.reply);
        result.action = undefined; // Action consumed by web search
      }
    }

    return result;
  } catch (err) {
    console.error('[AIAgent] Error:', err);
    return { reply: '' };
  }
};
