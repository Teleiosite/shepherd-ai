import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Search, Trash2, Globe, Server, Check, AlertCircle, ExternalLink, RefreshCw, DollarSign, Image, Tag, Zap, Upload, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BACKEND_URL } from '../services/env';

interface CatalogItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  price_amount?: number;
  price_currency?: string;
  price_unit?: string;
  image_url?: string;
  action_url?: string;
  attributes?: Record<string, any>;
  is_available: boolean;
}

export default function CatalogManager() {
  const [mode, setMode] = useState<'internal' | 'external_webhook'>('internal');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Bulk Excel/CSV Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStoreUrl, setSyncStoreUrl] = useState('');
  const [clearExistingOnSync, setClearExistingOnSync] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; success: number; sheetName?: string } | null>(null);
  const [isSyncingWc, setIsSyncingWc] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // External Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // New Item State
  const [newItem, setNewItem] = useState({
    title: '',
    category: 'Vehicle',
    price_amount: '',
    price_currency: 'NGN',
    price_unit: 'per day',
    image_url: '',
    action_url: '',
    description: '',
    tag1: '',
    tag2: '',
    tag3: ''
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/catalog/?search=${encodeURIComponent(searchTerm)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch catalog items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchTerm]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const attributes: Record<string, string> = {};
      if (newItem.tag1) attributes.feature1 = newItem.tag1;
      if (newItem.tag2) attributes.feature2 = newItem.tag2;
      if (newItem.tag3) attributes.feature3 = newItem.tag3;

      const res = await fetch(`${BACKEND_URL}/api/catalog/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newItem.title,
          category: newItem.category,
          price_amount: parseFloat(newItem.price_amount) || 0,
          price_currency: newItem.price_currency,
          price_unit: newItem.price_unit,
          image_url: newItem.image_url,
          action_url: newItem.action_url,
          description: newItem.description,
          attributes
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewItem({
          title: '',
          category: 'Vehicle',
          price_amount: '',
          price_currency: 'NGN',
          price_unit: 'per day',
          image_url: '',
          action_url: '',
          description: '',
          tag1: '',
          tag2: '',
          tag3: ''
        });
        fetchItems();
      }
    } catch (err) {
      console.error('Add item error:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Delete this item from catalog?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${BACKEND_URL}/api/catalog/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchItems();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStats(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Smart Sheet Selection:
        // Prioritize sheets named 'Cleaned Products', 'Products', 'Catalog', 'Inventory', 'Offerings'
        let chosenSheetName = wb.SheetNames[0];
        if (wb.SheetNames.length > 1) {
          const matchSheet = wb.SheetNames.find(name => 
            /clean|product|catalog|inventory|item|offering/i.test(name)
          );
          if (matchSheet) {
            chosenSheetName = matchSheet;
          }
        }

        const ws = wb.Sheets[chosenSheetName];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

        const parsedItems: any[] = [];

        data.forEach((row) => {
          const normalized: Record<string, any> = {};
          const compact: Record<string, any> = {};

          Object.keys(row).forEach((k) => {
            const cleanKey = k.replace(/^\ufeff/, '').trim().toLowerCase().replace(/[\r\n\t_]+/g, ' ').replace(/\s+/g, ' ');
            normalized[cleanKey] = row[k];
            compact[cleanKey.replace(/[^a-z0-9]/g, '')] = row[k];
          });

          const title =
            compact['title'] ||
            compact['name'] ||
            compact['productname'] ||
            compact['item'] ||
            compact['product'] ||
            compact['posttitle'] ||
            normalized['title'] ||
            normalized['name'] ||
            normalized['product name'];

          if (!title) return;

          const category =
            compact['category'] ||
            compact['categories'] ||
            compact['type'] ||
            normalized['category'] ||
            normalized['categories'] ||
            'Gadgets';

          const priceRaw =
            compact['saleprice'] ||
            compact['regularprice'] ||
            compact['price'] ||
            compact['priceamount'] ||
            compact['amount'] ||
            compact['rate'] ||
            normalized['sale price'] ||
            normalized['regular price'] ||
            normalized['price'] ||
            0;

          let price_amount = 0;
          if (typeof priceRaw === 'number') {
            price_amount = priceRaw;
          } else if (priceRaw) {
            const cleanStr = String(priceRaw).replace(/[^0-9.]/g, '');
            price_amount = parseFloat(cleanStr) || 0;
          }

          const price_unit = compact['unit'] || compact['priceunit'] || normalized['unit'] || 'each';

          let image_url =
            compact['imageurl'] ||
            compact['images'] ||
            compact['image'] ||
            compact['photo'] ||
            compact['photourl'] ||
            compact['picture'] ||
            normalized['image url'] ||
            normalized['images'] ||
            normalized['image'] ||
            '';

          if (typeof image_url === 'string') {
            image_url = image_url.split(/[,|\n]/)[0].trim();
          }

          let action_url =
            compact['bookinglink'] ||
            compact['actionurl'] ||
            compact['permalink'] ||
            compact['producturl'] ||
            compact['url'] ||
            compact['link'] ||
            normalized['booking link'] ||
            normalized['action url'] ||
            '';

          if (!action_url && title) {
            action_url = `https://decehub.com/?s=${encodeURIComponent(String(title).trim())}`;
          }

          const description =
            compact['shortdescription'] ||
            compact['description'] ||
            compact['postcontent'] ||
            compact['postexcerpt'] ||
            compact['details'] ||
            normalized['short description'] ||
            normalized['description'] ||
            '';

          const attributes: Record<string, any> = {};
          const tags = compact['tags'] || compact['features'] || compact['specs'] || normalized['tags'] || '';
          if (tags) {
            String(tags).split(/[,;|]/).map(t => t.trim()).filter(Boolean).forEach((tag, idx) => {
              attributes[`feature_${idx + 1}`] = tag;
            });
          }

          parsedItems.push({
            title: String(title).trim(),
            category: String(category).trim(),
            price_amount,
            price_currency: 'NGN',
            price_unit: String(price_unit).trim(),
            image_url: String(image_url).trim() || null,
            action_url: String(action_url).trim() || null,
            description: String(description).trim() || null,
            attributes
          });
        });

        if (parsedItems.length === 0) {
          alert('No valid items found in file. Please ensure at least a "Title" or "Name" column exists.');
          setIsUploading(false);
          return;
        }

        const token = localStorage.getItem('authToken');
        const res = await fetch(`${BACKEND_URL}/api/catalog/bulk`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items: parsedItems })
        });

        if (res.ok) {
          const resData = await res.json();
          setUploadStats({ total: data.length, success: resData.created_count || parsedItems.length, sheetName: chosenSheetName });
          fetchItems();
          setTimeout(() => {
            setShowUploadModal(false);
            setUploadStats(null);
          }, 2500);
        } else {
          alert('Upload failed. Please check your file format and try again.');
        }
      } catch (err: any) {
        console.error('File parsing error:', err);
        alert('Could not read file: ' + err.message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSyncWooCommerce = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const storeUrl = (syncStoreUrl || '').trim();
    if (!storeUrl) {
      alert('Please enter your online store URL (e.g. https://yourstore.com)');
      return;
    }

    setIsSyncingWc(true);
    setSyncMessage(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/catalog/sync-woocommerce`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ store_url: storeUrl, clear_existing: clearExistingOnSync })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage(`Successfully synced ${data.synced_count} products directly from ${data.store_url}!`);
        setShowSyncModal(false);
        fetchItems();
        setTimeout(() => setSyncMessage(null), 7000);
      } else {
        alert(data.detail || 'Could not sync from store. Please verify that the website has WooCommerce enabled and REST API accessible.');
      }
    } catch (err: any) {
      alert('Error syncing store: ' + err.message);
    } finally {
      setIsSyncingWc(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        Title: '2023 Mercedes G-Wagon G63',
        Category: 'Luxury SUV',
        Price: 250000,
        Unit: 'per day',
        'Image URL': 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
        'Booking Link': 'https://rentigram.com/book/gwagon-2023',
        Description: 'AMG performance V8, self-drive or chauffeur driven, black leather interior.',
        Tags: 'Self-Drive, Ikeja, Automatic, V8'
      },
      {
        Title: '2022 BMW 530i M-Sport',
        Category: 'Executive Sedan',
        Price: 120000,
        Unit: 'per day',
        'Image URL': 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
        'Booking Link': 'https://rentigram.com/book/bmw-530i',
        Description: 'Grey executive sedan, sunroof, ambient lighting, fuel efficient.',
        Tags: 'Self-Drive, Lagos, Sedan, Automatic'
      },
      {
        Title: '2-Bedroom Luxury Shortlet Apartment',
        Category: 'Shortlet',
        Price: 85000,
        Unit: 'per night',
        'Image URL': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
        'Booking Link': 'https://yourdomain.com/book/lekki-apt',
        Description: '24/7 power, swimming pool, superfast WiFi, ocean view balcony.',
        Tags: 'Lekki Phase 1, Swimming Pool, WiFi, 24/7 Power'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CatalogTemplate');
    XLSX.writeFile(wb, 'shepherd_catalog_template.xlsx');
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setIsTestingWebhook(true);
    setWebhookTestResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/catalog/test-webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          query: 'BMW',
          location: 'Lagos'
        })
      });

      const data = await res.json();
      setWebhookTestResult(data);
    } catch (err: any) {
      setWebhookTestResult({ success: false, error: err.message || 'Connection failed' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2.5">
            <Package className="text-teal-600" />
            Catalog & Inventory
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-1">
            Manage the products, rental cars, properties, or services your AI concierge searches and recommends.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
          <button
            onClick={() => setMode('internal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'internal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Built-in Catalog
          </button>
          <button
            onClick={() => setMode('external_webhook')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === 'external_webhook'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe size={14} className="text-teal-600" />
            External API Webhook
          </button>
        </div>
      </div>

      {/* Mode 1: External Webhook (For platforms like Rentigram) */}
      {mode === 'external_webhook' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
              <Server size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">External Inventory API Webhook</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Connect your existing database or API (e.g. Rentigram fleet API). Whenever a user asks for an item, Shepherd AI will query this endpoint with extracted parameters and render your live results.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Inventory Search Endpoint URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.yourdomain.com/v1/search"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Accepts POST requests with JSON payload: <code>&#123; query, category, location, max_budget, attributes &#125;</code></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Secret Key / Bearer Token (Optional)</label>
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Passed as X-Shepherd-Secret header"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Used to verify requests coming from Shepherd AI.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={isTestingWebhook || !webhookUrl}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isTestingWebhook ? 'animate-spin' : ''} />
              {isTestingWebhook ? 'Testing Connection...' : 'Test Webhook Endpoint'}
            </button>
          </div>

          {/* Webhook Test Output */}
          {webhookTestResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${webhookTestResult.success ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
              <div className="font-bold flex items-center gap-1.5">
                {webhookTestResult.success ? <Check size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-600" />}
                {webhookTestResult.success ? `Connected! Returned ${webhookTestResult.items_count} items (HTTP ${webhookTestResult.status_code})` : 'Connection Test Failed'}
              </div>
              <pre className="bg-white/80 p-3 rounded-lg overflow-x-auto text-[11px] font-mono">
                {JSON.stringify(webhookTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Built-in Catalog (For non-tech businesses) */}
      {mode === 'internal' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products, cars, services..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => setShowSyncModal(true)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95"
              >
                <Globe size={16} className="text-purple-600" />
                <span>Sync Online Store</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95"
              >
                <Upload size={16} className="text-teal-600" />
                <span>Upload Excel / CSV</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95"
              >
                <Plus size={18} />
                <span>Add Catalog Item</span>
              </button>
            </div>
          </div>

          {/* Sync Success Message */}
          {syncMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
              <Check size={16} className="text-green-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Items Grid */}
          {items.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 space-y-4 shadow-sm">
              <Package size={48} className="mx-auto text-slate-300 stroke-[1.5]" />
              <div>
                <div className="font-bold text-slate-700 text-base">Your Catalog is Empty</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Add the products, cars, properties, or services you offer. The AI will recommend them dynamically whenever customers inquire!
                </p>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-3 pt-1">
                <button
                  onClick={handleSyncWooCommerce}
                  disabled={isSyncingWc}
                  className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Globe size={15} className="text-purple-600" />
                  Sync from decehub.com
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <FileSpreadsheet size={15} className="text-teal-600" />
                  Upload Excel or CSV
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  Add Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  {item.image_url ? (
                    <div className="h-44 bg-slate-100 overflow-hidden relative">
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://decehub.com/wp-content/uploads/2024/07/cropped-PHEMpion-9-1-180x180.png';
                        }}
                      />
                      <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                        {item.category}
                      </span>
                    </div>
                  ) : (
                    <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-300">
                      <Image size={32} />
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{item.title}</h4>
                      {item.price_amount ? (
                        <div className="text-teal-600 font-bold text-sm mt-0.5">
                          {item.price_currency || 'NGN'} {item.price_amount.toLocaleString()} {item.price_unit ? `(${item.price_unit})` : ''}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-xs mt-0.5 font-medium">Contact for pricing</div>
                      )}
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                      {item.action_url ? (
                        <a href={item.action_url} target="_blank" rel="noopener" className="text-teal-600 font-bold flex items-center gap-1 hover:underline">
                          View / Buy <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No direct link</span>
                      )}

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete item"
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
      )}

      {/* Modal: Add Catalog Item */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-lg">Add New Catalog Offering</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item / Offering Title *</label>
                <input
                  type="text"
                  required
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g. 2023 Mercedes G-Wagon, 2-Bed Lekki Shortlet, Dental Cleaning"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="e.g. Luxury SUV, Shortlet, Medical"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Amount (NGN)</label>
                  <input
                    type="number"
                    value={newItem.price_amount}
                    onChange={(e) => setNewItem({ ...newItem, price_amount: e.target.value })}
                    placeholder="e.g. 150000"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Unit</label>
                  <input
                    type="text"
                    value={newItem.price_unit}
                    onChange={(e) => setNewItem({ ...newItem, price_unit: e.target.value })}
                    placeholder="per day, per night, per session"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Direct Booking / Checkout URL</label>
                  <input
                    type="url"
                    value={newItem.action_url}
                    onChange={(e) => setNewItem({ ...newItem, action_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo / Image URL</label>
                <input
                  type="url"
                  value={newItem.image_url}
                  onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Key Feature Tags (Optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newItem.tag1}
                    onChange={(e) => setNewItem({ ...newItem, tag1: e.target.value })}
                    placeholder="e.g. Self-Drive"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={newItem.tag2}
                    onChange={(e) => setNewItem({ ...newItem, tag2: e.target.value })}
                    placeholder="e.g. Ikeja, Lagos"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={newItem.tag3}
                    onChange={(e) => setNewItem({ ...newItem, tag3: e.target.value })}
                    placeholder="e.g. Automatic"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Brief Description</label>
                <textarea
                  rows={2}
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Describe key specs or features..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors shadow-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Excel / CSV */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Upload Catalog (Excel / CSV)</h3>
                  <p className="text-xs text-slate-500">Bulk import products, cars, or offerings in seconds</p>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            {/* Template Download Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 text-xs">Need a pre-made template?</div>
                <div className="text-[11px] text-slate-500">Download our formatted Excel template with sample car & shortlet rows.</div>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs"
              >
                <Download size={13} />
                <span>Template</span>
              </button>
            </div>

            {/* Drag & Drop / File Select Box */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/70 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-teal-600 mx-auto shadow-xs">
                {isUploading ? (
                  <RefreshCw size={24} className="animate-spin text-teal-600" />
                ) : (
                  <Upload size={24} />
                )}
              </div>

              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {isUploading ? 'Importing and processing items...' : 'Click to select Excel or CSV file'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files
                </p>
              </div>

              {uploadStats && (
                <div className="p-2.5 bg-green-100 text-green-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 animate-fade-in">
                  <Check size={16} /> Successfully imported {uploadStats.success} of {uploadStats.total} items {uploadStats.sheetName ? `from sheet "${uploadStats.sheetName}"` : ''}!
                </div>
              )}
            </div>

            {/* Expected columns helper */}
            <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-700">Supported Columns:</span>
              <p>Title / Name, Category, Price, Unit (e.g. per day), Image URL, Booking Link, Description, Tags</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Universal Online Store Sync */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Sync Online Store</h3>
                  <p className="text-[11px] text-slate-500">WooCommerce, WordPress, or e-commerce catalog</p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleSyncWooCommerce} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Store Website URL *</label>
                <input
                  type="url"
                  required
                  value={syncStoreUrl}
                  onChange={(e) => setSyncStoreUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter your WordPress/WooCommerce site address. The system automatically reads published products, prices, images, and buy links.
                </p>
              </div>

              <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearExistingOnSync}
                    onChange={(e) => setClearExistingOnSync(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-bold text-purple-900 text-xs">Replace existing catalog items</span>
                    <p className="text-[11px] text-purple-700/80">Check this if you want to replace all current items with newly synced store items.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSyncingWc}
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncingWc}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSyncingWc ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />}
                  <span>{isSyncingWc ? 'Syncing Catalog...' : 'Start Sync'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
