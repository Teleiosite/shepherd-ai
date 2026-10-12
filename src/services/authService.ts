
import { User } from '../types';
import { BACKEND_URL } from './env';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

export const authService = {
  // Register a new user via backend API
  register: async (name: string, email: string, password: string, churchName: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: name || churchName  // Use name, fallback to church name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.detail || 'Registration failed' };
      }

      // Store auth token
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);

      // Store user info from response
      if (data.user) {
        const userInfo: User = {
          id: data.user.id,
          name: data.user.full_name,
          email: data.user.email,
          passwordHash: '',
          organizationName: 'My Organization'  // Backend creates organization automatically
        };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  // Login existing user via backend API
  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.detail || 'Login failed' };
      }

      // Store auth token
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);

      // Store user info from response
      if (data.user) {
        const userInfo: User = {
          id: data.user.id,
          name: data.user.full_name,
          email: data.user.email,
          passwordHash: '',
          organizationName: data.user.organization_name || 'My Organization'
        };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
        return { success: true, user: userInfo };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  // Get current user from backend
  getCurrentUser: async (): Promise<User | null> => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    // Special bypass for demo guest tokens
    if (token === 'demo-guest-jwt-token-evaluator' || token.startsWith('demo-')) {
      return authService.getCurrentUserSync();
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        // Token invalid, clear it
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        return null;
      }

      const data = await response.json();

      // Map backend user to frontend User type
      const user: User = {
        id: data.id,
        name: data.full_name,
        email: data.email,
        passwordHash: '', // Not needed
        organizationName: data.organization_name || 'My Organization'
      };

      return user;
    } catch (error) {
      return null;
    }
  },

  // Get current user from cache (synchronous)
  getCurrentUserSync: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  //Get auth token
  getToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },

  // Demo Guest Login for Evaluators & Reviewers
  loginAsDemoGuest: (): User => {
    const demoUser: User = {
      id: 'demo-evaluator-001',
      name: 'NAISH Evaluator (Demo)',
      email: 'evaluator@naish-demo.gov.ng',
      passwordHash: '',
      organizationName: 'Teachers Registration Council of Nigeria (TRCN)'
    };
    localStorage.setItem(AUTH_TOKEN_KEY, 'demo-guest-jwt-token-evaluator');
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(demoUser));
    localStorage.setItem('shepherd_org_name', 'Teachers Registration Council of Nigeria (TRCN)');
    localStorage.setItem('shepherd_business_type', 'Public Sector & Teacher Licensing');
    localStorage.setItem('shepherd_user_plan', 'enterprise');

    // Seed mock TRCN demo contacts if none exist in cache
    const existingContacts = localStorage.getItem('shepherd_contacts_cache');
    if (!existingContacts || existingContacts === '[]') {
      const demoContacts = [
        {
          id: 'demo-c1',
          name: 'Ahmed Bello (Primary School Educator)',
          phone: '+2348031234567',
          email: 'ahmed.bello@schools.gov.ng',
          category: 'Triennial Renewal Due',
          joinDate: '2023-04-12T10:00:00.000Z',
          notes: 'Licence expired March 2026. Needs MCPD verification link.',
          status: 'Active'
        },
        {
          id: 'demo-c2',
          name: 'Ngozi Okonkwo (Secondary School Teacher)',
          phone: '+2348059876543',
          email: 'ngozi.o@education.gov.ng',
          category: 'Remote Enrolment',
          joinDate: '2024-01-15T09:30:00.000Z',
          notes: 'Enquiring on licence renewal via WhatsApp from rural LGA.',
          status: 'Active'
        },
        {
          id: 'demo-c3',
          name: 'Babajide Adeleke (College of Education)',
          phone: '+2348074455667',
          email: 'b.adeleke@fce.edu.ng',
          category: 'Active Licenced',
          joinDate: '2024-08-20T14:15:00.000Z',
          notes: 'Completed MCPD 15 credits. Paid via Remita.',
          status: 'Active'
        }
      ];
      localStorage.setItem('shepherd_contacts_cache', JSON.stringify(demoContacts));
    }

    return demoUser;
  },

  // Logout
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.reload();
  },

  // Password Recovery (backend endpoint to be implemented)
  recoverPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.detail || 'Recovery request failed' };
      }

      return { success: true, message: data.message || 'Recovery email sent' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  }
};
