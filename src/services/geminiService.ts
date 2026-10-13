import { GoogleGenAI } from "@google/genai";
import { Contact, KnowledgeResource, AIConfig } from '../types';

// Helper to get configuration
const getAIConfig = (): AIConfig => {
  let groqApiKey = localStorage.getItem('shepherd_groq_api_key') || '';
  let googleApiKey = localStorage.getItem('shepherd_google_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  let provider = 'gemini';
  let model = 'gemini-3.7-flash';
  let baseUrl = '';

  const configStr = localStorage.getItem('shepherd_ai_config');
  if (configStr) {
    try {
      const parsed = JSON.parse(configStr);
      if (parsed.groqApiKey && !parsed.groqApiKey.startsWith('***')) {
        groqApiKey = parsed.groqApiKey;
      }
      if (parsed.apiKey && !parsed.apiKey.startsWith('***')) {
        googleApiKey = parsed.apiKey;
      }
      if (parsed.provider) provider = parsed.provider;
      if (parsed.model) model = parsed.model;
      if (parsed.baseUrl) baseUrl = parsed.baseUrl;
    } catch {}
  }

  return {
    provider: (provider || 'gemini') as any,
    apiKey: googleApiKey,
    groqApiKey: groqApiKey,
    model: model,
    baseUrl: baseUrl
  };
};

// Generic OpenAI Compatible Caller (Works for OpenAI, DeepSeek, Groq, etc.)
const callOpenAICompatible = async (
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  let baseUrl = config.baseUrl;

  // Set defaults if custom URL is not provided for known providers
  if (!baseUrl) {
    if (config.provider === 'openai') baseUrl = 'https://api.openai.com/v1';
    if (config.provider === 'deepseek') baseUrl = 'https://api.deepseek.com';
    if (config.provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
  }

  if (!baseUrl) throw new Error("Base URL is missing for the selected provider.");
  baseUrl = baseUrl.replace(/\/$/, '');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`AI Provider Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    throw fetchErr;
  }
};

export const generateMessage = async (
  contact: Contact,
  promptContext: string,
  knowledgeBase: KnowledgeResource[],
  aiName: string = "Shepherd AI",
  organizationName: string = "Our Organization"
): Promise<string> => {
  const config = getAIConfig();

  if (!config.apiKey) {
    console.warn("No API Key found. Please configure it in Settings.");
    return "Please configure your AI Provider API Key in Settings.";
  }

  const businessType = localStorage.getItem('shepherd_business_type') || 'Business';
  const isFaithBased = businessType.toLowerCase().includes('church') || businessType.toLowerCase().includes('ministry');

  // Prepare knowledge base context
  const kbContext = knowledgeBase
    .map(k => `[Resource: ${k.title} (${k.type})]: ${k.content.substring(0, 500)}...`)
    .join('\n\n');

  const systemPrompt = isFaithBased
    ? `
    You are a compassionate, spiritual, and professional follow-up assistant named "${aiName}", representing "${organizationName}". 
    Your goal is to draft a personalized WhatsApp message for a contact based on their journey.
    
    Target Audience Category: ${contact.category}
    Contact Name: ${contact.name}
    Tone: Warm, loving, encouraging, Christ-centered, and culturally appropriate.
    
    Knowledge Base Context:
    ${kbContext}
    
    Task: Write a single WhatsApp message.
    - Keep it concise (under 100 words usually).
    - Use emojis sparingly but warmly.
    - Do not sound robotic. Sound like a caring leader at ${organizationName}.
    - Sign off as "${aiName}" or "Your friends at ${organizationName}".
  `
    : `
    You are an intelligent, courteous, and high-converting customer relationship assistant named "${aiName}", representing "${organizationName}" (${businessType}).
    Your goal is to draft a helpful, professional, and personalized WhatsApp message for a client/lead.

    Target Audience Category: ${contact.category}
    Contact Name: ${contact.name}
    Tone: Polite, helpful, professional, modern, and engaging.

    Knowledge Base Context:
    ${kbContext}

    Task: Write a single WhatsApp message.
    - Keep it concise, friendly, and actionable (under 100 words).
    - Use emojis sparingly.
    - Focus on addressing their inquiry, offering assistance, or confirming next steps for ${organizationName}.
    - Sign off as "${aiName}" or "${organizationName} Support".
  `;

  const userPrompt = `
    Generate a follow-up message for ${contact.name}.
    Context/Goal of this message: ${promptContext}.
  `;

  // Tier 1: Try Groq primary first if available (~0.3s ultra-fast generation)
  const effectiveGroqKey = config.groqApiKey || 
    (config.apiKey?.startsWith('gsk_') ? config.apiKey : '') || 
    (config.provider === 'groq' ? config.apiKey : '') || 
    localStorage.getItem('shepherd_groq_api_key') || 
    ((import.meta as any).env?.VITE_GROQ_API_KEY || '');

  if (effectiveGroqKey && !effectiveGroqKey.startsWith('***') && effectiveGroqKey.length > 20) {
    try {
      const groqConfig: AIConfig = {
        provider: 'groq',
        apiKey: effectiveGroqKey,
        model: 'llama-3.1-8b-instant',
        baseUrl: 'https://api.groq.com/openai/v1'
      };
      const groqReply = await callOpenAICompatible(groqConfig, systemPrompt, userPrompt);
      if (groqReply && groqReply.length > 5) return groqReply;
    } catch (gErr) {
      console.warn('[GeminiService] Groq fast attempt failed, switching immediately to Gemini:', gErr);
    }
  }

  const effectiveGeminiKey = (config.provider === 'gemini' ? config.apiKey : '') || 
    (config.apiKey?.startsWith('AIzaSy') ? config.apiKey : '') || 
    localStorage.getItem('shepherd_google_api_key') || 
    ((import.meta as any).env?.VITE_GEMINI_API_KEY || '');

  try {
    // Switch logic based on provider (Tier 2 Fallback)
    if (config.provider === 'gemini' || effectiveGeminiKey) {
      const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey || config.apiKey });
      const rawModel = config.model || 'gemini-3.7-flash';
      const actualModel = (rawModel.includes('3.7') || rawModel.includes('3.8') || rawModel.includes('3.5'))
        ? 'gemini-2.0-flash'
        : rawModel;
      const modelsToTry = [actualModel, 'gemini-1.5-flash'];
      const uniqueModels = Array.from(new Set(modelsToTry));

      for (const m of uniqueModels) {
        try {
          const geminiPromise = ai.models.generateContent({
            model: m,
            contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }]
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Gemini ${m} timeout`)), 3500)
          );
          const response = await Promise.race([geminiPromise, timeoutPromise]);
          if (response?.text) return response.text;
        } catch (err) {
          console.warn(`[GeminiService] Gemini model ${m} attempt failed:`, err);
        }
      }
      return "Could not generate message.";
    } else {
      // OpenAI, DeepSeek, Groq, Custom
      return await callOpenAICompatible(config, systemPrompt, userPrompt);
    }
  } catch (error: any) {
    console.error("Generation Error:", error);
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      return `⏳ The AI service is temporarily busy. Please try again in a few minutes.`;
    }
    return `Error generating message: ${error.message || "Unknown error"}`;
  }
};