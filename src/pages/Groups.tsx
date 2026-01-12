import React, { useState, useEffect } from 'react';
import { Users, Settings as SettingsIcon, Send, RefreshCw, Plus, MessageCircle, UserPlus } from 'lucide-react';
import { BACKEND_URL } from '../services/env';
import GroupDetailsModal from '../components/GroupDetailsModal';
import SendGroupMessageModal from '../components/SendGroupMessageModal';

interface Group {
    id: string;
    name: string;
    whatsapp_group_id: string;
    description?: string;
    avatar_url?: string;
    member_count: number;
    auto_welcome_enabled: boolean;
    welcome_message_template?: string;
    auto_add_as_contact: boolean;
    default_contact_category?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function Groups() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('authToken');
            const response = await fetch(`${BACKEND_URL}/api/groups/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load groups');

            const data = await response.json();
            setGroups(data);
        } catch (err: any) {
            console.error('Error loading groups:', err);
            setError(err.message || 'Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncGroups = async () => {
        setSyncing(true);
        setError('');

        try {
            // This would trigger the bridge to sync
            // For now, just refresh the list after a delay
            setTimeout(async () => {
                await loadGroups();
                setSyncing(false);
            }, 2000);
        } catch (err: any) {
            setError('Sync failed. Make sure your bridge is connected.');
            setSyncing(false);
        }
    };

    const handleGroupClick = (group: Group) => {
        setSelectedGroup(group);
        setShowDetailsModal(true);
    };

    const handleSendMessage = (group: Group) => {
        setSelectedGroup(group);
        setShowSendModal(true);
    };

    const handleModalClose = () => {
        setShowDetailsModal(false);
        setShowSendModal(false);
        setSelectedGroup(null);
        loadGroups(); // Refresh after changes
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-gray-600">Loading groups...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">WhatsApp Groups</h1>
                    <p className="text-gray-600 mt-1">Manage your WhatsApp group communications</p>
                </div>
                <button
                    onClick={handleSyncGroups}
                    disabled={syncing}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                >
                    <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Groups'}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Empty State */}
            {groups.length === 0 && !loading && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Groups Found</h3>
                    <p className="text-gray-600 mb-4">
                        Connect your WhatsApp bridge and sync to see your groups here
                    </p>
                    <button
                        onClick={handleSyncGroups}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-flex items-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Sync Groups Now
                    </button>
                </div>
            )}

            {/* Groups Grid */}
            {groups.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
                        >
                            {/* Group Header */}
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {group.member_count} members
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {group.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {group.description}
                                    </p>
                                )}

                                {/* Settings Status */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Auto-welcome:</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${group.auto_welcome_enabled
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {group.auto_welcome_enabled ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                    {group.auto_add_as_contact && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Auto-add contacts:</span>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                {group.default_contact_category || 'Group Member'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleGroupClick(group)}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <SettingsIcon className="w-4 h-4" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => handleSendMessage(group)}
                                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <Send className="w-4 h-4" />
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {selectedGroup && showDetailsModal && (
                <GroupDetailsModal
                    group={selectedGroup}
                    onClose={handleModalClose}
                />
            )}

            {selectedGroup && showSendModal && (
                <SendGroupMessageModal
                    group={selectedGroup}
                    onClose={handleModalClose}
                />
            )}
        </div>
    );
}
