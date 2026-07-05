import React, { useState, useEffect } from 'react';
import { getMediaFiles, addMediaFile, removeMediaFile, updateMediaFile } from '../services/mediaLibraryService';
import { MediaFile } from '../types';
import { FolderOpen, Upload, Trash2, Edit2, Check, FileText, ImageIcon, Video, Search, Info, Plus } from 'lucide-react';

const MediaLibrary: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [search, setSearch] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    setFiles(getMediaFiles());
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const type: MediaFile['type'] = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : 'document';

      const descriptiveName = uploadName.trim() || file.name.replace(/\.[^/.]+$/, '');
      
      addMediaFile({
        name: descriptiveName,
        type,
        mimeType: file.type,
        url,
        fileName: file.name,
        description: uploadDesc.trim() || undefined,
      });

      setFiles(getMediaFiles());
      setUploadName('');
      setUploadDesc('');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this file from library?')) {
      removeMediaFile(id);
      setFiles(getMediaFiles());
    }
  };

  const handleSaveEdit = (id: string) => {
    updateMediaFile(id, { name: editName, description: editDesc });
    setFiles(getMediaFiles());
    setEditingId(null);
  };

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Media Library</h2>
        <p className="text-slate-500 text-lg mt-1">Upload files, forms, manuals, or menus that the AI agent can send to your customers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit space-y-5">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Upload className="text-teal-500" size={20} />
            Upload File
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Descriptive Name (for AI matching)</label>
              <input
                type="text"
                placeholder="e.g. Price List, Welcome Package, Menu"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">Make this name descriptive so the AI matches it when a customer asks for it.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
              <textarea
                placeholder="Brief notes about this file..."
                rows={2}
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>

            <div className="relative">
              <input
                type="file"
                id="media-file-input"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <label
                htmlFor="media-file-input"
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-8 cursor-pointer hover:bg-slate-50 transition-all"
              >
                <FolderOpen className="text-slate-400 mb-2" size={32} />
                <span className="text-sm font-semibold text-slate-700">Choose File</span>
                <span className="text-xs text-slate-400 mt-1">Images, PDFs, or Docs</span>
              </label>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search bar */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
              <FolderOpen size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="font-semibold text-slate-600">No media files found</p>
              <p className="text-sm mt-1">Upload your first file to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(file => (
                <div key={file.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${file.type === 'image' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                          {file.type === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="min-w-0">
                          {editingId === file.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="border border-slate-300 rounded px-2 py-0.5 text-sm outline-none w-full"
                            />
                          ) : (
                            <h4 className="font-semibold text-slate-800 text-sm truncate" title={file.name}>
                              {file.name}
                            </h4>
                          )}
                          <p className="text-[11px] text-slate-400 truncate">{file.fileName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {editingId === file.id ? (
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none mb-3"
                        rows={2}
                      />
                    ) : (
                      file.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {file.description}
                        </p>
                      )
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-3">
                    <span className="text-[10px] text-slate-400">
                      Uploaded {new Date(file.uploadDate).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      {editingId === file.id ? (
                        <button
                          onClick={() => handleSaveEdit(file.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Check size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(file.id);
                            setEditName(file.name);
                            setEditDesc(file.description || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
