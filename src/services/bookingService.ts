/**
 * Booking Service
 * ===============
 * Manages appointments and bookings created by the AI agent or manually.
 * Works for any business: salons, clinics, churches, restaurants, etc.
 *
 * Storage: localStorage (frontend) + backend API sync when available.
 */

import { Booking, BookingStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'shepherd_bookings';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

// ===== LOCAL STORAGE HELPERS =====

const loadFromStorage = (): Booking[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (bookings: Booking[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    console.error('[BookingService] Failed to save to localStorage');
  }
};

// ===== CRUD OPERATIONS =====

export const getBookings = (): Booking[] => {
  return loadFromStorage().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getBookingsByStatus = (status: BookingStatus): Booking[] => {
  return getBookings().filter(b => b.status === status);
};

export const getBookingsForContact = (contactId: string): Booking[] => {
  return getBookings().filter(b => b.contactId === contactId);
};

export const getTodayBookings = (): Booking[] => {
  const today = new Date().toISOString().split('T')[0];
  return getBookings().filter(b => b.date === today);
};

export const createBooking = (data: {
  contactId: string;
  contactName: string;
  contactPhone: string;
  purpose: string;
  date?: string;
  time?: string;
  notes?: string;
}): Booking => {
  const booking: Booking = {
    id: uuidv4(),
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const bookings = loadFromStorage();
  bookings.unshift(booking);
  saveToStorage(bookings);

  // Also try to sync to backend (non-blocking)
  syncToBackend(booking).catch(err => console.warn('[BookingService] Backend sync failed:', err));

  return booking;
};

export const updateBookingStatus = (bookingId: string, status: BookingStatus): Booking | null => {
  const bookings = loadFromStorage();
  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx === -1) return null;

  bookings[idx] = {
    ...bookings[idx],
    status,
    confirmedAt: status === 'confirmed' ? new Date().toISOString() : bookings[idx].confirmedAt
  };
  saveToStorage(bookings);
  return bookings[idx];
};

export const deleteBooking = (bookingId: string): void => {
  const bookings = loadFromStorage().filter(b => b.id !== bookingId);
  saveToStorage(bookings);
};

// ===== BACKEND SYNC =====

const syncToBackend = async (booking: Booking): Promise<void> => {
  try {
    await fetch(`${BACKEND_URL}/api/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(booking)
    });
  } catch {
    // Silent fail — local storage is the source of truth for now
  }
};

export const refreshFromBackend = async (): Promise<Booking[]> => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/bookings`, { headers: getAuthHeaders() });
    if (!res.ok) return getBookings();
    const data = await res.json();
    const backendBookings: Booking[] = data.bookings || data || [];
    // Merge: backend is authoritative for confirmed/cancelled statuses
    const local = loadFromStorage();
    const localIds = new Set(local.map(b => b.id));
    const merged = [...local];
    backendBookings.forEach(b => {
      if (!localIds.has(b.id)) merged.push(b);
    });
    saveToStorage(merged);
    return merged;
  } catch {
    return getBookings();
  }
};

/**
 * Format a booking confirmation message to send to the contact via WhatsApp.
 */
export const formatConfirmationMessage = (booking: Booking, organizationName: string): string => {
  const dateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'date to be confirmed';
  const timeStr = booking.time ? ` at ${booking.time}` : '';
  return `✅ Booking Confirmed!\n\nHi ${booking.contactName}, your booking with ${organizationName} has been confirmed:\n\n📌 Purpose: ${booking.purpose}\n📅 Date: ${dateStr}${timeStr}\n🔖 Reference: ${booking.id.slice(0, 8).toUpperCase()}\n\nWe look forward to seeing you! Reply here if you need to reschedule.`;
};
