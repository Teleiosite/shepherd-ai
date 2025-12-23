
import { User } from '../types';

// Use environment variable with fallback
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
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
          churchName: 'My Organization'  // Backend creates organization automatically
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
          churchName: data.user.organization_name || 'My Organization'
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
        churchName: data.organization_name || 'My Organization'
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
