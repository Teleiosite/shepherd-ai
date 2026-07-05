
export enum ContactCategory {
  NEW_CONVERT = 'New Convert',
  FIRST_TIMER = 'First Timer',
  BORN_AGAIN = 'Born Again'
}

// Default categories — users can customize these in Settings for any business type
export const DEFAULT_CATEGORIES = [
  ContactCategory.NEW_CONVERT,
  ContactCategory.FIRST_TIMER,
  ContactCategory.BORN_AGAIN
];

export enum MessageStatus {
  PENDING = 'Pending',
  GENERATED = 'Generated',
  SCHEDULED = 'Scheduled',
  SENT = 'Sent',
  RESPONDED = 'Responded',
  FAILED = 'Failed'
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  organizationName?: string; // Generic: works for any business type
}

export interface AIConfig {
  provider: 'gemini' | 'openai' | 'deepseek' | 'groq' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string; 
  isActive: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  category: string; // Changed from Enum to string
  joinDate: string;
  notes: string;
  lastContacted?: string;
  status: 'Active' | 'Archived';
  whatsappId?: string; // WhatsApp internal ID (@lid format) for replies
}


export interface KnowledgeResource {
  id: string;
  title: string;
  type: 'Book' | 'Sermon' | 'Devotional';
  content: string; 
  uploadDate: string;
  fileName?: string;
}

export interface CampaignTemplate {
  id: string;
  category: string;
  name: string;
  daysOffset: number; 
  description: string;
}

export interface WorkflowStep {
  day: number;
  title: string;
  prompt: string;
}

export interface MessageAttachment {
  type: 'image' | 'file';
  url: string; 
  name: string;
}

export interface MessageLog {
  id: string;
  contactId: string;
  content: string;
  timestamp: string; 
  scheduledFor?: string; 
  status: MessageStatus;
  type: 'Outbound' | 'Inbound';
  attachment?: MessageAttachment;
  error?: string;
}

// ===== AI AGENT TYPES =====

export type AgentActionType =
  | 'SEND_DOCUMENT'
  | 'SEND_IMAGE'
  | 'CREATE_BOOKING'
  | 'SEND_PAYMENT_LINK'
  | 'WEB_SEARCH'
  | 'FLAG_FOR_HUMAN'
  | 'COLLECT_INFO'
  | 'NONE';

export interface AgentAction {
  type: AgentActionType;
  documentName?: string;  // for SEND_DOCUMENT
  imageName?: string;     // for SEND_IMAGE
  purpose?: string;       // for CREATE_BOOKING / SEND_PAYMENT_LINK
  preferredDate?: string; // for CREATE_BOOKING
  notes?: string;         // for CREATE_BOOKING
  query?: string;         // for WEB_SEARCH
  reason?: string;        // for FLAG_FOR_HUMAN
  field?: string;         // for COLLECT_INFO
  question?: string;      // for COLLECT_INFO
}

export interface AgentResult {
  reply: string;
  action?: AgentAction;
}

export interface AgentSuggestion {
  contactId: string;
  reply: string;
  action?: AgentAction;
  generatedAt: string;
}

// ===== MEDIA LIBRARY =====

export interface MediaFile {
  id: string;
  name: string;           // Descriptive name: "Welcome Package", "Menu PDF", "Church Map"
  type: 'document' | 'image' | 'video';
  mimeType: string;       // e.g. "application/pdf", "image/jpeg"
  url: string;            // base64 data URL or remote URL
  fileName: string;       // Original file name
  uploadDate: string;
  description?: string;
}

// ===== BOOKING SYSTEM =====

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  purpose: string;        // e.g. "Sunday Service", "Consultation", "Appointment", "Product Order"
  date?: string;          // ISO date (YYYY-MM-DD)
  time?: string;          // HH:MM
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
}
