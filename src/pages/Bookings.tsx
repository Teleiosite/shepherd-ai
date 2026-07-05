import React, { useState, useEffect } from 'react';
import { getBookings, updateBookingStatus, deleteBooking, refreshFromBackend } from '../services/bookingService';
import { Booking, BookingStatus } from '../types';
import { Calendar, Clock, Check, X, Trash2, User, Phone, Tag, ClipboardList, Filter } from 'lucide-react';

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');

  useEffect(() => {
    // Initial load
    setBookings(getBookings());
    // Background refresh
    refreshFromBackend().then(res => setBookings(res));
  }, []);

  const handleStatusChange = (id: string, status: BookingStatus) => {
    const updated = updateBookingStatus(id, status);
    if (updated) {
      setBookings(getBookings());
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this booking?')) {
      deleteBooking(id);
      setBookings(getBookings());
    }
  };

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Bookings & Reservations</h2>
          <p className="text-slate-500 text-lg mt-1">Manage appointments and bookings created automatically by your AI agent.</p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={16} className="text-slate-400 mr-1 hidden sm:inline" />
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(option => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === option ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center text-slate-400">
          <Calendar size={48} className="mx-auto mb-4 text-slate-300 animate-pulse" />
          <p className="font-semibold text-slate-600 text-lg">No bookings found</p>
          <p className="text-sm mt-1">Bookings will appear here when customers schedule them via the WhatsApp AI agent.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-sm font-semibold">
                  <th className="p-4 pl-6">Contact / Customer</th>
                  <th className="p-4">Purpose / Service</th>
                  <th className="p-4">Requested Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(booking => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors text-slate-700 text-sm sm:text-base">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm sm:text-base">{booking.contactName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={10} /> {booking.contactPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 text-xs sm:text-sm truncate max-w-[200px]" title={booking.purpose}>
                          {booking.purpose}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {booking.date ? (
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            {new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {booking.time && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-400" />
                              {booking.time}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not specified</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking.id, 'confirmed')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Confirm booking"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking.id, 'cancelled')}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel booking"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange(booking.id, 'completed')}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Mark completed"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
