
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Contact, MessageLog } from '../types';
import { Users, UserPlus, BookOpen, MessageCircle } from 'lucide-react';

interface DashboardProps {
  contacts: Contact[];
  logs: MessageLog[];
  resources: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57'];

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
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-slate-500">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
            </div>
            <div className={`p-4 rounded-full ${stat.color} text-white`}>
              <stat.icon size={28} />
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
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 14}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 14}} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="sent" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
