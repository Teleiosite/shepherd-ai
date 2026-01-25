
import React, { useState } from 'react';
import { Contact, KnowledgeResource, MessageLog, MessageStatus, WorkflowStep } from '../types';
import { generateMessage } from '../services/geminiService';
import { whatsappService } from '../services/whatsappService';
import { BACKEND_URL } from '../services/env';
import { Send, RefreshCw, MessageSquare, AlertCircle, Calendar, Clock, CheckCircle, Users, CheckSquare, Square, Zap, Play, Trash2, X, Check, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getRecommendedWorkflowStep } from '../utils/workflows';

interface CampaignSchedulerProps {
    contacts: Contact[];
    resources: KnowledgeResource[];
    logs: MessageLog[];
    setLogs: React.Dispatch<React.SetStateAction<MessageLog[]>>;
    aiName: string;
    organizationName: string;
    categories: string[];
}

const CampaignScheduler: React.FC<CampaignSchedulerProps> = ({ contacts, resources, logs, setLogs, aiName, organizationName, categories }) => {
    // Selection State
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

    // Generation State
    const [promptGoal, setPromptGoal] = useState('Day 1 Welcome Message');
    const [generatedDrafts, setGeneratedDrafts] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Filter & Tab State
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [activeTab, setActiveTab] = useState<'create' | 'smart' | 'scheduled'>('smart');

    // Scheduling State
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleTarget, setScheduleTarget] = useState<'bulk' | string>('bulk'); // 'bulk' or contactId
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    // Check auto-run setting
    const isAutoRunEnabled = localStorage.getItem('shepherd_autorun_enabled') === 'true';

    const filteredContacts = contacts.filter(c => filterCategory === 'All' || c.category === filterCategory);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedContactIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedContactIds(newSet);
    };

    const toggleAll = () => {
        if (selectedContactIds.size === filteredContacts.length) {
            setSelectedContactIds(new Set());
        } else {
            setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
        }
    };

    const handleGenerate = async (targetContacts: Contact[], overridePrompt?: string) => {
        if (targetContacts.length === 0) return;

        setError('');
        setIsGenerating(true);

        const newDrafts = { ...generatedDrafts };

        for (const contact of targetContacts) {
            try {
                // Determine prompt: override (smart flow) or selected manual prompt
                let finalPrompt = overridePrompt || promptGoal;

                // Strip __CUSTOM__ prefix if present (from custom goal input)
                if (finalPrompt.startsWith('__CUSTOM__')) {
                    finalPrompt = finalPrompt.replace('__CUSTOM__', '');
                }

                // If smart flow override is missing (manual mode), use dropdown
                if (!overridePrompt && activeTab === 'smart') {
                    const step = getRecommendedWorkflowStep(contact.joinDate, contact.category);
                    finalPrompt = step ? step.prompt : "General check-in";
                }

                // Sequential generation
                const content = await generateMessage(contact, finalPrompt, resources, aiName, organizationName);
                newDrafts[contact.id] = content;
                setGeneratedDrafts({ ...newDrafts });
                // Tiny delay
                await new Promise(r => setTimeout(r, 200));
            } catch (e) {
                console.error(`Failed for ${contact.name}`, e);
                setError('Failed to generate messages.');
            }
        }

        setIsGenerating(false);
    };

    // Helper to process sending or scheduling
    const processMessages = async (ids: string[], isScheduled: boolean) => {
        const scheduledDateTime = isScheduled ? `${scheduleDate}T${scheduleTime}` : undefined;
        const newLogs: MessageLog[] = [];
        let successCount = 0;

        if (!isScheduled) setIsSending(true);

        const token = localStorage.getItem('authToken');

        for (const id of ids) {
            const content = generatedDrafts[id];
            if (!content) continue;

            const contact = contacts.find(c => c.id === id);
            if (!contact) continue;

            try {
                // Queue message through backend API
                const response = await fetch(`${BACKEND_URL}/api/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        contact_id: contact.id,
                        content: content,
                        type: 'Outbound',
                        scheduled_for: scheduledDateTime
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to queue message');
                }

                newLogs.push({
                    id: uuidv4(),
                    contactId: id,
                    content: content,
                    timestamp: new Date().toISOString(),
                    status: isScheduled ? MessageStatus.SCHEDULED : MessageStatus.SENT,
                    type: 'Outbound',
                    scheduledFor: scheduledDateTime
                });
                successCount++;

                // Rate limit for API safety
                await new Promise(r => setTimeout(r, 300));
            } catch (error) {
                console.error(`Failed to queue message for ${contact.name}:`, error);
            }
        }

        if (!isScheduled) setIsSending(false);

        if (successCount === 0) {
            alert("No messages could be queued. Please try again.");
            return;
        }

        setLogs([...newLogs, ...logs]);

        const remainingDrafts = { ...generatedDrafts };
        ids.forEach(id => delete remainingDrafts[id]);
        setGeneratedDrafts(remainingDrafts);

        // Clear selection if bulk
        if (scheduleTarget === 'bulk') {
            setSelectedContactIds(new Set());
        }

        if (isScheduled) {
            setScheduleModalOpen(false);
            setActiveTab('scheduled');
            setScheduleDate('');
            setScheduleTime('');
        } else {
            alert(`${successCount} messages queued successfully!`);
        }
    };

    const handleBulkSendNow = () => {
        const targetIds = Array.from(selectedContactIds) as string[];
        if (targetIds.length === 0) return;
        processMessages(targetIds, false);
    };

    const handleSmartSendNow = (id: string) => {
        processMessages([id], false);
    };

    const openScheduleModal = (target: 'bulk' | string) => {
        setScheduleTarget(target);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduleDate(tomorrow.toISOString().split('T')[0]);
        setScheduleTime('09:00');
        setScheduleModalOpen(true);
    };

    const confirmSchedule = () => {
        if (!scheduleDate || !scheduleTime) return;

        const targetIds: string[] = scheduleTarget === 'bulk'
            ? Array.from(selectedContactIds) as string[]
            : [scheduleTarget];

        processMessages(targetIds, true);
    };

    const handleCancelScheduled = (id: string) => {
        if (window.confirm("Are you sure you want to delete this scheduled message?")) {
            setLogs(prev => prev.filter(l => l.id !== id));
        }
    };

    const handleSendScheduledNow = async (id: string) => {
        if (window.confirm("Send this message immediately?")) {
            const msg = logs.find(l => l.id === id);
            if (msg) {
                const contact = contacts.find(c => c.id === msg.contactId);
                if (!contact) return;

                const token = localStorage.getItem('authToken');

                try {
                    // Queue message through backend API (no schedule = send now)
                    const response = await fetch(`${BACKEND_URL}/api/messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            contact_id: contact.id,
                            content: msg.content,
                            type: 'Outbound'
                            // No scheduled_for = send immediately
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to queue message');
                    }

                    // Update log status
                    setLogs(prev => prev.map(l => {
                        if (l.id === id) {
                            return { ...l, status: MessageStatus.SENT, scheduledFor: undefined, timestamp: new Date().toISOString() };
                        }
                        return l;
                    }));
                } catch (error) {
                    console.error('Failed to send scheduled message:', error);
                    alert('Failed to send message. Please try again.');
                }
            }
        }
    };

    const scheduledMessages = logs.filter(l => l.status === MessageStatus.SCHEDULED);
    const getContactName = (id: string) => contacts.find(c => c.id === id)?.name || 'Unknown Contact';
    const getContactCategory = (id: string) => contacts.find(c => c.id === id)?.category || '';
    const isBulkMode = selectedContactIds.size > 1;

    // Filter out contacts who have already received a message TODAY
    const hasSentMessageToday = (contactId: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        return logs.some(l =>
            l.contactId === contactId &&
            l.timestamp.startsWith(todayStr) &&
            (l.status === MessageStatus.SENT || l.status === MessageStatus.SCHEDULED)
        );
    };

    const getDueContacts = () => {
        return contacts.map(c => {
            const step = getRecommendedWorkflowStep(c.joinDate, c.category);
            return { contact: c, step };
        })
            .filter((item): item is { contact: Contact, step: WorkflowStep } => item.step !== null)
            .filter(item => !hasSentMessageToday(item.contact.id)) // Exclude if already processed today
            .sort((a, b) => (a.step.day - b.step.day));
    };

    const dueContacts = getDueContacts();
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="flex flex-col min-h-screen md:h-[calc(100vh-140px)] relative">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-fit overflow-x-auto">
                    <button onClick={() => setActiveTab('smart')} className={`px-3 md:px-5 py-2 md:py-2.5 rounded-md text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${activeTab === 'smart' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                        <Zap size={16} className="md:w-[18px] md:h-[18px]" />
                        <span className="hidden sm:inline">Smart Workflows</span>
                        <span className="sm:hidden">Smart</span>
                    </button>
                    <button onClick={() => setActiveTab('create')} className={`px-3 md:px-5 py-2 md:py-2.5 rounded-md text-sm md:text-base font-medium transition-colors whitespace-nowrap ${activeTab === 'create' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                        <span className="hidden sm:inline">Manual Draft</span>
                        <span className="sm:hidden">Draft</span>
                    </button>
                    <button onClick={() => setActiveTab('scheduled')} className={`px-3 md:px-5 py-2 md:py-2.5 rounded-md text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${activeTab === 'scheduled' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                        <span className="hidden sm:inline">Scheduled</span>
                        <span className="sm:hidden">Sched</span>
                        <span className="bg-slate-200 text-slate-600 px-1.5 md:px-2 py-0.5 rounded-full text-xs md:text-sm">{scheduledMessages.length}</span>
                    </button>
                </div>
                {activeTab === 'create' && selectedContactIds.size > 0 && (
                    <div className="flex items-center gap-3 px-2">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            Drafting for <span className="bg-primary-100 text-primary-700 px-3 py-0.5 rounded-full text-sm">{selectedContactIds.size}</span> Contacts
                        </h2>
                        {isBulkMode && <span className="text-sm text-green-600 font-medium flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full"><Users size={14} /> Bulk Mode</span>}
                    </div>
                )}
            </div>

            {/* Smart Workflows Tab */}
            {activeTab === 'smart' && (
                <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-100 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Today's Workflow Tasks</h2>
                            <p className="text-slate-500 text-lg">Suggested messages based on the 30-day spiritual journey.</p>
                        </div>
                        {isAutoRunEnabled && (
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                                <Zap size={18} fill="currentColor" />
                                <span className="font-medium text-sm">Automation is Active</span>
                            </div>
                        )}
                    </div>

                    {dueContacts.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <CheckCircle size={64} className="mx-auto mb-4 opacity-50 text-green-500" />
                            <p className="text-xl font-medium text-slate-600">All caught up!</p>
                            <p className="text-base mt-2">No pending workflow messages for today.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {dueContacts.map(({ contact, step }) => (
                                <div key={contact.id} className="border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-5 min-w-[220px]">
                                        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl shrink-0">
                                            {contact.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">{contact.name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 text-sm md:text-base">
                                                <span className="text-slate-500">{contact.category}</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="text-orange-600 font-medium">{`Day ${step.day}: ${step.title}`}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full px-4">
                                        {generatedDrafts[contact.id] ? (
                                            <div className="relative group">
                                                <textarea
                                                    className="w-full text-sm md:text-base bg-white border-2 border-teal-400 rounded-2xl p-4 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                                    rows={6}
                                                    value={generatedDrafts[contact.id]}
                                                    onChange={(e) => setGeneratedDrafts({ ...generatedDrafts, [contact.id]: e.target.value })}
                                                />
                                                <div className="absolute bottom-3 right-3 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openScheduleModal(contact.id)}
                                                        className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50 shadow-sm"
                                                        title="Schedule"
                                                    >
                                                        <Calendar size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSmartSendNow(contact.id)}
                                                        className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 shadow-sm"
                                                        title="Send Now"
                                                    >
                                                        <Send size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm md:text-base text-slate-400 italic bg-slate-50 p-6 md:p-8 rounded-2xl text-center border-2 border-dashed border-slate-300 min-h-[150px] flex items-center justify-center">
                                                Waiting for generation...
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleGenerate([contact], step.prompt)}
                                        disabled={isGenerating || !!generatedDrafts[contact.id]}
                                        className="w-full md:w-auto px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 text-base font-medium whitespace-nowrap min-w-[120px] flex justify-center items-center gap-2"
                                    >
                                        {isGenerating && !generatedDrafts[contact.id] && <RefreshCw className="animate-spin" size={18} />}
                                        {generatedDrafts[contact.id] ? 'Regenerate' : 'Generate'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Manual Draft Tab */}
            {activeTab === 'create' && (
                <div className="flex flex-col md:grid md:grid-cols-4 gap-4 md:gap-6 flex-1 md:overflow-hidden md:min-h-0">
                    <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-full max-h-[60vh] md:max-h-full">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h3 className="font-semibold text-slate-800 mb-3 text-sm md:text-base">Select Recipients</h3>
                            <select
                                className="w-full text-sm border-2 border-teal-400 rounded-3xl px-4 py-2.5 mb-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
                                <button onClick={toggleAll} className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                                    {selectedContactIds.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="text-xs sm:text-sm text-slate-600 font-medium">
                                    {selectedContactIds.size} of {filteredContacts.length} selected
                                </span>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {filteredContacts.map(contact => {
                                const isSelected = selectedContactIds.has(contact.id);
                                return (
                                    <div key={contact.id} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-50 border border-transparent'}`} onClick={() => toggleSelection(contact.id)}>
                                        <div className={`text-slate-400 ${isSelected ? 'text-primary-600' : ''}`}>
                                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium text-sm md:text-base ${isSelected ? 'text-primary-800' : 'text-slate-800'}`}>{contact.name}</p>
                                            <p className="text-xs md:text-sm text-slate-500">{contact.category}</p>
                                        </div>
                                        {generatedDrafts[contact.id] && <div className="w-2.5 h-2.5 rounded-full bg-green-500" title="Draft generated"></div>}
                                    </div>
                                );
                            })}
                            {filteredContacts.length === 0 && <p className="text-center text-slate-400 py-10 text-base">No contacts found.</p>}
                        </div>
                    </div>

                    <div className="md:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
                        {selectedContactIds.size > 0 ? (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 shrink-0">
                                <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
                                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                        <label className="text-xs md:text-sm font-bold text-slate-500 uppercase whitespace-nowrap">Goal:</label>
                                        {promptGoal.startsWith('__CUSTOM__') ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Type your custom goal here..."
                                                    className="flex-1 border-2 border-teal-400 rounded-3xl px-4 py-2.5 text-sm md:text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                                    value={promptGoal.replace('__CUSTOM__', '')}
                                                    onChange={(e) => setPromptGoal(`__CUSTOM__${e.target.value}`)}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => setPromptGoal('General Encouragement')}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Back to presets"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <select className="w-full sm:flex-1 border-2 border-teal-400 rounded-3xl px-4 py-2.5 text-sm md:text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" value={promptGoal} onChange={(e) => setPromptGoal(e.target.value)}>
                                                <option value="Day 1 Welcome Message">Day 1: Welcome & Assurance</option>
                                                <option value="Day 3 Check-in">Day 3: How is it going? (Check-in)</option>
                                                <option value="Week 1 Invitation">Week 1: Invite to Next Steps/Class</option>
                                                <option value="Prayer Request Follow-up">Prayer Request Follow-up</option>
                                                <option value="General Encouragement">General Encouragement</option>
                                                <option value="Birthday/Anniversary Wishes">Birthday/Anniversary Wishes</option>
                                                <option value="Event Reminder">Event/Service Reminder</option>
                                                <option value="__CUSTOM__">+ Custom Goal...</option>
                                            </select>
                                        )}
                                    </div>
                                    <button onClick={() => handleGenerate(contacts.filter(c => selectedContactIds.has(c.id)))} disabled={isGenerating} className="w-full md:w-auto h-11 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm md:text-base font-medium whitespace-nowrap">
                                        {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                        {isGenerating ? 'Thinking...' : `Generate`}
                                    </button>
                                </div>
                                {error && <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium"><AlertCircle size={16} />{error}</div>}
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 shrink-0 text-center text-slate-400">
                                <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                                <p className="text-base">Select contacts from the left to start.</p>
                            </div>
                        )}

                        {selectedContactIds.size > 0 && (
                            <div className="bg-white flex-1 rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
                                <div className="flex-1 bg-slate-50 p-5 overflow-y-auto space-y-5">
                                    {Array.from(selectedContactIds).map(id => {
                                        const contact = contacts.find(c => c.id === id);
                                        const draft = generatedDrafts[id];
                                        if (!contact) return null;
                                        return (
                                            <div key={id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">{contact.name.charAt(0)}</div>
                                                        <span className="font-bold text-slate-800 text-base">{contact.name}</span>
                                                    </div>
                                                    {draft ? <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Ready</span> : <span className="text-xs text-slate-400">Pending</span>}
                                                </div>
                                                {draft ? (
                                                    <textarea className="w-full flex-1 min-h-[140px] text-base text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-4 focus:ring-1 focus:ring-primary-500 outline-none resize-none leading-relaxed" value={draft} onChange={(e) => setGeneratedDrafts({ ...generatedDrafts, [String(id)]: e.target.value })} />
                                                ) : (
                                                    <div className="h-36 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-base italic border border-slate-100">{isGenerating ? 'Generating...' : 'Waiting to generate...'}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="p-4 bg-white border-t border-slate-200 shadow-lg z-10 space-y-3 shrink-0">
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                        <button onClick={() => openScheduleModal('bulk')} disabled={Object.keys(generatedDrafts).length === 0} className="flex-1 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors text-sm md:text-base font-medium">
                                            <Calendar size={18} className="md:w-5 md:h-5" />
                                            <span className="hidden sm:inline">Schedule All</span>
                                            <span className="sm:hidden">Schedule</span>
                                        </button>
                                        <button onClick={handleBulkSendNow} disabled={Object.keys(generatedDrafts).length === 0 || isSending} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors text-sm md:text-base font-bold">
                                            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} className="md:w-5 md:h-5" />}
                                            {isSending ? 'Sending...' : 'Send All Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Scheduled Tab */}
            {activeTab === 'scheduled' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-xl text-slate-800">Scheduled Messages Queue</h3>
                    </div>
                    {scheduledMessages.length > 0 ? (
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase bg-slate-50">Recipient</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase bg-slate-50">Category</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase bg-slate-50">Scheduled For</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase bg-slate-50">Content Preview</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase text-right bg-slate-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {scheduledMessages.map(msg => (
                                        <tr key={msg.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-5 font-medium text-slate-800 text-base">{getContactName(msg.contactId)}</td>
                                            <td className="px-6 py-5">
                                                <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">{getContactCategory(msg.contactId)}</span>
                                            </td>
                                            <td className="px-6 py-5 text-slate-600 flex items-center gap-2 text-base">
                                                <Clock size={16} className="text-blue-500" />
                                                {msg.scheduledFor ? new Date(msg.scheduledFor).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-5 text-slate-500 text-base max-w-md truncate" title={msg.content}>{msg.content}</td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => handleSendScheduledNow(msg.id)}
                                                        type="button"
                                                        className="p-2.5 text-green-600 hover:bg-green-100 rounded-lg border border-green-200 hover:border-green-300 transition-all cursor-pointer shadow-sm bg-white"
                                                        title="Send Now"
                                                    >
                                                        <Play size={20} fill="currentColor" className="opacity-80 pointer-events-none" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelScheduled(msg.id)}
                                                        type="button"
                                                        className="p-2.5 text-red-500 hover:bg-red-100 rounded-lg border border-red-200 hover:border-red-300 transition-all cursor-pointer shadow-sm bg-white"
                                                        title="Delete Scheduled Message"
                                                    >
                                                        <Trash2 size={20} className="pointer-events-none" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Calendar size={56} className="mb-4 opacity-50" />
                            <p className="text-lg">No messages scheduled.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Scheduling Modal */}
            {scheduleModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Schedule Message</h3>
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
                                <button onClick={confirmSchedule} disabled={!scheduleDate || !scheduleTime} className="flex-1 py-3 text-white bg-teal-500 rounded-full hover:bg-teal-600 disabled:opacity-50 text-base font-bold transition-all duration-200 shadow-sm hover:shadow-md">Confirm Schedule</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignScheduler;
