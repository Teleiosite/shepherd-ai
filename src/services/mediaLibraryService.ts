/**
 * Media Library Service
 * =====================
 * Manages pre-uploaded files (PDFs, images, documents) that the AI agent
 * can send to contacts when they request files.
 *
 * Examples: "Send me your menu", "Can I get the price list?", "Send the enrollment form"
 *
 * Files are stored as base64 data URLs in localStorage.
 * Works for any business: menus, forms, brochures, price lists, etc.
 */

import { MediaFile } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'shepherd_media_library';

export const getMediaFiles = (): MediaFile[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveMediaFiles = (files: MediaFile[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {
    console.error('[MediaLibrary] Failed to save — localStorage may be full');
  }
};

export const addMediaFile = (data: {
  name: string;
  type: MediaFile['type'];
  mimeType: string;
  url: string;
  fileName: string;
  description?: string;
}): MediaFile => {
  const file: MediaFile = {
    id: uuidv4(),
    ...data,
    uploadDate: new Date().toISOString(),
  };

  const files = getMediaFiles();
  files.unshift(file);
  saveMediaFiles(files);
  return file;
};

export const removeMediaFile = (fileId: string): void => {
  const files = getMediaFiles().filter(f => f.id !== fileId);
  saveMediaFiles(files);
};

export const updateMediaFile = (fileId: string, updates: Partial<Pick<MediaFile, 'name' | 'description'>>): void => {
  const files = getMediaFiles().map(f => f.id === fileId ? { ...f, ...updates } : f);
  saveMediaFiles(files);
};

/**
 * Find a media file by name (fuzzy match).
 * Used by the AI agent to locate files by their descriptive names.
 */
export const findFileByName = (name: string): MediaFile | null => {
  const files = getMediaFiles();
  const nameLower = name.toLowerCase();

  // Exact match first
  const exact = files.find(f => f.name.toLowerCase() === nameLower);
  if (exact) return exact;

  // Partial match
  const partial = files.find(f =>
    f.name.toLowerCase().includes(nameLower) || nameLower.includes(f.name.toLowerCase())
  );
  return partial || null;
};

/**
 * Read a File object and return a MediaFile entry.
 * Converts file to base64 data URL.
 */
export const readFileAsMediaFile = (
  file: File,
  name: string,
  description?: string
): Promise<MediaFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const type: MediaFile['type'] = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : 'document';

      const media = addMediaFile({
        name: name || file.name.replace(/\.[^/.]+$/, ''),
        type,
        mimeType: file.type,
        url,
        fileName: file.name,
        description,
      });
      resolve(media);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
