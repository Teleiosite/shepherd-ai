import React, { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, ExternalLink, Sparkles, Sliders, Smartphone, Monitor, ShieldCheck, Zap } from 'lucide-react';
import { BACKEND_URL } from '../services/env';

export default function WidgetConfigurator() {
  const [copied, setCopied] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#0d9488');
  const [aiName, setAiName] = useState('Live Concierge');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I assist you today? Ask about cars, availability, or bookings.');
  const [position, setPosition] = useState('bottom-right');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Read organization id from localStorage or auth token
  const orgId = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.organization_id || user.organizationId || '';
    } catch {
      return '';
    }
  })();

  const widgetScriptUrl = 'https://shepherd-ai.vercel.app/widget.js';
  const embedCode = `<!-- Shepherd AI Live Concierge Widget (Paste before </body>) -->\n<script\n  src="${widgetScriptUrl}"\n  data-org-id="${orgId || 'YOUR_ORGANIZATION_ID'}"\n  data-color="${primaryColor}"\n  defer>\n</script>`;

  const colorPresets = [
    { label: 'Emerald Teal', value: '#0d9488' },
    { label: 'Royal Blue', value: '#2563eb' },
    { label: 'Vibrant Violet', value: '#7c3aed' },
    { label: 'Sunset Orange', value: '#ea580c' },
    { label: 'Luxury Black', value: '#0f172a' }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${BACKEND_URL}/api/settings/ai-config`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            widget_primary_color: primaryColor,
            widget_welcome_message: welcomeMessage,
            widget_position: position
          })
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save widget config error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2.5">
            <MessageSquare className="text-teal-600" />
            Website Chat Widget
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-1">
            Embed an autonomous AI concierge directly into your website. Zero Meta setup required.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <ShieldCheck size={14} /> Zero Meta Approvals
          </span>
          <span className="bg-teal-100 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Zap size={14} /> Instant Embed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Embed Script */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Sparkles size={18} className="text-teal-600" />
                1-Click Embed Snippet
              </h3>
              <button
                onClick={handleCopy}
                className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied Code!' : 'Copy Code'}
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Copy and paste this script tag right before the closing <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-xs">&lt;/body&gt;</code> tag of your website HTML or React/Next.js/WordPress layout.
            </p>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed select-all">
                {embedCode}
              </pre>
            </div>
          </div>

          {/* Card: Appearance & Branding */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Sliders size={18} className="text-slate-700" />
              Custom Branding & Style
            </h3>

            {/* Accent Color */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Accent Brand Color</label>
              <div className="flex flex-wrap items-center gap-3">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setPrimaryColor(preset.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      primaryColor === preset.value
                        ? 'border-slate-800 bg-slate-50 shadow-xs ring-2 ring-slate-800'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.value }} />
                    {preset.label}
                  </button>
                ))}
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-white">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-6 h-6 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-600">{primaryColor}</span>
                </div>
              </div>
            </div>

            {/* AI Assistant Title */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Assistant Title</label>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder="e.g. Rentigram Concierge, Clinic Assistant"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Welcome Greeting */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Initial Welcome Greeting</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={2}
                placeholder="Message that displays when a visitor opens the chat"
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Screen Position</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPosition('bottom-right')}
                  className={`py-2 px-4 rounded-lg text-xs font-bold border transition-all ${
                    position === 'bottom-right'
                      ? 'border-teal-500 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Bottom Right (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('bottom-left')}
                  className={`py-2 px-4 rounded-lg text-xs font-bold border transition-all ${
                    position === 'bottom-left'
                      ? 'border-teal-500 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Bottom Left
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-98 text-sm flex items-center justify-center gap-2"
            >
              {isSaving ? 'Saving...' : saved ? '✓ Saved Successfully!' : 'Save Branding Preferences'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Interactive Widget Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-400">
                <Monitor size={14} /> Live Interactive Preview
              </span>
              <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">Simulating Website</span>
            </div>

            {/* Mock Web Page Frame */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 shadow-sm h-[580px] relative overflow-hidden flex flex-col justify-end">
              {/* Mock website background content */}
              <div className="absolute inset-x-0 top-0 p-5 space-y-3 opacity-30 pointer-events-none">
                <div className="h-4 bg-slate-300 rounded w-1/3" />
                <div className="h-3 bg-slate-300 rounded w-2/3" />
                <div className="h-24 bg-slate-200 rounded-xl w-full mt-4" />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="h-16 bg-slate-200 rounded-lg" />
                  <div className="h-16 bg-slate-200 rounded-lg" />
                </div>
              </div>

              {/* Mock Chat Box */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[460px] z-10">
                {/* Header */}
                <div className="p-4 text-white flex justify-between items-center shrink-0" style={{ backgroundColor: primaryColor }}>
                  <div>
                    <div className="font-bold text-sm leading-tight">{aiName}</div>
                    <div className="text-[11px] opacity-85">Powered by Shepherd AI</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400 ring-4 ring-white/20 animate-pulse" />
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-slate-50">
                  {/* Bot Welcome */}
                  <div className="bg-white p-3 rounded-xl rounded-bl-xs border border-slate-200 shadow-2xs max-w-[85%] text-slate-800">
                    {welcomeMessage}
                  </div>

                  {/* Simulated Customer query */}
                  <div className="p-3 rounded-xl rounded-br-xs text-white ml-auto max-w-[85%]" style={{ backgroundColor: primaryColor }}>
                    I need a black BMW for the weekend in Lagos, self drive.
                  </div>

                  {/* Bot Reply + Card */}
                  <div className="bg-white p-3 rounded-xl rounded-bl-xs border border-slate-200 shadow-2xs space-y-2.5 max-w-[90%] text-slate-800">
                    <p>I found matching vehicles available for your weekend in Lagos:</p>

                    {/* Rich Vehicle Card Sample */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      <div className="h-24 bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold relative overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80"
                          alt="BMW"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                        />
                      </div>
                      <div className="p-2.5 space-y-1">
                        <div className="font-bold text-slate-900 text-xs">2022 BMW 530i M-Sport</div>
                        <div className="text-xs font-bold" style={{ color: primaryColor }}>₦120,000 / day</div>
                        <div className="flex gap-1 flex-wrap text-[10px] text-slate-500">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">Self-Drive</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">Lagos</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">Automatic</span>
                        </div>
                        <button
                          type="button"
                          className="w-full mt-1.5 py-1.5 text-center text-white text-[11px] font-bold rounded-lg transition-opacity hover:opacity-90 block"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Book / View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Bar */}
                <div className="p-2.5 bg-white border-t border-slate-200 flex gap-2 items-center shrink-0">
                  <input
                    type="text"
                    disabled
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-100 border-0 rounded-full px-3.5 py-1.5 text-xs text-slate-500 outline-none"
                  />
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                    ➤
                  </div>
                </div>
              </div>

              {/* Floating trigger button preview */}
              <div
                className={`absolute bottom-3 ${position === 'bottom-left' ? 'left-3' : 'right-3'} w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white pointer-events-none`}
                style={{ backgroundColor: primaryColor }}
              >
                <MessageSquare size={22} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
