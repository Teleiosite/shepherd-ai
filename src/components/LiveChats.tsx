
import React, { useState, useEffect, useRef } from 'react';
import { Contact, MessageLog, MessageStatus, MessageAttachment, AgentSuggestion, AgentAction, MediaFile } from '../types';
import { User, Search, Send, Phone, MessageSquare, Clock, Check, CheckCheck, Paperclip, Smile, X, Image as ImageIcon, Calendar, Edit2, ExternalLink, AlertCircle, Bot, RefreshCw, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { whatsappService } from '../services/whatsappService';
import { findFileByName } from '../services/mediaLibraryService';

interface LiveChatsProps {
  contacts: Contact[];
  logs: MessageLog[];
  setLogs: React.Dispatch<React.SetStateAction<MessageLog[]>>;
  suggestedReplies?: Record<string, AgentSuggestion>; // contactId -> suggestion
  onClearSuggestion?: (contactId: string) => void;
  onRegenerateSuggestion?: (contactId: string) => void;
  organizationName?: string;
  mediaFiles?: MediaFile[];
}

const COMMON_EMOJIS = ['👍', '🙏', '❤️', '😂', '🙌', '🔥', '😊', '🎉', '👋', '😢', '🤔', '⛪', '🕊️', '📖', '✨', '✝️'];

const LiveChats: React.FC<LiveChatsProps> = ({
  contacts, logs, setLogs,
  suggestedReplies = {},
  onClearSuggestion,
  onRegenerateSuggestion,
  organizationName = '',
  mediaFiles = []
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fix 1: Track the last messaged contact to pin it at top immediately
  const [lastMessagedContactId, setLastMessagedContactId] = useState<string | null>(null);

  // Attachment & Emoji State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);

  // Scheduling State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Edit Sent Message State
  const [editingSentMessageId, setEditingSentMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // AI Suggestion editing state
  const [editedSuggestion, setEditedSuggestion] = useState<string>('');
  const [activeSuggestionContactId, setActiveSuggestionContactId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const today = new Date().toISOString().split('T')[0];

  // Reset editing state when contact changes
  useEffect(() => {
    setEditingSentMessageId(null);
    setEditContent('');
  }, [selectedContactId]);

  // Pre-calculate last message timestamp for each contact to avoid N log N filtering inside sort
  const contactLastMessageTimes = React.useMemo(() => {
    const timesMap = new Map<string, number>();
    logs.forEach(log => {
      const logTime = new Date(log.timestamp).getTime();
      const existingTime = timesMap.get(log.contactId) || 0;
      if (logTime > existingTime) {
        timesMap.set(log.contactId, logTime);
      }
    });
    return timesMap;
  }, [logs]);

  // Filter and sort contacts: pin lastMessagedContactId first, then sort by last message time (newest first)
  const filteredContacts = React.useMemo(() => {
    return contacts
      .filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
      )
      .sort((a, b) => {
        // Fix 1: Pin the contact we just messaged immediately to top
        if (a.id === lastMessagedContactId) return -1;
        if (b.id === lastMessagedContactId) return 1;

        const lastMessageTimeA = contactLastMessageTimes.get(a.id);
        const lastMessageTimeB = contactLastMessageTimes.get(b.id);

        if (lastMessageTimeA !== undefined && lastMessageTimeB !== undefined) {
          return lastMessageTimeB - lastMessageTimeA;
        }
        if (lastMessageTimeA !== undefined) return -1;
        if (lastMessageTimeB !== undefined) return 1;

        // Neither has messages: fall back to joinDate
        const joinTimeA = new Date(a.joinDate).getTime() || 0;
        const joinTimeB = new Date(b.joinDate).getTime() || 0;
        return joinTimeB - joinTimeA;
      });
  }, [contacts, searchTerm, contactLastMessageTimes, lastMessagedContactId]);

  // Get messages for selected contact
  const currentMessages = logs
    .filter(l => l.contactId === selectedContactId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Auto-scroll to bottom
  useEffect(() => {
    if (!editingSentMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages.length, selectedContactId, pendingAttachment]);

  // Handle textarea resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [newMessage]);

  // Click outside to close emoji picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingRef.current || (!newMessage.trim() && !pendingAttachment) || !selectedContactId || !selectedContact) return;

    // Immediately lock to prevent double-submitting
    isSendingRef.current = true;
    setIsSending(true);

    // Fix 1: Pin this contact to top of list immediately
    setLastMessagedContactId(selectedContactId);

    const messageToSend = newMessage.trim();
    const attachmentToSend = pendingAttachment;

    // ✅ OPTIMISTIC UPDATE: Show message immediately
    const optimisticMessage: MessageLog = {
      id: uuidv4(),
      contactId: selectedContactId,
      content: messageToSend,
      timestamp: new Date().toISOString(),
      status: MessageStatus.SENT,
      type: 'Outbound',
      attachment: attachmentToSend || undefined
    };

    // Add to UI immediately (before API call)
    setLogs(prev => [...prev, optimisticMessage]);

    // Clear input immediately for better UX
    setNewMessage('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Send via WhatsApp API in background
    try {
      const waConfig = whatsappService.getConfig();

      if (waConfig) {
        let result;

        if (attachmentToSend) {
          console.log('📸 Sending MEDIA with caption:', messageToSend);
          result = await whatsappService.sendMedia(
            selectedContact.phone,
            attachmentToSend.type,
            attachmentToSend.url,
            messageToSend || undefined,
            attachmentToSend.name,
            (selectedContact as any).whatsappId,
            selectedContactId  // Add contact ID for queuing
          );
        } else {
          console.log('💬 Sending TEXT message:', messageToSend);
          result = await whatsappService.sendMessage(
            selectedContact.phone,
            messageToSend,
            (selectedContact as any).whatsappId,
            selectedContactId  // Add contact ID for queuing
          );
        }

        if (!result.success) {
          console.warn("WhatsApp API failed, logging locally.", result.error);
          setLogs(prev => prev.map(l => l.id === optimisticMessage.id ? { ...l, status: MessageStatus.FAILED, error: result.error } : l));
        } else if (result.dbMessageId) {
          // ✅ Replace client UUID with server DB ID so the 5-second poller
          // won't see this as a new/unknown message and add it as a duplicate.
          console.log('✅ Reconciling optimistic message ID:', optimisticMessage.id, '→', result.dbMessageId);
          setLogs(prev => prev.map(l => l.id === optimisticMessage.id ? { ...l, id: result.dbMessageId! } : l));
        }
      }
    } catch (error) {
      console.error('Send error:', error);
      // Message already shown, error is logged
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!selectedContact || !selectedContact.phone) return;
    const link = whatsappService.getDeepLink(selectedContact.phone, newMessage || '');
    window.open(link, '_blank');
  };

  const openScheduleModal = () => {
    if ((!newMessage.trim() && !pendingAttachment)) return;
    setEditingMessageId(null); // Ensure we are creating new
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime('09:00');
    setScheduleModalOpen(true);
    setShowEmojiPicker(false);
  };

  const handleEditSchedule = (msg: MessageLog) => {
    if (!msg.scheduledFor) return;
    setEditingMessageId(msg.id);

    const dateObj = new Date(msg.scheduledFor);
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    setScheduleDate(`${year}-${month}-${day}`);

    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    setScheduleTime(`${hours}:${minutes}`);

    setScheduleModalOpen(true);
  };

  const confirmSchedule = () => {
    if (!scheduleDate || !scheduleTime) return;
    const scheduledDateTime = `${scheduleDate}T${scheduleTime}`;

    if (editingMessageId) {
      // Update existing message
      setLogs(prev => prev.map(log => {
        if (log.id === editingMessageId) {
          return { ...log, scheduledFor: scheduledDateTime };
        }
        return log;
      }));
      setEditingMessageId(null);
    } else {
      // Create new scheduled message
      if (!selectedContactId || (!newMessage.trim() && !pendingAttachment)) return;

      const newLog: MessageLog = {
        id: uuidv4(),
        contactId: selectedContactId,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        status: MessageStatus.SCHEDULED,
        type: 'Outbound',
        attachment: pendingAttachment || undefined,
        scheduledFor: scheduledDateTime
      };

      setLogs(prev => [...prev, newLog]);
      setNewMessage('');
      setPendingAttachment(null);

      // Reset height
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    setScheduleModalOpen(false);
  };

  // --- Edit Sent Message Handlers ---
  const handleStartEdit = (msg: MessageLog) => {
    setEditingSentMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingSentMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = () => {
    if (!editingSentMessageId) return;
    setLogs(prev => prev.map(log => {
      if (log.id === editingSentMessageId) {
        return { ...log, content: editContent };
      }
      return log;
    }));
    setEditingSentMessageId(null);
    setEditContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isSendingRef.current || (!newMessage.trim() && !pendingAttachment)) return;
      handleSendMessage(e);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getLastMessage = (contactId: string) => {
    const contactLogs = logs
      .filter(l => l.contactId === contactId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return contactLogs[0];
  };

  // --- Attachment Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Currently only images are supported for preview.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setPendingAttachment({
        type: 'image',
        url: base64,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeAttachment = () => {
    setPendingAttachment(null);
  };

  // --- Emoji Logic ---
  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Sidebar: Contact List */}
      <div className={`w-full md:w-96 border-r border-slate-100 flex flex-col ${selectedContactId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map(contact => {
            const lastMsg = getLastMessage(contact.id);
            const isSelected = selectedContactId === contact.id;

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`p-5 flex gap-4 cursor-pointer transition-colors border-b border-slate-50 hover:bg-slate-50 ${isSelected ? 'bg-primary-50 border-primary-100' : 'bg-white'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                    {contact.name.charAt(0)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${contact.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className={`font-semibold text-base truncate ${isSelected ? 'text-primary-900' : 'text-slate-800'}`}>
                      {contact.name}
                    </h4>
                    {lastMsg && (
                      <span className="text-xs text-slate-400 shrink-0 ml-2">
                        {new Date(lastMsg.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
                          ? formatTime(lastMsg.timestamp)
                          : new Date(lastMsg.timestamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {lastMsg ? (
                      lastMsg.attachment ? <span className="flex items-center gap-1"><ImageIcon size={14} /> Photo</span> : lastMsg.content
                    ) : <span className="italic opacity-50">No messages yet</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedContactId ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedContactId(null)}
                  className="md:hidden text-slate-500 hover:text-slate-700 mr-2"
                >
                  ←
                </button>
                <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                  {selectedContact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 leading-tight">{selectedContact.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-xs uppercase tracking-wide">{selectedContact.category}</span>
                    <span className="text-xs">• {selectedContact.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="p-2.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-full transition-colors flex items-center gap-2"
                  title="Open in WhatsApp App"
                >
                  <ExternalLink size={20} />
                  <span className="text-sm font-bold hidden md:inline">Open App</span>
                </button>
                <button type="button" className="p-2.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded-full transition-colors" title="Call">
                  <Phone size={22} />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-3">
              {currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <MessageSquare size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-slate-600">No conversation yet</p>
                    <p className="text-sm">Start the journey by sending a message.</p>
                  </div>
                </div>
              ) : (
                currentMessages.map(msg => {
                  const isOutbound = msg.type === 'Outbound';
                  const isEditing = editingSentMessageId === msg.id;

                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`relative max-w-[85%] md:max-w-[60%] px-4 py-2 shadow-sm text-sm md:text-base ${isOutbound
                        ? msg.status === MessageStatus.FAILED
                          ? 'bg-rose-500 text-white rounded-l-2xl rounded-tr-2xl rounded-br-none border border-rose-300'
                          : 'bg-teal-500 text-white rounded-l-2xl rounded-tr-2xl rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-r-2xl rounded-tl-2xl rounded-bl-none'
                        }`}>

                        {/* Attachments */}
                        {msg.attachment && msg.attachment.type === 'image' && !isEditing && (
                          <div className="-mx-1 -mt-1 mb-2">
                            <img
                              src={msg.attachment.url}
                              alt="Attachment"
                              className="rounded-lg max-h-60 object-cover w-full cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => window.open(msg.attachment?.url, '_blank')}
                            />
                          </div>
                        )}

                        {msg.attachment && msg.attachment.type !== 'image' && !isEditing && (
                          <a
                            href={msg.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 -mx-1 -mt-1 mb-2 p-2 rounded-lg ${isOutbound ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                          >
                            <Paperclip size={18} />
                            <span className="font-medium underline decoration-dotted truncate max-w-[200px]">
                              View Attachment
                            </span>
                          </a>
                        )}

                        {/* Failed Alert Banner */}
                        {msg.status === MessageStatus.FAILED && !isEditing && (
                          <div className={`flex items-start gap-1.5 text-xs mb-1.5 pb-1.5 border-b border-white/20 text-rose-100`}>
                            <AlertCircle size={13} className="shrink-0 mt-0.5 text-white animate-pulse" />
                            <span className="font-medium">
                              {msg.error || 'Failed to deliver message. Check settings.'}
                            </span>
                          </div>
                        )}

                        {/* Scheduled Banner inside bubble */}
                        {msg.status === MessageStatus.SCHEDULED && !isEditing && (
                          <div className={`flex items-center justify-between gap-2 text-xs mb-1 pb-1 border-b ${isOutbound ? 'border-white/20 text-white/90' : 'border-slate-100 text-slate-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} />
                              <span className="font-medium">Scheduled: {msg.scheduledFor ? new Date(msg.scheduledFor).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Pending'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleEditSchedule(msg);
                              }}
                              className={`p-1 rounded-full ${isOutbound ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-500'} transition-colors`}
                              title="Change delivery time"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="w-full min-w-[220px]">
                            <textarea
                              className={`w-full text-sm p-2 rounded-lg border focus:outline-none focus:ring-2 resize-none ${isOutbound ? 'text-slate-800 bg-white border-white' : 'text-slate-800 bg-slate-50 border-slate-200'}`}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${isOutbound ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all duration-200 flex items-center gap-1 shadow-sm ${isOutbound ? 'bg-white text-teal-600 hover:bg-slate-100' : 'bg-teal-500 text-white hover:bg-teal-600'}`}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-end gap-x-2 relative pr-1">
                            <span className="whitespace-pre-wrap leading-relaxed break-words">
                              {msg.content}
                            </span>

                            {/* Metadata: Time + Icon */}
                            <div className={`flex items-center gap-1 select-none text-[10px] ml-auto shrink-0 h-4 ${isOutbound ? 'text-blue-50/80' : 'text-slate-400'}`}>
                              <span>{formatTime(msg.timestamp)}</span>
                              {isOutbound && (
                                <span className="flex items-center gap-0.5">
                                  {(msg.status === MessageStatus.SENT || msg.status === MessageStatus.GENERATED) && <Check size={14} strokeWidth={1.5} />}
                                  {msg.status === MessageStatus.RESPONDED && <CheckCheck size={14} strokeWidth={1.5} />}
                                  {(msg.status === MessageStatus.SCHEDULED || msg.status === MessageStatus.PENDING) && <Clock size={12} strokeWidth={1.5} />}
                                  {msg.status === MessageStatus.FAILED && <AlertCircle size={12} className="text-white shrink-0" />}
                                </span>
                              )}

                              {/* Edit Pencil - Only for Outbound Sent messages */}
                              {isOutbound && msg.status === MessageStatus.SENT && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleStartEdit(msg); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/20 rounded ml-1"
                                  title="Edit sent message"
                                >
                                  <Edit2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Professional Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              {/* Attachment Preview */}
              {pendingAttachment && (
                <div className="mb-3 flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 w-fit max-w-full animate-fade-in">
                  <img src={pendingAttachment.url} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-slate-300" />
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-slate-700 truncate">{pendingAttachment.name}</p>
                    <p className="text-xs text-slate-500">Ready to send</p>
                  </div>
                  <button type="button" onClick={removeAttachment} className="text-slate-400 hover:text-red-500">
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* ===== AI AGENT SUGGESTION PANEL ===== */}
              {selectedContactId && suggestedReplies[selectedContactId] && (() => {
                const suggestion = suggestedReplies[selectedContactId];
                const isEditing = activeSuggestionContactId === selectedContactId;
                const displayText = isEditing ? editedSuggestion : suggestion.reply;
                const handleSendSuggestion = async () => {
                  if (!selectedContact || !displayText.trim()) return;
                  const messageText = displayText.trim();
                  if (suggestion.action?.type === 'SEND_DOCUMENT' && suggestion.action.documentName) {
                    const file = findFileByName(suggestion.action.documentName);
                    if (file) {
                      const optimistic: MessageLog = { id: uuidv4(), contactId: selectedContactId, content: `📎 ${file.fileName}`, timestamp: new Date().toISOString(), status: MessageStatus.SENT, type: 'Outbound', attachment: { type: file.type === 'image' ? 'image' : 'file', url: file.url, name: file.fileName } };
                      setLogs(prev => [...prev, optimistic]);
                    }
                  }
                  const optimistic: MessageLog = { id: uuidv4(), contactId: selectedContactId, content: messageText, timestamp: new Date().toISOString(), status: MessageStatus.SENT, type: 'Outbound' };
                  setLogs(prev => [...prev, optimistic]);
                  setLastMessagedContactId(selectedContactId);
                  try { await whatsappService.sendMessage(selectedContact.phone, messageText, (selectedContact as any).whatsappId, selectedContactId); } catch {}
                  onClearSuggestion?.(selectedContactId);
                  setActiveSuggestionContactId(null); setEditedSuggestion('');
                };
                return (
                  <div className="mb-3 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-violet-100/60 border-b border-violet-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center"><Bot size={13} className="text-white" /></div>
                        <span className="text-sm font-semibold text-violet-800">AI Suggested Reply</span>
                        {suggestion.action && suggestion.action.type !== 'NONE' && (
                          <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">+ {suggestion.action.type.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onRegenerateSuggestion?.(selectedContactId)} className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-100 rounded-full transition-colors" title="Regenerate"><RefreshCw size={14} /></button>
                        <button onClick={() => { onClearSuggestion?.(selectedContactId); setActiveSuggestionContactId(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-violet-100 rounded-full transition-colors" title="Dismiss"><X size={14} /></button>
                      </div>
                    </div>
                    <div className="px-4 pt-3 pb-2">
                      <textarea className="w-full bg-white/70 border border-violet-100 rounded-xl px-3 py-2.5 text-sm text-slate-800 resize-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 outline-none transition-all leading-relaxed" rows={3} value={displayText}
                        onClick={() => { if (!isEditing) { setActiveSuggestionContactId(selectedContactId); setEditedSuggestion(suggestion.reply); } }}
                        onChange={(e) => { setActiveSuggestionContactId(selectedContactId); setEditedSuggestion(e.target.value); }} placeholder="AI reply..." />
                    </div>
                    <div className="flex items-center justify-end gap-2 px-4 pb-3">
                      <button onClick={() => { onClearSuggestion?.(selectedContactId); setActiveSuggestionContactId(null); }} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Dismiss</button>
                      <button onClick={handleSendSuggestion} disabled={!displayText.trim()} className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md transition-all">
                        <CheckCircle size={13} />
                        Send Reply{suggestion.action?.type === 'SEND_DOCUMENT' ? ' + File' : suggestion.action?.type === 'SEND_IMAGE' ? ' + Image' : suggestion.action?.type === 'SEND_PAYMENT_LINK' ? ' + Link' : ''}
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="max-w-4xl mx-auto flex items-end gap-3 relative">
                {/* Tools */}

                <div className="flex gap-1 pb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    title="Attach image"
                  >
                    <Paperclip size={22} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />

                  <button
                    type="button"
                    onClick={openScheduleModal}
                    disabled={!newMessage.trim() && !pendingAttachment}
                    className={`p-2.5 rounded-full transition-colors ${(!newMessage.trim() && !pendingAttachment) ? 'text-slate-300' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                    title="Schedule Message"
                  >
                    <Calendar size={22} />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2.5 rounded-full transition-colors ${showEmojiPicker ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'}`}
                      title="Add emoji"
                    >
                      <Smile size={22} />
                    </button>

                    {showEmojiPicker && (
                      <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-3 bg-white border border-slate-200 shadow-xl rounded-xl p-3 grid grid-cols-4 gap-2 w-48 z-20 animate-fade-in">
                        {COMMON_EMOJIS.map(emoji => (
                          <button
                            type="button"
                            key={emoji}
                            onClick={() => handleEmojiClick(emoji)}
                            className="text-2xl hover:bg-slate-100 p-2 rounded-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Input */}
                <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-3">
                  <div className="flex-1 bg-slate-100 border border-transparent rounded-2xl px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-400 transition-all shadow-sm">
                    <textarea
                      ref={textareaRef}
                      className="w-full bg-transparent border-none focus:ring-0 outline-none resize-none max-h-48 min-h-[24px] text-base text-slate-800 placeholder:text-slate-400 leading-relaxed"
                      rows={1}
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !pendingAttachment) || isSending}
                    className="mb-1 bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-full shadow-lg disabled:opacity-50 disabled:shadow-none hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    title="Send Message"
                  >
                    <Send size={22} className={(newMessage.trim() || pendingAttachment) ? "ml-0.5" : ""} />
                  </button>
                </form>
              </div>
              <div className="max-w-4xl mx-auto mt-2 text-right px-2">
                <p className="text-xs text-slate-400">Press <span className="font-medium text-slate-500">Enter</span> to send, <span className="font-medium text-slate-500">Shift + Enter</span> for new line</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 animate-pulse">
              <MessageSquare size={48} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-2">Your Conversations</h3>
            <p className="max-w-sm text-center text-slate-500 text-lg">Select a contact from the sidebar to start chatting or view history.</p>
          </div>
        )}
      </div>

      {/* Scheduling Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{editingMessageId ? 'Reschedule Message' : 'Schedule Message'}</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-base font-medium text-slate-600 mb-2">Date</label>
                <input type="date" className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" min={today} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-base font-medium text-slate-600 mb-2">Time</label>
                <input type="time" className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
              <div className="pt-6 flex gap-4">
                <button onClick={() => setScheduleModalOpen(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 text-base font-medium">Cancel</button>
                <button onClick={confirmSchedule} disabled={!scheduleDate || !scheduleTime} className="flex-1 py-3 text-white bg-teal-500 rounded-full hover:bg-teal-600 disabled:opacity-50 text-base font-bold transition-all duration-200 shadow-sm hover:shadow-md">
                  {editingMessageId ? 'Update Time' : 'Confirm Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChats;
