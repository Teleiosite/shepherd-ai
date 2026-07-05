import React, { useState, useEffect } from 'react';
import { X, Users, Settings, UserPlus, MessageCircle, Calendar, Clock } from 'lucide-react';
import { BACKEND_URL } from '../services/env';

interface Group {
    id: string;
    name: string;
    whatsapp_group_id: string;
    description?: string;
    member_count: number;
    auto_welcome_enabled: boolean;
    welcome_message_template?: string;
    auto_add_as_contact: boolean;
    default_contact_category?: string;
}

interface GroupMember {
    id: string;
    name?: string;
    phone: string;
    whatsapp_id: string;
    joined_at: string;
    contact_name?: string;
    contact_category?: string;
}

interface Props {
    group: Group;
    onClose: () => void;
}

export default function GroupDetailsModal({ group, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<'settings' | 'members' | 'scheduled'>('settings');
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [settings, setSettings] = useState({
        auto_welcome_enabled: group.auto_welcome_enabled,
        welcome_message_template: group.welcome_message_template || 'Welcome {{name}} to {{group_name}}! 🙏',
        auto_add_as_contact: group.auto_add_as_contact,
        default_contact_category: group.default_contact_category || 'Group Member'
    });
    const [saving, setSaving] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Scheduled messages states
    const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        if (activeTab === 'members') {
            loadMembers();
        } else if (activeTab === 'scheduled') {
            loadScheduledMessages();
        }
    }, [activeTab]);

    const loadMembers = async () => {
        try {
            setLoadingMembers(true);
            const token = localStorage.getItem('authToken');
            const response = await fetch(
                `${BACKEND_URL}/api/groups/${group.id}/members`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to load members');

            const data = await response.json();
            setMembers(data);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const loadScheduledMessages = async () => {
        try {
            setLoadingMessages(true);
            const token = localStorage.getItem('authToken');
            const response = await fetch(
                `${BACKEND_URL}/api/groups/${group.id}/messages`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to load messages');

            const data = await response.json();
            // Filter only pending/scheduled messages
            const pending = data.filter((msg: any) => msg.status === 'pending');
            setScheduledMessages(pending);
        } catch (error) {
            console.error('Error loading scheduled messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSaveMessageEdit = async (messageId: string) => {
        try {
            setSavingEdit(true);
            const token = localStorage.getItem('authToken');
            
            let scheduledFor = null;
            if (editDate && editTime) {
                scheduledFor = new Date(`${editDate}T${editTime}`).toISOString();
            }

            const response = await fetch(`${BACKEND_URL}/api/groups/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: editContent,
                    scheduled_for: scheduledFor
                })
            });

            if (!response.ok) throw new Error('Failed to update message');

            alert('Message updated successfully!');
            setEditingMessageId(null);
            loadScheduledMessages();
        } catch (error) {
            console.error('Error updating message:', error);
            alert('Failed to update message');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleCancelMessage = async (messageId: string) => {
        if (!window.confirm('Are you sure you want to cancel and delete this scheduled message?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${BACKEND_URL}/api/groups/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to delete message');

            alert('Scheduled message cancelled successfully!');
            loadScheduledMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Failed to delete message');
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('authToken');

            const response = await fetch(`${BACKEND_URL}/api/groups/${group.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) throw new Error('Failed to save settings');

            alert('Settings saved successfully!');
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{group.name}</h2>
                            <p className="text-teal-100 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {group.member_count} members
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 flex">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 px-6 py-3 font-medium transition ${activeTab === 'settings'
                            ? 'text-teal-600 border-b-2 border-teal-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Settings className="w-5 h-5 inline mr-2" />
                        Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 px-6 py-3 font-medium transition ${activeTab === 'members'
                            ? 'text-teal-600 border-b-2 border-teal-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Users className="w-5 h-5 inline mr-2" />
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab('scheduled')}
                        className={`flex-1 px-6 py-3 font-medium transition ${activeTab === 'scheduled'
                            ? 'text-teal-600 border-b-2 border-teal-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Calendar className="w-5 h-5 inline mr-2" />
                        Queue / Scheduled
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Auto-welcome Toggle */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="font-semibold text-gray-900">Auto-welcome New Members</div>
                                        <div className="text-sm text-gray-500 mt-0.5">Send a welcome DM to new members automatically</div>
                                    </div>
                                    {/* Professional Toggle Switch */}
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.auto_welcome_enabled}
                                            onChange={(e) => setSettings({ ...settings, auto_welcome_enabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-teal-500 peer-checked:to-emerald-500 transition-all duration-300"></div>
                                    </div>
                                </label>
                            </div>

                            {/* Welcome Message Template */}
                            {settings.auto_welcome_enabled && (
                                <div className="p-4 bg-teal-50 rounded-xl border border-teal-100 animate-fade-in">
                                    <label className="block font-semibold text-gray-900 mb-2">
                                        Welcome Message Template
                                    </label>
                                    <textarea
                                        value={settings.welcome_message_template}
                                        onChange={(e) => setSettings({ ...settings, welcome_message_template: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white transition-all"
                                        placeholder="Welcome {{name}} to {{group_name}}!"
                                    />
                                    <p className="text-sm text-teal-700 mt-2 flex flex-wrap items-center gap-2">
                                        <span>Available variables:</span>
                                        <code className="bg-white px-2 py-1 rounded-lg text-teal-600 border border-teal-200 font-mono text-xs">{'{{name}}'}</code>
                                        <code className="bg-white px-2 py-1 rounded-lg text-teal-600 border border-teal-200 font-mono text-xs">{'{{group_name}}'}</code>
                                    </p>
                                </div>
                            )}

                            {/* Auto-add as Contact */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="font-semibold text-gray-900">Auto-add as Contact</div>
                                        <div className="text-sm text-gray-500 mt-0.5">Automatically create contacts for new members</div>
                                    </div>
                                    {/* Professional Toggle Switch */}
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.auto_add_as_contact}
                                            onChange={(e) => setSettings({ ...settings, auto_add_as_contact: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-teal-500 peer-checked:to-emerald-500 transition-all duration-300"></div>
                                    </div>
                                </label>
                            </div>

                            {/* Default Category */}
                            {settings.auto_add_as_contact && (
                                <div>
                                    <label className="block font-semibold text-gray-900 mb-2">
                                        Default Contact Category
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.default_contact_category}
                                        onChange={(e) => setSettings({ ...settings, default_contact_category: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        placeholder="e.g. Group Member"
                                    />
                                    <p className="text-sm text-gray-600 mt-2">
                                        New members will be added with this category
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div>
                            {loadingMembers ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading members...</p>
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No members found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {(member.name || member.phone).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {member.name || 'Unknown'}
                                                    </div>
                                                    <div className="text-sm text-gray-600">{member.phone}</div>
                                                </div>
                                            </div>
                                            {member.contact_category && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                    {member.contact_category}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'scheduled' && (
                        <div>
                            {loadingMessages ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading scheduled messages...</p>
                                </div>
                            ) : scheduledMessages.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50 text-slate-400" />
                                    <p className="font-semibold text-slate-600">No scheduled messages</p>
                                    <p className="text-sm mt-1">Use the Send button on a group to schedule a message.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {scheduledMessages.map((msg) => (
                                        <div key={msg.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                            {editingMessageId === msg.id ? (
                                                <div className="space-y-3 animate-fade-in">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Message Content</label>
                                                        <textarea
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white"
                                                        />
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                                                            <input
                                                                type="date"
                                                                value={editDate}
                                                                onChange={(e) => setEditDate(e.target.value)}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Time</label>
                                                            <input
                                                                type="time"
                                                                value={editTime}
                                                                onChange={(e) => setEditTime(e.target.value)}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-1">
                                                        <button
                                                            onClick={() => setEditingMessageId(null)}
                                                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 bg-white"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveMessageEdit(msg.id)}
                                                            disabled={savingEdit || !editContent.trim()}
                                                            className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                                        >
                                                            {savingEdit ? 'Saving...' : 'Save Changes'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-slate-800 whitespace-pre-wrap font-medium">{msg.content}</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                                                            <Clock size={12} />
                                                            <span>
                                                                Scheduled for: {msg.scheduled_for ? new Date(msg.scheduled_for).toLocaleString() : 'Immediate'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => {
                                                                setEditingMessageId(msg.id);
                                                                setEditContent(msg.content);
                                                                if (msg.scheduled_for) {
                                                                    const dt = new Date(msg.scheduled_for);
                                                                    setEditDate(dt.toISOString().split('T')[0]);
                                                                    const hrs = String(dt.getHours()).padStart(2, '0');
                                                                    const mins = String(dt.getMinutes()).padStart(2, '0');
                                                                    setEditTime(`${hrs}:${mins}`);
                                                                } else {
                                                                    setEditDate('');
                                                                    setEditTime('');
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                                            title="Edit message / schedule"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelMessage(msg.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Cancel message"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {activeTab === 'settings' && (
                    <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium"
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
