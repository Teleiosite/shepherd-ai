
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Contact, MessageLog } from '../types';
import { Users, UserPlus, BookOpen, MessageCircle } from 'lucide-react';

interface DashboardProps {
  contacts: Contact[];
  logs: MessageLog[];
  resources: any[];
}

const COLORS = ['#3b82f6', '#14b8a6', '#06b6d4', '#0ea5e9', '#60a5fa', '#22d3ee', '#2dd4bf', '#38bdf8'];

const Dashboard: React.FC<DashboardProps> = ({ contacts, logs, resources }) => {

  // Dynamically calculate category stats
  const categoryCounts = contacts.reduce((acc, contact) => {
    acc[contact.category] = (acc[contact.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: 'Total Contacts', value: contacts.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Categories', value: categoryData.length, icon: UserPlus, color: 'bg-green-500' },
    { label: 'Resources', value: resources.length, icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Messages Sent', value: logs.filter(l => l.status === 'Sent').length, icon: MessageCircle, color: 'bg-orange-500' },
  ];

  const activityData = [
    { name: 'Mon', sent: 12 },
    { name: 'Tue', sent: 19 },
    { name: 'Wed', sent: 3 },
    { name: 'Thu', sent: 5 },
    { name: 'Fri', sent: 2 },
    { name: 'Sat', sent: 10 },
    { name: 'Sun', sent: 25 },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Mobile Title Card */}
      <div className="md:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-700">My Local Church Follow-up System</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-full ${stat.color} text-white shrink-0`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 h-96">
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

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 h-96">
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
