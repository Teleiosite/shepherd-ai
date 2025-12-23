// Enhanced Knowledge Base with support for ALL file types
// Supports: PDF, DOCX, TXT, MD, JSON, XLSX, XLS

import React, { useState, useRef } from 'react';
import { KnowledgeResource } from '../types';
import { Book, FileText, Trash2, Plus, Upload, FileSpreadsheet, File } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const universalInputRef = useRef<HTMLInputElement>(null);

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

    // Handle PDF files
    const handlePDFUpload = async (file: File): Promise<string> => {
        setUploadProgress('Reading PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            setUploadProgress(`Reading page ${i} of ${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    };

    // Handle DOCX files
    const handleDOCXUpload = async (file: File): Promise<string> => {
        setUploadProgress('Reading DOCX...');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    };

    // Handle text files (TXT, MD, JSON)
    const handleTextFileUpload = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                resolve(evt.target?.result as string);
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    // Handle Excel files
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

            const parsedResources: KnowledgeResource[] = data.map(row => ({
                id: uuidv4(),
                title: row['Title'] || row['title'] || 'Untitled Resource',
                content: row['Content'] || row['content'] || '',
                type: (row['Type'] || row['type'] || 'Book'),
                uploadDate: new Date().toISOString(),
                fileName: file.name
            })).filter(r => r.content.length > 0);

            setResources(prev => [...prev, ...parsedResources]);

            if (excelInputRef.current) excelInputRef.current.value = '';
            alert(`Successfully imported ${parsedResources.length} resources.`);
        };
        reader.readAsBinaryString(file);
    };

    // Universal file handler
    const handleUniversalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress('Processing file...');

        try {
            let content = '';
            const fileExt = file.name.split('.').pop()?.toLowerCase();

            switch (fileExt) {
                case 'pdf':
                    content = await handlePDFUpload(file);
                    break;
                case 'docx':
                case 'doc':
                    content = await handleDOCXUpload(file);
                    break;
                case 'txt':
                case 'md':
                case 'json':
                case 'csv':
                    content = await handleTextFileUpload(file);
                    break;
                default:
                    alert(`Unsupported file type: ${fileExt}`);
                    setIsUploading(false);
                    return;
            }

            setNewResource(prev => ({
                ...prev,
                title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                content: content
            }));

            setUploadProgress('');
            setIsUploading(false);

            if (universalInputRef.current) universalInputRef.current.value = '';
        } catch (error) {
            console.error('File upload error:', error);
            alert(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    const handleDelete = (id: string) => {
        setResources(resources.filter(r => r.id !== id));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Knowledge Base</h2>
                    <p className="text-slate-500 text-sm mt-1">Upload books, sermons, PDFs, DOCX, and more for the AI to reference.</p>
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
                        Add Resource
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
                        <p className="text-xs text-slate-400 mb-4">
                            Added {new Date(resource.uploadDate).toLocaleDateString()}
                            {resource.fileName && ` • ${resource.fileName}`}
                        </p>
                        <div className="mt-auto">
                            <p className="text-sm text-slate-500 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">
                                {resource.content}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">{resource.content.length} characters</p>
                        </div>
                    </div>
                ))}
                {resources.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Book className="text-slate-400" size={32} />
                        </div>
                        <p className="text-slate-500 font-medium">No resources added yet.</p>
                        <p className="text-slate-400 text-sm mt-1">Upload PDFs, DOCX, text files, or import from Excel.</p>
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
                                    <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} placeholder="e.g. Purpose Driven Life" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newResource.type} onChange={e => setNewResource({ ...newResource, type: e.target.value as any })}>
                                        <option value="Book">Book</option>
                                        <option value="Sermon">Sermon</option>
                                        <option value="Devotional">Devotional</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Content Text</span>
                                    <button type="button" onClick={() => universalInputRef.current?.click()} className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:underline" disabled={isUploading}>
                                        <Upload size={12} /> {isUploading ? uploadProgress : 'Upload File (PDF, DOCX, TXT, MD)'}
                                    </button>
                                    <input
                                        ref={universalInputRef}
                                        type="file"
                                        accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
                                        className="hidden"
                                        onChange={handleUniversalFileUpload}
                                    />
                                </label>
                                <div className="text-xs text-slate-400 mb-2">
                                    Paste content or upload: PDF, DOCX, TXT, MD, JSON, CSV
                                </div>
                                <textarea
                                    required
                                    className="w-full h-48 border border-slate-300 rounded-lg p-3 text-sm"
                                    placeholder="Paste the content or upload a file..."
                                    value={newResource.content}
                                    onChange={e => setNewResource({ ...newResource, content: e.target.value })}
                                    disabled={isUploading}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={isUploading}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700" disabled={isUploading}>Save Resource</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeBase;
