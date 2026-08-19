import React, { useState } from 'react';
import { Bot, UserCheck, AlertTriangle, CheckCircle, Clock, ShieldAlert, ChevronDown } from 'lucide-react';
import { BACKEND_URL } from '../services/env';

interface ChatStatusBarProps {
  contactId: string;
  contactName: string;
  conversationStatus?: string; // 'open', 'escalated', 'resolved'
  aiPaused?: boolean;
  aiPausedUntil?: string;
  onStatusChange?: (newStatus: string) => void;
  onAiPauseToggle?: (isPaused: boolean) => void;
}

export const ChatStatusBar: React.FC<ChatStatusBarProps> = ({
  contactId,
  contactName,
  conversationStatus = 'open',
  aiPaused = false,
  aiPausedUntil,
  onStatusChange,
  onAiPauseToggle
}) => {
  const [currentStatus, setCurrentStatus] = useState(conversationStatus);
  const [isAiPaused, setIsAiPaused] = useState(aiPaused);
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setLoading(true);
      setCurrentStatus(newStatus);
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${BACKEND_URL}/api/conversations/${contactId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        });
      }
      if (onStatusChange) onStatusChange(newStatus);
    } catch (e) {
      console.error('Failed to update conversation status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAiToggle = async (pause: boolean) => {
    try {
      setLoading(true);
      setIsAiPaused(pause);
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${BACKEND_URL}/api/conversations/${contactId}/pause-ai`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ paused: pause, duration_minutes: 120 })
        });
      }
      if (onAiPauseToggle) onAiPauseToggle(pause);
    } catch (e) {
      console.error('Failed to toggle AI pause:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
      {/* AI Autopilot Control */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-medium flex items-center gap-1">
          <Bot size={14} className={isAiPaused ? "text-amber-500" : "text-teal-600"} />
          AI Auto-Reply:
        </span>
        {isAiPaused ? (
          <button
            onClick={() => handleAiToggle(false)}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-medium hover:bg-amber-200 transition-colors"
            title="AI is paused for this contact. Click to resume."
          >
            <Clock size={12} />
            <span>Paused (Human Handover)</span>
            <span className="underline ml-1">Resume</span>
          </button>
        ) : (
          <button
            onClick={() => handleAiToggle(true)}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-300 font-medium hover:bg-teal-200 transition-colors"
            title="AI is responding autonomously. Click to pause for 2 hours while you chat."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Active</span>
            <span className="text-[10px] text-teal-700 bg-white/70 px-1 rounded ml-1">Take over</span>
          </button>
        )}
      </div>

      {/* Conversation Triage Status */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500">Status:</span>
        <select
          value={currentStatus}
          onChange={(e) => handleStatusUpdate(e.target.value)}
          disabled={loading}
          className={`px-2 py-0.5 rounded text-xs font-semibold border focus:outline-none transition-colors ${
            currentStatus === 'escalated'
              ? 'bg-red-50 text-red-700 border-red-300'
              : currentStatus === 'resolved'
              ? 'bg-slate-100 text-slate-600 border-slate-300'
              : 'bg-green-50 text-green-700 border-green-300'
          }`}
        >
          <option value="open">🟢 Open</option>
          <option value="escalated">🚩 Escalated (Needs Human)</option>
          <option value="resolved">✓ Resolved</option>
        </select>
      </div>
    </div>
  );
};
