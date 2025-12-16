
export enum ContactCategory {
  NEW_CONVERT = 'New Convert',
  FIRST_TIMER = 'First Timer',
  BORN_AGAIN = 'Born Again'
}

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
  passwordHash: string; // In a real app, never store plain text. We will simulate hashing.
  churchName: string;
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
}
