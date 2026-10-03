import React, { useState, useEffect } from 'react';
import {
  Shield, Users, CheckCircle, AlertTriangle, ArrowUpRight, Search,
  RefreshCw, Trash2, Edit3, Lock, Sparkles, MessageSquare, PhoneCall,
  Zap, Globe, Bot, X, Check, Save, Sliders, ChevronDown
} from 'lucide-react';
import { BACKEND_URL } from '../services/env';

interface Subscriber {
  id: string;
  name: string;
  created_at: string;
  subscription_plan: 'starter' | 'growth' | 'enterprise';
  subscription_status: string;
  monthly_message_limit: number;
  messages_used_this_month: number;
  custom_permissions: Record<string, boolean>;
  contacts_count: number;
  messages_count: number;
  owner?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

const ALL_FEATURES = [
  { id: 'whatsapp', label: 'WhatsApp Cloud API & Bridge', icon: PhoneCall, minPlan: 'Growth' },
  { id: 'whatsapp_bridge', label: 'WhatsApp Bridge Pairing', icon: PhoneCall, minPlan: 'Growth' },
  { id: 'live_chats', label: 'Live Chats Takeover', icon: MessageSquare, minPlan: 'Growth' },
  { id: 'voice_notes', label: 'Voice Note Transcription (Whisper)', icon: Bot, minPlan: 'Growth' },
  { id: 'workflows', label: 'Automated Drip Workflows', icon: Zap, minPlan: 'Growth' },
  { id: 'campaigns', label: 'Campaigns & Broadcasts', icon: Zap, minPlan: 'Growth' },
  { id: 'groups', label: 'WhatsApp Community Groups', icon: Users, minPlan: 'Enterprise' },
  { id: 'external_webhook', label: 'External Catalog Webhook Sync', icon: Globe, minPlan: 'Enterprise' },
];

export default function SuperAdminDashboard() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [editingPermissionsSub, setEditingPermissionsSub] = useState<Subscriber | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, boolean>>({});
  const [editingQuotaSub, setEditingQuotaSub] = useState<Subscriber | null>(null);
  const [newQuotaValue, setNewQuotaValue] = useState<number>(1000);
  const [deletingSub, setDeletingSub] = useState<Subscriber | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/subscribers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
      } else {
        const err = await res.json();
        setNotification({ type: 'error', message: err.detail || 'Failed to load subscribers' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Network error connecting to admin server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleUpdatePlan = async (sub: Subscriber, newPlan: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/subscribers/${sub.id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription_plan: newPlan })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        await fetchSubscribers();
      } else {
        setNotification({ type: 'error', message: data.detail || 'Failed to change plan' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to update subscriber plan' });
    }
  };

  const handleSaveQuota = async () => {
    if (!editingQuotaSub) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/subscribers/${editingQuotaSub.id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription_plan: editingQuotaSub.subscription_plan,
          monthly_message_limit: newQuotaValue
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: `Quota updated to ${newQuotaValue.toLocaleString()} messages.` });
        setEditingQuotaSub(null);
        await fetchSubscribers();
      } else {
        setNotification({ type: 'error', message: data.detail || 'Failed to update quota' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Network error updating quota' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (sub: Subscriber) => {
    const nextStatus = sub.subscription_status === 'active' ? 'suspended' : 'active';
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/subscribers/${sub.id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription_plan: sub.subscription_plan,
          subscription_status: nextStatus
        })
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Subscriber ${sub.name} is now ${nextStatus}.` });
        await fetchSubscribers();
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to toggle status' });
    }
  };

  const handleSavePermissions = async () => {
    if (!editingPermissionsSub) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/subscribers/${editingPermissionsSub.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ custom_permissions: tempPermissions })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setEditingPermissionsSub(null);
        await fetchSubscribers();
      } else {
        setNotification({ type: 'error', message: data.detail || 'Failed to save permissions' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Network error saving permissions' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubscriber = async () => {
    if (!deletingSub) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/subscribers/${deletingSub.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setDeletingSub(null);
        await fetchSubscribers();
      } else {
        setNotification({ type: 'error', message: data.detail || 'Failed to delete subscriber' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Network error deleting subscriber' });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = subscribers.filter(s => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = s.name.toLowerCase().includes(query) ||
      (s.owner?.email && s.owner.email.toLowerCase().includes(query)) ||
      (s.owner?.name && s.owner.name.toLowerCase().includes(query));
    const matchesPlan = filterPlan === 'all' || s.subscription_plan === filterPlan;
    return matchesQuery && matchesPlan;
  });

  const starterCount = subscribers.filter(s => s.subscription_plan === 'starter').length;
  const growthCount = subscribers.filter(s => s.subscription_plan === 'growth').length;
  const enterpriseCount = subscribers.filter(s => s.subscription_plan === 'enterprise').length;
  const totalMessagesUsed = subscribers.reduce((acc, s) => acc + (s.messages_used_this_month || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Super Admin Console</h1>
              <p className="text-xs sm:text-sm text-slate-500">Manage all platform subscribers, push plan tiers, and set custom permissions.</p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSubscribers}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between border ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold underline ml-4 hover:opacity-75 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Subscribers</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{subscribers.length}</p>
          <p className="text-xs text-slate-500">{subscribers.filter(s => s.subscription_status === 'active').length} active</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-xs space-y-1">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Starter (₦100k)</span>
          <p className="text-2xl sm:text-3xl font-black text-teal-800">{starterCount}</p>
          <p className="text-xs text-teal-600/80">1,000 msg quota</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Growth (₦250k)</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-800">{growthCount}</p>
          <p className="text-xs text-amber-600/80">10,000 msg quota</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-1">
          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Enterprise (₦500k)</span>
          <p className="text-2xl sm:text-3xl font-black text-purple-800">{enterpriseCount}</p>
          <p className="text-xs text-purple-600/80">50,000 msg quota</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search subscriber, email, organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'starter', 'growth', 'enterprise'].map((plan) => (
            <button
              key={plan}
              onClick={() => setFilterPlan(plan)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                filterPlan === plan
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {plan === 'all' ? 'All Plans' : plan}
            </button>
          ))}
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4 sm:px-6">Subscriber / Org</th>
                <th className="py-3.5 px-4">Plan Tier</th>
                <th className="py-3.5 px-4">Usage & Quota</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Admin Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No subscribers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => {
                  const planColor =
                    sub.subscription_plan === 'enterprise'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : sub.subscription_plan === 'growth'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-teal-50 text-teal-700 border-teal-200';

                  const usagePct = Math.min(100, Math.round((sub.messages_used_this_month / sub.monthly_message_limit) * 100));

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Owner */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-900">{sub.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{sub.owner?.email || 'No email registered'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sub.contacts_count} contacts • {sub.messages_count} messages
                        </div>
                      </td>

                      {/* Plan Tier Selector */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${planColor}`}>
                            {sub.subscription_plan}
                          </span>
                          <div>
                            <select
                              value={sub.subscription_plan}
                              onChange={(e) => handleUpdatePlan(sub, e.target.value)}
                              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                            >
                              <option value="starter">Set to Starter (₦100k)</option>
                              <option value="growth">Push to Growth (₦250k)</option>
                              <option value="enterprise">Push to Enterprise (₦500k)</option>
                            </select>
                          </div>
                        </div>
                      </td>

                      {/* Usage & Quota */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{sub.messages_used_this_month.toLocaleString()}</span>
                            <span className="text-slate-400">/ {sub.monthly_message_limit.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${usagePct > 85 ? 'bg-amber-500' : 'bg-teal-500'}`}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuotaSub(sub);
                              setNewQuotaValue(sub.monthly_message_limit);
                            }}
                            className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 size={11} />
                            <span>Edit Quota</span>
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(sub)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            sub.subscription_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {sub.subscription_status || 'active'}
                        </button>
                      </td>

                      {/* Controls */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPermissionsSub(sub);
                              setTempPermissions(sub.custom_permissions || {});
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Sliders size={13} />
                            <span>Features</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingSub(sub)}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Delete subscriber"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Quota Modal */}
      {editingQuotaSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Custom Monthly Quota</h3>
            <p className="text-xs text-slate-500 mt-1">Set the AI message allowance for <strong>{editingQuotaSub.name}</strong>.</p>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Messages per month</label>
              <input
                type="number"
                value={newQuotaValue}
                onChange={(e) => setNewQuotaValue(parseInt(e.target.value, 10) || 0)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-base font-bold outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2 pt-2">
                {[1000, 3000, 10000, 25000, 50000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewQuotaValue(val)}
                    className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  >
                    {val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleSaveQuota}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Quota'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingQuotaSub(null)}
                className="py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Permissions Drawer/Modal */}
      {editingPermissionsSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Granular Overrides
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Feature Controls</h3>
                <p className="text-xs text-slate-500">
                  Override plan defaults for <strong>{editingPermissionsSub.name}</strong> ({editingPermissionsSub.subscription_plan.toUpperCase()}).
                </p>
              </div>
              <button
                onClick={() => setEditingPermissionsSub(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {ALL_FEATURES.map((feat) => {
                const Icon = feat.icon;
                const isExplicitlySet = feat.id in tempPermissions;
                const isEnabled = tempPermissions[feat.id] === true;

                return (
                  <div key={feat.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{feat.label}</p>
                        <p className="text-[10px] text-slate-400">Standard Tier: {feat.minPlan}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={isExplicitlySet ? (isEnabled ? 'enabled' : 'disabled') : 'default'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTempPermissions(prev => {
                            const updated = { ...prev };
                            if (val === 'default') {
                              delete updated[feat.id];
                            } else {
                              updated[feat.id] = val === 'enabled';
                            }
                            return updated;
                          });
                        }}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer ${
                          isExplicitlySet
                            ? isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        <option value="default">Plan Default</option>
                        <option value="enabled">Force Enabled (✓)</option>
                        <option value="disabled">Force Disabled (✗)</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving...' : 'Save Permissions'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingPermissionsSub(null)}
                className="py-3 px-5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50/50">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Subscriber?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong>{deletingSub.name}</strong>? All contacts, message history, catalog items, and user logins will be permanently deleted.
            </p>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleDeleteSubscriber}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>{isSaving ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDeletingSub(null)}
                className="py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
