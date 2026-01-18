import React, { useState, useEffect } from 'react';
import { X, Users, Settings, UserPlus, MessageCircle, Calendar } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'settings' | 'members'>('settings');
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [settings, setSettings] = useState({
        auto_welcome_enabled: group.auto_welcome_enabled,
        welcome_message_template: group.welcome_message_template || 'Welcome {{name}} to {{group_name}}! 🙏',
        auto_add_as_contact: group.auto_add_as_contact,
        default_contact_category: group.default_contact_category || 'Group Member'
    });
    const [saving, setSaving] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        if (activeTab === 'members') {
            loadMembers();
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
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Auto-welcome Toggle */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="font-semibold text-gray-900">Auto-welcome New Members</div>
                                        <div className="text-sm text-gray-600">Send a welcome DM to new members automatically</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.auto_welcome_enabled}
                                        onChange={(e) => setSettings({ ...settings, auto_welcome_enabled: e.target.checked })}
                                        className="w-12 h-6 rounded-full appearance-none bg-gray-300 relative cursor-pointer transition checked:bg-green-500"
                                    />
                                </label>
                            </div>

                            {/* Welcome Message Template */}
                            {settings.auto_welcome_enabled && (
                                <div>
                                    <label className="block font-semibold text-gray-900 mb-2">
                                        Welcome Message Template
                                    </label>
                                    <textarea
                                        value={settings.welcome_message_template}
                                        onChange={(e) => setSettings({ ...settings, welcome_message_template: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        placeholder="Welcome {{name}} to {{group_name}}!"
                                    />
                                    <p className="text-sm text-gray-600 mt-2">
                                        Available variables: <code className="bg-gray-100 px-2 py-1 rounded">{'{{name}}'}</code>,{' '}
                                        <code className="bg-gray-100 px-2 py-1 rounded">{'{{group_name}}'}</code>
                                    </p>
                                </div>
                            )}

                            {/* Auto-add as Contact */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="font-semibold text-gray-900">Auto-add as Contact</div>
                                        <div className="text-sm text-gray-600">Automatically create contacts for new members</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.auto_add_as_contact}
                                        onChange={(e) => setSettings({ ...settings, auto_add_as_contact: e.target.checked })}
                                        className="w-12 h-6 rounded-full appearance-none bg-gray-300 relative cursor-pointer transition checked:bg-green-500"
                                    />
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
