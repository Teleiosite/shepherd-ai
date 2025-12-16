import React, { useState, useRef } from 'react';
import { KnowledgeResource } from '../types';
import { Book, FileText, Trash2, Plus, Info, Upload, FileSpreadsheet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

interface KnowledgeBaseProps {
  resources: KnowledgeResource[];
  setResources: React.Dispatch<React.SetStateAction<KnowledgeResource[]>>;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ resources, setResources }) => {
  const [showModal, setShowModal] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'Book' as const,
    content: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setResources([...resources, {
      id: uuidv4(),
      ...newResource,
      uploadDate: new Date().toISOString()
    }]);
    setShowModal(false);
    setNewResource({ title: '', type: 'Book', content: '' });
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setNewResource(prev => ({
            ...prev,
            title: file.name.split('.')[0],
            content: text
        }));
    };
    reader.readAsText(file);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      // Expecting columns: Title, Content, Type (optional)
      const parsedResources: KnowledgeResource[] = data.map(row => ({
        id: uuidv4(),
        title: row['Title'] || row['title'] || 'Untitled Resource',
        content: row['Content'] || row['content'] || '',
        type: (row['Type'] || row['type'] || 'Book'),
        uploadDate: new Date().toISOString(),
        fileName: file.name
      })).filter(r => r.content.length > 0);

      setResources(prev => [...prev, ...parsedResources]);
      
      // Reset
      if (excelInputRef.current) excelInputRef.current.value = '';
      alert(`Successfully imported ${parsedResources.length} resources.`);
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Knowledge Base</h2>
          <p className="text-slate-500 text-sm mt-1">Upload books and sermons for the AI to reference.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => excelInputRef.current?.click()}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <FileSpreadsheet size={18} className="text-green-600" />
                Import Excel
            </button>
            <input 
                type="file" 
                ref={excelInputRef} 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={handleExcelUpload} 
            />

            <button 
            onClick={() => setShowModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
            <Plus size={18} />
            Add Manually
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(resource => (
          <div key={resource.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${resource.type === 'Book' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'}`}>
                {resource.type === 'Book' ? <Book size={24} /> : <FileText size={24} />}
              </div>
              <button onClick={() => handleDelete(resource.id)} className="text-slate-300 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
            <h3 className="font-semibold text-lg text-slate-800 mb-1">{resource.title}</h3>
            <p className="text-xs text-slate-400 mb-4">Added {new Date(resource.uploadDate).toLocaleDateString()}</p>
            <div className="mt-auto">
              <p className="text-sm text-slate-500 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">
                {resource.content}
              </p>
            </div>
          </div>
        ))}
        {resources.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Book className="text-slate-400" size={32} />
             </div>
             <p className="text-slate-500 font-medium">No resources added yet.</p>
             <p className="text-slate-400 text-sm mt-1">Add books manually or import from Excel (Columns: Title, Content, Type).</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-lg text-slate-800">Add New Resource</h3>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} placeholder="e.g. Purpose Driven Life" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newResource.type} onChange={e => setNewResource({...newResource, type: e.target.value as any})}>
                    <option value="Book">Book</option>
                    <option value="Sermon">Sermon</option>
                    <option value="Devotional">Devotional</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>Content Text</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:underline">
                      <Upload size={12} /> Upload Text File (.txt, .md)
                  </button>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.json" className="hidden" onChange={handleTextFileUpload} />
                </label>
                <div className="text-xs text-slate-400 mb-2">
                    For books, paste the chapter content or upload a text file.
                </div>
                <textarea 
                  required 
                  className="w-full h-48 border border-slate-300 rounded-lg p-3 text-sm" 
                  placeholder="Paste the chapter content, sermon notes, or summary here..."
                  value={newResource.content}
                  onChange={e => setNewResource({...newResource, content: e.target.value})}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;