
import React, { useState, useRef } from 'react';
import { Contact, ApiKey } from '../types';
import { Plus, Upload, Search, Trash2, Edit2, User, FileSpreadsheet, Download, Zap, Calendar, CheckCircle, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { getNextWorkflowStep } from '../utils/workflows';
import { storage } from '../services/storage';

interface ContactsManagerProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  onAddContact: (contact: Contact, autoGenerate: boolean) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
}

const ContactsManager: React.FC<ContactsManagerProps> = ({ contacts, setContacts, onAddContact, categories, onAddCategory }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isBulk, setIsBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStats, setImportStats] = useState<{ total: number, success: number } | null>(null);

  // Single Add Form State
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    category: categories[0] || 'New Convert',
    notes: ''
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  // Bulk Add Text
  const [bulkText, setBulkText] = useState('');

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalCategory = newContact.category;
    if (isCustomCategory && customCategoryInput.trim()) {
      finalCategory = customCategoryInput.trim();
      onAddCategory(finalCategory);
    }

    const contact: Contact = {
      id: uuidv4(),
      ...newContact,
      category: finalCategory,
      joinDate: new Date().toISOString(),
      status: 'Active'
    };
    onAddContact(contact, autoGenerate);
    setShowAddModal(false);
    setNewContact({ name: '', phone: '', category: categories[0], notes: '' });
    setIsCustomCategory(false);
    setCustomCategoryInput('');
  };

  const handleBulkTextSubmit = () => {
    const lines = bulkText.split('\n');
    const parsedContacts: Contact[] = lines.map(line => {
      const parts = line.split(',');
      if (parts.length < 2) return null;
      const cat = parts[2]?.trim();

      // Auto-add category if new
      if (cat && !categories.includes(cat)) {
        onAddCategory(cat);
      }

      return {
        id: uuidv4(),
        name: parts[0].trim(),
        phone: parts[1].trim(),
        category: cat || categories[0],
        joinDate: new Date().toISOString(),
        notes: 'Imported via Bulk Text',
        status: 'Active'
      };
    }).filter(c => c !== null) as Contact[];

    parsedContacts.forEach(c => onAddContact(c, autoGenerate));

    setImportStats({ total: lines.length, success: parsedContacts.length });
    setTimeout(() => {
      setShowAddModal(false);
      setBulkText('');
      setImportStats(null);
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      const parsedContacts: Contact[] = [];
      const startIndex = (data[0] && (data[0][0] === 'Name' || data[0][0] === 'name')) ? 1 : 0;

      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (row && row[0]) {
          const cat = row[2] as string;
          if (cat && !categories.includes(cat)) onAddCategory(cat);

          parsedContacts.push({
            id: uuidv4(),
            name: String(row[0]),
            phone: String(row[1] || ''),
            category: cat || categories[0],
            notes: row[3] || 'Imported via Excel',
            joinDate: new Date().toISOString(),
            status: 'Active'
          });
        }
      }

      parsedContacts.forEach(c => onAddContact(c, autoGenerate));
      setImportStats({ total: data.length - startIndex, success: parsedContacts.length });

      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        setShowAddModal(false);
        setImportStats(null);
      }, 2000);
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    const success = await storage.deleteContact(id);

    if (success) {
      // Update local state after successful backend deletion
      setContacts(contacts.filter(c => c.id !== id));
    } else {
      alert('Failed to delete contact. Please try again.');
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    const success = await storage.updateContact(editingContact);

    if (success) {
      setContacts(contacts.map(c =>
        c.id === editingContact.id ? editingContact : c
      ));
      setShowEditModal(false);
      setEditingContact(null);
    } else {
      alert('Failed to update contact. Please try again.');
    }
  };

  const filteredContacts = contacts.filter(c =>
    (filterCategory === 'All' || c.category === filterCategory) &&
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
  );

  const getRelativeTime = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-800">Contacts</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-200 text-base font-medium shadow-sm hover:shadow-md"
        >
          <Plus size={20} />
          Add Contacts
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase">Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase">Category</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase">Next Scheduled Task</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase">Next Due Date</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContacts.map(contact => {
              const nextStepInfo = getNextWorkflowStep(contact.joinDate, contact.category);

              return (
                <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-800 text-base block">{contact.name}</span>
                      <span className="text-xs text-slate-500">{contact.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                      {contact.category}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {nextStepInfo ? (
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded">Day {nextStepInfo.step.day}</span>
                        <span className="text-sm truncate max-w-[180px]" title={nextStepInfo.step.title}>{nextStepInfo.step.title}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">Journey Completed</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {nextStepInfo ? (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={16} className="text-blue-500" />
                        <span className="text-sm font-medium">{getRelativeTime(nextStepInfo.dueDate)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => handleEdit(contact)} className="text-slate-400 hover:text-primary-600 mr-3"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(contact.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-semibold text-xl text-slate-800">Add Contacts</h3>
              <div className="flex gap-2 text-sm bg-slate-200 p-1 rounded-lg shrink-0">
                <button type="button" onClick={() => setIsBulk(false)} className={`px-4 py-1.5 rounded-md transition-colors ${!isBulk ? 'bg-white shadow text-primary-600 font-medium' : 'text-slate-600 hover:text-slate-800'}`}>Single</button>
                <button type="button" onClick={() => setIsBulk(true)} className={`px-4 py-1.5 rounded-md transition-colors ${isBulk ? 'bg-white shadow text-primary-600 font-medium' : 'text-slate-600 hover:text-slate-800'}`}>Bulk Import</button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto">
              {!isBulk ? (
                <form onSubmit={handleSingleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-base font-medium text-slate-700 mb-2">Full Name</label>
                    <input required type="text" className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-slate-700 mb-2">Category</label>
                    {!isCustomCategory ? (
                      <div className="flex gap-2">
                        <select
                          className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-base"
                          value={newContact.category}
                          onChange={e => {
                            if (e.target.value === 'custom_plus') {
                              setIsCustomCategory(true);
                            } else {
                              setNewContact({ ...newContact, category: e.target.value });
                            }
                          }}
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="custom_plus" className="font-bold text-primary-600">+ Create New Category</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-2 animate-fade-in">
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 border border-primary-300 ring-2 ring-primary-100 rounded-lg px-4 py-2.5 text-base"
                          placeholder="Enter new category name..."
                          value={customCategoryInput}
                          onChange={e => setCustomCategoryInput(e.target.value)}
                        />
                        <button type="button" onClick={() => setIsCustomCategory(false)} className="text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-base font-medium text-slate-700 mb-2">Phone Number</label>
                    <input required type="tel" className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                  </div>

                  <div className="flex items-center gap-3 pt-2 pb-2">
                    <input
                      id="auto-gen"
                      type="checkbox"
                      checked={autoGenerate}
                      onChange={e => setAutoGenerate(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="auto-gen" className="text-base text-slate-700 flex items-center gap-2">
                      <Zap size={18} className="text-amber-500" />
                      Auto-send Welcome Message (Day 0)
                    </label>
                  </div>

                  <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-base">Cancel</button>
                    <button type="submit" className="px-6 py-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 text-base font-medium transition-all duration-200 shadow-sm hover:shadow-md">Add Contact</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-base font-medium text-slate-700">Option A: Upload Excel File</label>
                        {importStats && <span className="text-sm text-green-600 font-bold">{importStats.success} contacts imported!</span>}
                      </div>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <FileSpreadsheet className="text-green-600 mb-3" size={40} />
                        <p className="text-base text-slate-600">Click to upload .xlsx or .xls</p>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                        />
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <input
                        id="bulk-auto-gen"
                        type="checkbox"
                        checked={autoGenerate}
                        onChange={e => setAutoGenerate(e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="bulk-auto-gen" className="text-base text-blue-800 flex items-center gap-2 font-medium">
                        <Zap size={18} className="text-amber-500" />
                        Auto-send "Day 0" message for all imported contacts
                      </label>
                    </div>

                    <div className="relative col-span-2 flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-sm uppercase">Or paste manually</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-base font-medium text-slate-700 mb-2">Option B: Paste Comma-Separated Values</label>
                      <p className="text-xs text-slate-400 mb-2">Format: Name, Phone, Category (optional)</p>
                      <textarea
                        className="w-full h-32 border border-slate-300 rounded-lg p-4 font-mono text-sm"
                        placeholder="John Doe, +2348012345678, New Convert"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-base">Cancel</button>
                    <button onClick={handleBulkTextSubmit} disabled={!bulkText} className="px-6 py-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:opacity-50 text-base font-medium transition-all duration-200 shadow-sm hover:shadow-md">
                      Import Manual Text
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-semibold text-xl text-slate-800">Edit Contact</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-all""
                  value={editingContact.name}
                  onChange={e => setEditingContact({ ...editingContact, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    required
                    type="tel"
                    className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-all""
                  value={editingContact.phone}
                  onChange={e => setEditingContact({ ...editingContact, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email (Optional)</label>
                  <input
                    type="email"
                    className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-all""
                  value={editingContact.email || ''}
                  onChange={e => setEditingContact({ ...editingContact, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <select
                    className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-all" bg-white"
                  value={editingContact.category}
                  onChange={e => setEditingContact({ ...editingContact, category: e.target.value })}
                  >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
              <textarea
                className="w-full border border-slate-300 rounded-3xl px-6 py-3 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-all""
              rows={3}
              value={editingContact.notes || ''}
              onChange={e => setEditingContact({ ...editingContact, notes: e.target.value })}
                  ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-base font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 text-base font-medium transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              Save Changes
            </button>
          </div>
        </form>
            </div>
          </div >
        </div >
      )}
    </div >
  );
};

export default ContactsManager;
