import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Contact, MessageLog } from '../types';
import { Users, UserPlus, BookOpen, MessageCircle, Calendar, Zap, MessageSquare, Package, ArrowUpRight } from 'lucide-react';
import { BACKEND_URL } from '../services/env';
import { getBookings, refreshFromBackend } from '../services/bookingService';

interface DashboardProps {
  contacts: Contact[];
  logs: MessageLog[];
  resources: any[];
  organizationName?: string;
}

const COLORS = ['#3b82f6', '#14b8a6', '#06b6d4', '#0ea5e9', '#60a5fa', '#22d3ee', '#2dd4bf', '#38bdf8'];

const Dashboard: React.FC<DashboardProps> = ({ contacts, logs, resources, organizationName = 'Organization' }) => {
  const navigate = useNavigate();

  // Real-time state for additional stats
  const [bookingsCount, setBookingsCount] = useState<number>(() => getBookings().length);
  const [subscriptionUsage, setSubscriptionUsage] = useState({ used: 140, limit: 1000, plan: 'starter' });
  const [groupsCount, setGroupsCount] = useState<number>(0);
  const [catalogCount, setCatalogCount] = useState<number>(0);

  useEffect(() => {
    // 1. Fetch live bookings from backend
    refreshFromBackend()
      .then(b => setBookingsCount(b.length))
      .catch(() => setBookingsCount(getBookings().length));

    const token = localStorage.getItem('authToken');
    if (!token) return;

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. Fetch live subscription AI usage
    fetch(`${BACKEND_URL}/api/settings/ai-config`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setSubscriptionUsage({
            used: data.messages_used_this_month !== undefined ? data.messages_used_this_month : 140,
            limit: data.monthly_message_limit !== undefined ? data.monthly_message_limit : 1000,
            plan: data.subscription_plan || 'starter'
          });
        }
      })
      .catch(err => console.warn('[Dashboard] Failed to fetch subscription quota:', err));

    // 3. Fetch live WhatsApp groups count
    fetch(`${BACKEND_URL}/api/groups/`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setGroupsCount(data.length);
        }
      })
      .catch(err => console.warn('[Dashboard] Failed to fetch groups:', err));

    // 4. Fetch live catalog & offerings count
    fetch(`${BACKEND_URL}/api/catalog/`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const count = typeof data.total === 'number' ? data.total : (Array.isArray(data.items) ? data.items.length : 0);
          setCatalogCount(count);
        }
      })
      .catch(err => console.warn('[Dashboard] Failed to fetch catalog:', err));
  }, []);

  // Dynamically calculate category stats
  const categoryCounts = contacts.reduce((acc, contact) => {
    acc[contact.category] = (acc[contact.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: 'Total Contacts', value: contacts.length.toLocaleString(), subtext: 'Audience database', icon: Users, color: 'bg-blue-500', path: '/contacts' },
    { label: 'Categories', value: categoryData.length.toLocaleString(), subtext: 'Segmented lists', icon: UserPlus, color: 'bg-green-500', path: '/contacts' },
    { label: 'Resources', value: resources.length.toLocaleString(), subtext: 'Knowledge items', icon: BookOpen, color: 'bg-purple-500', path: '/knowledge' },
    { label: 'Messages Sent', value: logs.filter(l => l.status === 'Sent' || l.type === 'Outbound').length.toLocaleString(), subtext: 'Outbound dispatched', icon: MessageCircle, color: 'bg-orange-500', path: '/chats' },
    { label: 'Bookings', value: bookingsCount.toLocaleString(), subtext: 'Appointments & reservations', icon: Calendar, color: 'bg-teal-500', path: '/bookings' },
    { 
      label: 'Current Subscription', 
      value: `${subscriptionUsage.used.toLocaleString()} / ${subscriptionUsage.limit.toLocaleString()}`, 
      subtext: 'AI messages used', 
      icon: Zap, 
      color: 'bg-emerald-600', 
      path: '/billing',
      isQuota: true
    },
    { label: 'WhatsApp Groups', value: groupsCount.toLocaleString(), subtext: 'Connected communities', icon: MessageSquare, color: 'bg-indigo-500', path: '/groups' },
    { label: 'Catalog & Offerings', value: catalogCount.toLocaleString(), subtext: 'Products in store', icon: Package, color: 'bg-rose-500', path: '/catalog' },
  ];

  // Dynamically calculate weekly activity from message logs for the last 7 days
  const activityData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = Array(7).fill(0);
    const now = new Date();

    logs.forEach(log => {
      if (log.type === 'Outbound' && log.timestamp) {
        const logDate = new Date(log.timestamp);
        if (!isNaN(logDate.getTime())) {
          const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0 && daysDiff < 7) {
            counts[logDate.getDay()]++;
          }
        }
      }
    });

    // Return in order starting from Monday to Sunday or based on days of the week
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => {
      const idx = name === 'Sun' ? 0 : dayNames.indexOf(name);
      return { name, sent: counts[idx] };
    });
  }, [logs]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Mobile Title Card */}
      <div className="md:hidden bg-white p-4 rounded-xl shadow-xs border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-700">{organizationName} Follow-up System</h2>
      </div>

      {/* Stats Grid - 8 Real-time Clickable Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            onClick={() => navigate(stat.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(stat.path); }}
            className="bg-white p-4 sm:p-5 rounded-xl shadow-xs hover:shadow-md border border-slate-100 hover:border-slate-300 flex flex-col justify-between cursor-pointer transition-all duration-200 group text-left select-none"
            title={`Click to view ${stat.label}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1 truncate">{stat.label}</p>
                <p className={`font-bold text-slate-800 tracking-tight truncate ${stat.isQuota ? 'text-base sm:text-xl text-emerald-800' : 'text-xl sm:text-2xl'}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-2.5 sm:p-3 rounded-full ${stat.color} text-white shrink-0 group-hover:scale-110 transition-transform shadow-xs`}>
                <stat.icon size={22} />
              </div>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
              <span className="truncate">{stat.subtext}</span>
              <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 shrink-0 ml-1" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-xl shadow-xs border border-slate-100 h-96">
          <h3 className="text-xl font-bold mb-6 text-slate-800">Contact Distribution</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
          )}
        </div>

        <div className="bg-white p-8 rounded-xl shadow-xs border border-slate-100 h-96">
          <h3 className="text-xl font-bold mb-6 text-slate-800">Weekly Message Activity</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 14 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 14 }} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
