import React, { useState } from 'react';
import { X, Send, Calendar, Clock } from 'lucide-react';
import { BACKEND_URL } from '../services/env';

interface Group {
    id: string;
    name: string;
    member_count: number;
}

interface Props {
    group: Group;
    onClose: () => void;
}

export default function SendGroupMessageModal({ group, onClose }: Props) {
    const [message, setMessage] = useState('');
    const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim()) {
            alert('Please enter a message');
            return;
        }

        try {
            setSending(true);
            const token = localStorage.getItem('authToken');

            let scheduledFor = null;
            if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
                scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            const response = await fetch(
                `${BACKEND_URL}/api/groups/${group.id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: message,
                        scheduled_for: scheduledFor
                    })
                }
            );

            if (!response.ok) throw new Error('Failed to send message');

            alert(scheduleType === 'now' ? 'Message queued for sending!' : 'Message scheduled successfully!');
            onClose();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Send Message</h2>
                            <p className="text-blue-100">To: {group.name} ({group.member_count} members)</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Message Input */}
                    <div>
                        <label className="block font-semibold text-gray-900 mb-2">
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Type your message here..."
                        />
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-sm text-gray-600">
                                This message will be sent to all {group.member_count} members
                            </p>
                            <p className="text-sm text-gray-500">
                                {message.length} characters
                            </p>
                        </div>
                    </div>

                    {/* Schedule Options */}
                    <div>
                        <label className="block font-semibold text-gray-900 mb-3">
                            When to Send
                        </label>
                        <div className="space-y-3">
                            {/* Send Now */}
                            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition hover:bg-blue-50"
                                style={{ borderColor: scheduleType === 'now' ? '#3b82f6' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    name="scheduleType"
                                    value="now"
                                    checked={scheduleType === 'now'}
                                    onChange={(e) => setScheduleType(e.target.value as 'now')}
                                    className="w-4 h-4 text-blue-500"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        <Send className="w-5 h-5 text-blue-500" />
                                        Send Now
                                    </div>
                                    <div className="text-sm text-gray-600">Message will be sent immediately</div>
                                </div>
                            </label>

                            {/* Schedule for Later */}
                            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition hover:bg-blue-50"
                                style={{ borderColor: scheduleType === 'scheduled' ? '#3b82f6' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    name="scheduleType"
                                    value="scheduled"
                                    checked={scheduleType === 'scheduled'}
                                    onChange={(e) => setScheduleType(e.target.value as 'scheduled')}
                                    className="w-4 h-4 text-blue-500"
                                />
                                <div className="ml-3 flex-1">
                                    <div className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                        Schedule for Later
                                    </div>
                                    {scheduleType === 'scheduled' && (
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="block text-sm text-gray-600 mb-1">Date</label>
                                                <input
                                                    type="date"
                                                    value={scheduledDate}
                                                    onChange={(e) => setScheduledDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm text-gray-600 mb-1">Time</label>
                                                <input
                                                    type="time"
                                                    value={scheduledTime}
                                                    onChange={(e) => setScheduledTime(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> Make sure your WhatsApp Bridge is connected and running to send messages.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim() || (scheduleType === 'scheduled' && (!scheduledDate || !scheduledTime))}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                {scheduleType === 'now' ? 'Send Now' : 'Schedule Message'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
