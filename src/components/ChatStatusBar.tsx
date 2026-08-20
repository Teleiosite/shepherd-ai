import React, { useState, useEffect } from 'react';
import { Bot, UserCheck, AlertTriangle, CheckCircle, Clock, ShieldAlert, ChevronDown, Zap, Lightbulb, Volume2 } from 'lucide-react';
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
  const [agentMode, setAgentMode] = useState<'auto-send' | 'suggest'>(() => {
    return (localStorage.getItem('shepherd_agent_mode') as any) || 'auto-send';
  });
  const [voiceReplyMode, setVoiceReplyMode] = useState<'text' | 'match_input' | 'voice'>(() => {
    return (localStorage.getItem('shepherd_voice_reply_mode') as any) || 'text';
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsAiPaused(aiPaused);
  }, [aiPaused]);

  useEffect(() => {
    setCurrentStatus(conversationStatus);
  }, [conversationStatus]);

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

  const handleModeChange = async (newMode: 'auto-send' | 'suggest') => {
    setAgentMode(newMode);
    localStorage.setItem('shepherd_agent_enabled', 'true');
    localStorage.setItem('shepherd_agent_mode', newMode);

    // If AI was paused for this contact, resume it
    if (isAiPaused) {
      handleAiToggle(false);
    }

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${BACKEND_URL}/api/settings/ai-autopilot`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            enabled: true,
            mode: newMode
          })
        });
      }
    } catch (e) {
      console.error('Failed to sync AI autopilot mode:', e);
    }
  };

  const handleVoiceModeChange = async (newVoiceMode: 'text' | 'match_input' | 'voice') => {
    setVoiceReplyMode(newVoiceMode);
    localStorage.setItem('shepherd_voice_reply_mode', newVoiceMode);

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${BACKEND_URL}/api/settings/ai-autopilot`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            voice_reply_mode: newVoiceMode
          })
        });
      }
    } catch (e) {
      console.error('Failed to sync voice mode:', e);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
      {/* AI Autopilot & Voice Control */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-medium flex items-center gap-1">
          <Bot size={14} className={isAiPaused ? "text-amber-500" : "text-teal-600"} />
          AI Mode:
        </span>

        {isAiPaused ? (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-medium flex items-center gap-1">
              <Clock size={12} />
              <span>Paused (Human Handover)</span>
            </span>
            <button
              onClick={() => handleAiToggle(false)}
              disabled={loading}
              className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-300 hover:bg-teal-100 px-2 py-0.5 rounded transition-colors"
            >
              Resume AI
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <select
              value={agentMode}
              onChange={(e) => handleModeChange(e.target.value as any)}
              className={`px-2 py-0.5 rounded text-xs font-semibold border focus:outline-none transition-colors ${
                agentMode === 'auto-send'
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-300'
              }`}
            >
              <option value="auto-send">🟢 Auto-Reply (Autonomous)</option>
              <option value="suggest">💡 Suggest Mode (Co-pilot)</option>
            </select>

            {/* Voice Reply Mode Quick Switcher */}
            <select
              value={voiceReplyMode}
              onChange={(e) => handleVoiceModeChange(e.target.value as any)}
              className={`px-2 py-0.5 rounded text-xs font-semibold border focus:outline-none transition-colors ${
                voiceReplyMode === 'text'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : voiceReplyMode === 'match_input'
                  ? 'bg-violet-50 text-violet-800 border-violet-300'
                  : 'bg-purple-100 text-purple-900 border-purple-300'
              }`}
              title="Configure whether AI speaks back in audio voice notes"
            >
              <option value="text">💬 Text Only</option>
              <option value="match_input">🎙️ Voice on Voice</option>
              <option value="voice">🔊 Always Voice Note</option>
            </select>

            <button
              onClick={() => handleAiToggle(true)}
              disabled={loading}
              className="text-[10px] text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors"
              title="Pause AI for 2 hours to chat manually"
            >
              Take over
            </button>
          </div>
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
