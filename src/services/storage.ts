import { Contact, KnowledgeResource, MessageLog } from '../types';
import { BACKEND_URL } from './env';

// Get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

//  BACKWARDS COMPATIBLE - Keep synchronous methods for now
// These return cached data and trigger async refresh in background

export const storage = {
  // =================== SYNCHRONOUS (BACKWARDS COMPATIBLE) ===================

  // These work immediately for backward compatibility
  // But also trigger background refresh from backend

  getContacts: (): Contact[] => {
    // Return cached data immediately
    try {
      const cached = localStorage.getItem('shepherd_contacts_cache');
      if (cached) return JSON.parse(cached);
    } catch { }

    // Trigger background refresh
    storage.refreshContacts();
    return [];
  },

  getResources: (): KnowledgeResource[] => {
    try {
      const cached = localStorage.getItem('shepherd_resources_cache');
      if (cached) return JSON.parse(cached);
    } catch { }

    storage.refreshResources();
    return [];
  },

  getLogs: (): MessageLog[] => {
    try {
      const cached = localStorage.getItem('shepherd_logs_cache');
      if (cached) return JSON.parse(cached);
    } catch { }

    storage.refreshLogs();
    return [];
  },

  // =================== ASYNC (NEW BACKEND API) ===================

  refreshContacts: async (): Promise<Contact[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await fetch(`${BACKEND_URL}/api/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          return [];
        }
        throw new Error(`HTTP ${response.status} `);
      }

      const backendContacts = await response.json();

      // Transform backend snake_case to frontend camelCase
      const contacts = backendContacts.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        category: c.category,
        joinDate: c.join_date || c.joinDate, // Map join_date -> joinDate
        notes: c.notes,
        status: c.status,
        lastContacted: c.last_contacted || c.lastContacted,
        whatsappId: c.whatsapp_id || c.whatsappId
      }));

      // Cache for synchronous access
      localStorage.setItem('shepherd_contacts_cache', JSON.stringify(contacts));
      return contacts;
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  },

  saveContact: async (contact: Contact): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) {
      console.error('Not authenticated');
      return false;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          category: contact.category,
          join_date: contact.joinDate,
          notes: contact.notes,
          status: contact.status || 'Active'
          // whatsapp_id removed - backend doesn't support it yet
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save contact');
      }

      // Refresh cache
      await storage.refreshContacts();
      return true;
    } catch (error) {
      console.error('Error saving contact:', error);
      return false;
    }
  },

  updateContact: async (contact: Contact): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${BACKEND_URL}/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          category: contact.category,
          notes: contact.notes,
          status: contact.status
          // whatsapp_id removed - backend doesn't support it yet
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      await storage.refreshContacts();
      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      return false;
    }
  },

  deleteContact: async (contactId: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${BACKEND_URL}/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      await storage.refreshContacts();
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  },

  // =================== KNOWLEDGE BASE ===================

  refreshResources: async (): Promise<KnowledgeResource[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await fetch(`${BACKEND_URL}/api/knowledge`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return [];

      const resources = await response.json();
      localStorage.setItem('shepherd_resources_cache', JSON.stringify(resources));
      return resources;
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      return [];
    }
  },

  saveResource: async (resource: KnowledgeResource): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${BACKEND_URL}/api/knowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: resource.title,
          type: resource.type,
          content: resource.content,
          file_name: resource.fileName
        })
      });

      if (!response.ok) return false;

      await storage.refreshResources();
      return true;
    } catch (error) {
      console.error('Error saving resource:', error);
      return false;
    }
  },

  deleteResource: async (resourceId: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${BACKEND_URL}/api/knowledge/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return false;

      await storage.refreshResources();
      return true;
    } catch (error) {
      console.error('Error deleting resource:', error);
      return false;
    }
  },

  // =================== MESSAGE LOGS ===================

  refreshLogs: async (): Promise<MessageLog[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await fetch(`${BACKEND_URL}/api/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return [];

      const backendMessages = await response.json();

      // Transform backend snake_case to frontend camelCase
      const messages = backendMessages.map((m: any) => ({
        id: m.id,
        contactId: m.contact_id || m.contactId,
        content: m.content,
        timestamp: m.created_at || m.timestamp,
        scheduledFor: m.scheduled_for || m.scheduledFor,
        status: m.status,
        type: m.type,
        attachment: m.attachment_url ? {
          type: m.attachment_type?.includes('image') ? 'image' : 'file',
          url: m.attachment_url,
          name: 'attachment'
        } : undefined
      }));

      localStorage.setItem('shepherd_logs_cache', JSON.stringify(messages));
      return messages;
    } catch (error) {
      console.error('Error loading message logs:', error);
      return [];
    }
  },

  // =================== BACKUP/RESTORE ===================

  createBackup: () => {
    const contacts = storage.getContacts();
    const resources = storage.getResources();
    const logs = storage.getLogs();

    return {
      version: 2,
      timestamp: new Date().toISOString(),
      contacts,
      resources,
      logs,
      settings: {
        aiName: 'Shepherd AI',
        organizationName: 'My Organization'
      }
    };
  },

  downloadBackup: () => {
    const backup = storage.createBackup();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `shepherd_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },

  restoreBackup: async (file: File): Promise<boolean> => {
    throw new Error('Backup restore via backend API not yet implemented');
  },

  factoryReset: () => {
    localStorage.clear();
    window.location.reload();
  },

  getWorkflowSteps: async (): Promise<any[]> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    const response = await fetch(`${BACKEND_URL}/api/workflows/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch workflow steps');
    return response.json();
  },

  uploadWorkflowExcel: async (category: string, formData: FormData, replaceExisting: boolean = false): Promise<any> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    const response = await fetch(`${BACKEND_URL}/api/workflows/upload-excel?category=${encodeURIComponent(category)}&replace_existing=${replaceExisting}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  },

  deleteWorkflowCategory: async (category: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    const steps = await storage.getWorkflowSteps();
    const categorySteps = steps.filter((s: any) => s.category === category);
    for (const step of categorySteps) {
      const response = await fetch(`${BACKEND_URL}/api/workflows/${step.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete workflow step');
    }
  }
};
