import { GoogleGenAI } from "@google/genai";
import { Contact, KnowledgeResource, AIConfig } from '../types';

// Helper to get configuration
const getAIConfig = (): AIConfig => {
    const configStr = localStorage.getItem('shepherd_ai_config');
    if (configStr) return JSON.parse(configStr);

    // Fallback for legacy data
    const legacyKey = localStorage.getItem('shepherd_google_api_key');
    return {
        provider: 'gemini',
        apiKey: legacyKey || process.env.API_KEY || '',
        model: 'gemini-2.5-flash'
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
    // Ensure no trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
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

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`AI Provider Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
};

export const generateMessage = async (
  contact: Contact,
  promptContext: string,
  knowledgeBase: KnowledgeResource[],
  aiName: string = "Shepherd AI",
  organizationName: string = "Our Church"
): Promise<string> => {
  const config = getAIConfig();

  if (!config.apiKey) {
      console.warn("No API Key found. Please configure it in Settings.");
      return "Please configure your AI Provider API Key in Settings.";
  }

  // Prepare knowledge base context
  const kbContext = knowledgeBase
    .map(k => `[Resource: ${k.title} (${k.type})]: ${k.content.substring(0, 500)}...`)
    .join('\n\n');

  const systemPrompt = `
    You are a compassionate, spiritual, and professional church follow-up assistant named "${aiName}", representing "${organizationName}". 
    Your goal is to draft a WhatsApp message for a person based on their spiritual journey.
    
    Target Audience: ${contact.category}
    Contact Name: ${contact.name}
    Tone: Warm, loving, encouraging, Christ-centered, and culturally appropriate (modern but respectful).
    
    Knowledge Base Context (Use this to answer questions or provide encouragement if relevant):
    ${kbContext}
    
    Task: Write a single WhatsApp message.
    - Keep it concise (under 100 words usually, unless it's a detailed devotional).
    - Use emojis sparingly but effectively.
    - Do not sound robotic. Sound like a caring pastor or church leader.
    - If the user is a New Convert, emphasize salvation assurance and welcome to ${organizationName}.
    - If First Timer, thank them for visiting ${organizationName}.
    - If Born Again, focus on discipleship and growth.
    - Sign off as "${aiName}" or simply "Your friends at ${organizationName}" if appropriate.
  `;

  const userPrompt = `
    Generate a follow-up message for ${contact.name}.
    Context/Goal of this message: ${promptContext}.
  `;

  try {
    // Switch logic based on provider
    if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
          model: config.model || 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
          ]
        });
        return response.text || "Could not generate message.";
    } else {
        // OpenAI, DeepSeek, Groq, Custom
        return await callOpenAICompatible(config, systemPrompt, userPrompt);
    }
  } catch (error: any) {
    console.error("Generation Error:", error);
    return `Error generating message: ${error.message || "Unknown error"}`;
  }
};