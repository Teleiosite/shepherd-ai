
import React, { useRef, useState, useEffect } from 'react';
import { Bot, Building2, Database, Download, Upload, AlertTriangle, Check, Key, MessageCircle, Save, ExternalLink, Cpu, Globe, Settings as SettingsIcon, Zap, Smartphone, Server, RefreshCw, Loader2, HelpCircle, XCircle, Code2, BrainCircuit, Clock, CreditCard, Link2 } from 'lucide-react';
import { storage } from '../services/storage';
import { AIConfig } from '../types';
import { whatsappService, WhatsAppConfig } from '../services/whatsappService';
import BridgeOptionsModal from './BridgeOptionsModal';

interface SettingsProps {
    aiName: string;
    setAiName: (name: string) => void;
    organizationName: string;
    setOrganizationName: (name: string) => void;
    autoRunEnabled: boolean;
    setAutoRunEnabled: (enabled: boolean) => void;
    businessType?: string;
    setBusinessType?: (type: string) => void;
}

const DEFAULT_MODELS = {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o',
    deepseek: 'deepseek-chat',
    groq: 'llama3-70b-8192',
    custom: 'llama3-70b-8192'
};

const Settings: React.FC<SettingsProps> = ({
    aiName, setAiName, organizationName, setOrganizationName,
    autoRunEnabled, setAutoRunEnabled,
    businessType = 'Organization', setBusinessType
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showBridgeModal, setShowBridgeModal] = useState(false);

    // AI Agent settings
    const [agentEnabled, setAgentEnabled] = useState(() => localStorage.getItem('shepherd_agent_enabled') === 'true');
    const [agentMode, setAgentMode] = useState<'suggest' | 'auto-send'>(() => (localStorage.getItem('shepherd_agent_mode') as any) || 'suggest');
    const [agentTone, setAgentTone] = useState(() => localStorage.getItem('shepherd_agent_tone') || 'Warm, professional, and helpful. Use casual WhatsApp-style language.');
    const [agentDelay, setAgentDelay] = useState(() => parseInt(localStorage.getItem('shepherd_agent_delay') || '5', 10));
    const [paymentLink, setPaymentLink] = useState(() => localStorage.getItem('shepherd_payment_link') || '');
    const [voiceReplyMode, setVoiceReplyMode] = useState<'text' | 'match_input' | 'voice'>(() => (localStorage.getItem('shepherd_voice_reply_mode') as any) || 'text');
    const [voiceName, setVoiceName] = useState(() => localStorage.getItem('shepherd_voice_name') || 'en-NG-EzinneNeural');
    const [agentSaved, setAgentSaved] = useState(false);

    // API & Integration State
    const [aiConfig, setAiConfig] = useState<AIConfig>({
        provider: 'gemini',
        apiKey: '',
        model: DEFAULT_MODELS.gemini,
        baseUrl: ''
    });

    const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
        provider: 'meta',
        phoneId: '',
        token: '',
        bridgeUrl: 'http://localhost:3001'
    });

    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [venomStatus, setVenomStatus] = useState<string>('unknown');
    const [pythonStatus, setPythonStatus] = useState<string>('unknown'); // New Python Check
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    // Bridge Connection State
    const [bridgeConnectionCode, setBridgeConnectionCode] = useState<string>('');
    const [bridgeStatus, setBridgeStatus] = useState<boolean>(false);
    const [codeCopied, setCodeCopied] = useState(false);

    useEffect(() => {
        // Load AI Config from local storage first (fallback)
        const storedAiConfig = localStorage.getItem('shepherd_ai_config');
        if (storedAiConfig) {
            setAiConfig(JSON.parse(storedAiConfig));
        } else {
            // Backward compatibility
            const oldGeminiKey = localStorage.getItem('shepherd_google_api_key');
            if (oldGeminiKey) {
                setAiConfig({
                    provider: 'gemini',
                    apiKey: oldGeminiKey,
                    model: DEFAULT_MODELS.gemini
                });
            }
        }

        // Load WhatsApp Config from local storage first (fallback)
        const wa = localStorage.getItem('shepherd_wa_config');
        if (wa) {
            const parsed = JSON.parse(wa);
            setWaConfig({
                provider: parsed.provider || 'meta',
                phoneId: parsed.phoneId || '',
                token: parsed.token || '',
                bridgeUrl: parsed.bridgeUrl || 'http://localhost:3001'
            });
        }

        // Fetch settings from database
        const fetchDbSettings = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) return;

                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

                // 1. Fetch AI Config
                const aiRes = await fetch(`${backendUrl}/api/settings/ai-config`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (aiRes.ok) {
                    const aiData = await aiRes.json();
                    if (aiData.configured) {
                        setAiConfig({
                            provider: aiData.provider,
                            apiKey: aiData.api_key_masked || '',
                            model: aiData.model || DEFAULT_MODELS.gemini,
                            baseUrl: aiData.base_url || ''
                        });
                    }
                }

                // 2. Fetch WhatsApp Meta Config
                const waMetaRes = await fetch(`${backendUrl}/api/settings/whatsapp-meta`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (waMetaRes.ok) {
                    const waData = await waMetaRes.json();
                    if (waData.configured) {
                        setWaConfig(prev => ({
                            ...prev,
                            provider: 'meta',
                            phoneId: waData.phone_number_id || '',
                            token: waData.access_token_masked || ''
                        }));
                    }
                }

                // 3. Fetch Bridge Config
                const bridgeRes = await fetch(`${backendUrl}/api/settings/bridge-config`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (bridgeRes.ok) {
                    const bridgeData = await bridgeRes.json();
                    if (bridgeData.configured) {
                        setWaConfig(prev => ({
                            ...prev,
                            bridgeUrl: bridgeData.bridge_url || 'http://localhost:3001'
                        }));
                    }
                }

                // 4. Fetch AI Autopilot Settings
                const autoRes = await fetch(`${backendUrl}/api/settings/ai-autopilot`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (autoRes.ok) {
                    const autoData = await autoRes.json();
                    setAgentEnabled(autoData.enabled);
                    setAgentMode(autoData.mode || 'auto-send');
                    setAgentDelay(autoData.reply_delay || 5);
                    if (autoData.tone) setAgentTone(autoData.tone);
                    if (autoData.payment_link) setPaymentLink(autoData.payment_link);
                    if (autoData.voice_reply_mode) {
                        setVoiceReplyMode(autoData.voice_reply_mode);
                        localStorage.setItem('shepherd_voice_reply_mode', autoData.voice_reply_mode);
                    }
                    if (autoData.voice_name) {
                        setVoiceName(autoData.voice_name);
                        localStorage.setItem('shepherd_voice_name', autoData.voice_name);
                    }
                    localStorage.setItem('shepherd_agent_enabled', String(autoData.enabled));
                    localStorage.setItem('shepherd_agent_mode', autoData.mode || 'auto-send');
                }
            } catch (err) {
                console.error('Failed to load settings from DB:', err);
            }
        };

        fetchDbSettings();

        // Fetch Bridge Connection Code
        const fetchBridgeCode = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    console.log('❌ No auth token found');
                    return;
                }

                console.log('🔄 Fetching bridge code...');
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
                const response = await fetch(`${backendUrl}/api/bridge/connection-code`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                console.log('📡 Response status:', response.status);
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Bridge code received:', data.code);
                    setBridgeConnectionCode(data.code);
                } else {
                    console.log('❌ Response not OK:', response.status);
                }
            } catch (error) {
                console.error('Failed to fetch bridge code:', error);
            }
        };

        fetchBridgeCode();
    }, []);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value as AIConfig['provider'];
        setAiConfig(prev => ({
            ...prev,
            provider: newProvider,
            model: DEFAULT_MODELS[newProvider] || '',
            baseUrl: newProvider === 'custom' ? prev.baseUrl : ''
        }));
    };

    const handleToggleAutoRun = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        setAutoRunEnabled(newValue);
        localStorage.setItem('shepherd_autorun_enabled', String(newValue));
    };


    const handleSaveIntegrations = async () => {
        setIsSaving(true);
        setIsSaved(false);

        // Save locally first for compatibility
        localStorage.setItem('shepherd_ai_config', JSON.stringify(aiConfig));
        if (aiConfig.provider === 'gemini') {
            localStorage.setItem('shepherd_google_api_key', aiConfig.apiKey);
        }

        localStorage.setItem('shepherd_wa_config', JSON.stringify(waConfig));
        localStorage.setItem('shepherd_autorun_enabled', String(autoRunEnabled));

        // Save to backend database via API
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
                
                // 1. Save AI Config
                await fetch(`${backendUrl}/api/settings/ai-config`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        provider: aiConfig.provider,
                        api_key: aiConfig.apiKey || '',
                        model: aiConfig.model || 'gemini-pro',
                        base_url: aiConfig.baseUrl || null
                    })
                });

                // 2. Save WhatsApp Config
                if (waConfig.provider === 'meta') {
                    await fetch(`${backendUrl}/api/settings/whatsapp-meta`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            phone_number_id: waConfig.phoneId || '',
                            business_account_id: '',
                            access_token: waConfig.token || ''
                        })
                    });
                } else {
                    const bridgeUrlParam = encodeURIComponent(waConfig.bridgeUrl || 'http://localhost:3001');
                    await fetch(`${backendUrl}/api/settings/bridge-config?bridge_url=${bridgeUrlParam}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to save settings to backend:', error);
        }

        setIsSaving(false);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const checkSystemStatus = async () => {
        setIsTesting(true);
        setVenomStatus('unknown');
        setPythonStatus('unknown');
        setErrorMessage(null);

        // 1. Check Node Bridge
        const vStatus = await whatsappService.checkStatus();
        if (vStatus.startsWith('error:')) {
            setVenomStatus('error');
            setErrorMessage(vStatus.replace('error:', '').trim());
        } else {
            setVenomStatus(vStatus);
        }

        // 2. Check Python Backend
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
            const pyRes = await fetch(`${backendUrl}/health`);
            if (pyRes.ok) {
                const pyData = await pyRes.json();
                setPythonStatus('connected');
            } else {
                setPythonStatus('error');
            }
        } catch (e) {
            setPythonStatus('error');
        }

        setIsTesting(false);
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm("WARNING: This will overwrite all your current data with the backup. Are you sure?")) {
            try {
                await storage.restoreBackup(file);
                setRestoreStatus('success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (err) {
                console.error(err);
                setRestoreStatus('error');
            }
        }
        e.target.value = '';
    };

    const handleReset = () => {
        if (window.confirm("DANGER: This will delete ALL contacts, logs, and settings. This cannot be undone. Are you sure?")) {
            if (window.confirm("Are you absolutely double sure?")) {
                storage.factoryReset();
            }
        }
    };

    const renderStatusBadge = (status: string, label: string) => {
        if (status === 'connected') return (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-200 text-sm font-medium">
                <Check size={16} /> {label}: Online
            </div>
        );
        if (status === 'error') return (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-1 rounded-lg border border-red-200 text-sm font-medium">
                <XCircle size={16} /> {label}: Offline
            </div>
        );
        return (
            <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-sm font-medium">
                <Loader2 size={16} className={status === 'unknown' ? '' : 'animate-spin'} /> {label}: {status === 'unknown' ? 'Unknown' : 'Checking...'}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
                <p className="text-slate-500 text-lg mt-1">Configure your system, integrations, and manage data.</p>
            </div>

            {/* Identity Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-xl text-slate-800 flex items-center gap-2">
                        <Bot className="text-primary-600" />
                        Identity & Persona
                    </h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-base font-medium text-slate-700 mb-2">Organization / Business Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-base focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-slate-700 mb-2">AI Assistant Name</label>
                            <input
                                type="text"
                                value={aiName}
                                onChange={(e) => setAiName(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-base font-medium text-slate-700 mb-2">Business / Organization Type</label>
                            <input
                                type="text"
                                value={businessType}
                                onChange={(e) => setBusinessType?.(e.target.value)}
                                placeholder="e.g. Church, Restaurant, Hair Salon, Real Estate, E-commerce"
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <p className="text-xs text-slate-400 mt-1">This helps the AI agent adapt its vocabulary and tone to suit your industry.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Agent Configuration Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-xl text-slate-800 flex items-center gap-2">
                        <BrainCircuit className="text-violet-600" />
                        AI Agent Auto-Reply Settings
                    </h3>
                    {agentSaved && <span className="text-green-600 font-bold flex items-center gap-2 text-sm animate-fade-in"><Check size={18} /> Settings Saved</span>}
                </div>
                <div className="p-8 space-y-6">
                    <div className="flex items-start justify-between gap-4 p-4 bg-violet-50/50 border border-violet-100 rounded-xl">
                        <div className="flex-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={agentEnabled}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            setAgentEnabled(val);
                                            localStorage.setItem('shepherd_agent_enabled', String(val));
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-8 bg-slate-300 rounded-full peer peer-checked:bg-violet-600 transition-colors"></div>
                                    <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6 shadow-sm"></div>
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-800 group-hover:text-slate-900">
                                        {agentEnabled ? 'AI Auto-Reply Enabled' : 'AI Auto-Reply Disabled'}
                                    </span>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Let AI suggest or automatically send replies to incoming WhatsApp messages
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {agentEnabled && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Bot size={16} /> Reply Mode
                                    </label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setAgentMode('suggest')}
                                            className={`flex-1 py-2 text-center rounded-md text-sm font-medium transition-colors ${agentMode === 'suggest' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                        >
                                            Suggest (Review First)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAgentMode('auto-send')}
                                            className={`flex-1 py-2 text-center rounded-md text-sm font-medium transition-colors ${agentMode === 'auto-send' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                        >
                                            Auto-Send Immediately
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {agentMode === 'suggest' 
                                            ? 'AI drafts suggestions for you to review & edit in Live Chats.' 
                                            : 'AI sends responses directly to contacts without waiting.'}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Clock size={16} /> Auto-Send Delay (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={120}
                                        value={agentDelay}
                                        onChange={(e) => setAgentDelay(parseInt(e.target.value, 10) || 0)}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-violet-500 outline-none"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Delay before auto-reply to make responses feel more human.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <MessageCircle size={16} /> AI Tone & Instructions
                                </label>
                                <textarea
                                    rows={4}
                                    value={agentTone}
                                    onChange={(e) => setAgentTone(e.target.value)}
                                    placeholder="Describe your tone. E.g. Warm and friendly, casual Nigerian pastor tone, or professional client success manager tone."
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-violet-500 outline-none leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Link2 size={16} /> Payment Link URL
                                </label>
                                <input
                                    type="text"
                                    value={paymentLink}
                                    onChange={(e) => setPaymentLink(e.target.value)}
                                    placeholder="https://paystack.com/pay/your-link"
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                                <p className="text-xs text-slate-400 mt-1">AI will automatically paste this link when contacts ask how to pay, give, or buy.</p>
                            </div>

                            {/* Voice Note Response Mode */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                                        <Volume2 size={16} className="text-violet-600" /> Voice Note Response Mode
                                        <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">100% Free</span>
                                    </label>
                                    <p className="text-xs text-slate-500 mb-3">Choose whether the AI replies with text or spoken audio voice notes.</p>
                                    <select
                                        value={voiceReplyMode}
                                        onChange={(e) => setVoiceReplyMode(e.target.value as any)}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                                    >
                                        <option value="text">💬 Text Only (Default — AI always replies with text)</option>
                                        <option value="match_input">🎙️ Match Customer (Reply in voice when customer sends a voice note, text otherwise)</option>
                                        <option value="voice">🔊 Always Voice Note (AI always sends spoken audio voice replies)</option>
                                    </select>
                                </div>

                                {voiceReplyMode !== 'text' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            AI Voice Accent & Style
                                        </label>
                                        <select
                                            value={voiceName}
                                            onChange={(e) => setVoiceName(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                                        >
                                            <option value="en-NG-EzinneNeural">🇳🇬 Nigerian English (Warm Female - Ezinne)</option>
                                            <option value="en-NG-AbeoNeural">🇳🇬 Nigerian English (Warm Male - Abeo)</option>
                                            <option value="en-US-EmmaNeural">🇺🇸 US English (Warm Female - Emma)</option>
                                            <option value="en-US-GuyNeural">🇺🇸 US English (Warm Male - Guy)</option>
                                            <option value="en-GB-SoniaNeural">🇬🇧 British English (Warm Female - Sonia)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <button
                                    onClick={async () => {
                                        localStorage.setItem('shepherd_agent_enabled', String(agentEnabled));
                                        localStorage.setItem('shepherd_agent_mode', agentMode);
                                        localStorage.setItem('shepherd_agent_tone', agentTone);
                                        localStorage.setItem('shepherd_agent_delay', String(agentDelay));
                                        localStorage.setItem('shepherd_payment_link', paymentLink);
                                        localStorage.setItem('shepherd_voice_reply_mode', voiceReplyMode);
                                        localStorage.setItem('shepherd_voice_name', voiceName);

                                        try {
                                            const token = localStorage.getItem('authToken');
                                            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
                                            if (token) {
                                                await fetch(`${backendUrl}/api/settings/ai-autopilot`, {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${token}`
                                                    },
                                                    body: JSON.stringify({
                                                        enabled: agentEnabled,
                                                        mode: agentMode,
                                                        reply_delay: agentDelay,
                                                        tone: agentTone,
                                                        payment_link: paymentLink,
                                                        voice_reply_mode: voiceReplyMode,
                                                        voice_name: voiceName
                                                    })
                                                });
                                            }
                                        } catch (e) {
                                            console.error('Error saving AI autopilot to backend:', e);
                                        }

                                        setAgentSaved(true);
                                        setTimeout(() => setAgentSaved(false), 2000);
                                    }}
                                    className="bg-violet-600 text-white px-6 py-2.5 rounded-lg hover:bg-violet-700 font-bold transition-all shadow-sm active:scale-95"
                                >
                                    Save Agent Settings
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Backend Architecture Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-xl text-slate-800 flex items-center gap-2">
                        <Server className="text-blue-600" />
                        Backend Architecture
                    </h3>
                </div>
                <div className="p-8 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex gap-4">
                            <div>
                                <p className="font-bold text-slate-800 text-sm mb-2">System Status</p>
                                <div className="flex flex-col gap-2">
                                    {renderStatusBadge(pythonStatus, "FastAPI (Python)")}
                                    {renderStatusBadge(venomStatus, "Venom Bridge (Node)")}
                                </div>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                                <p className="font-bold text-slate-800 text-sm mb-2">Ports</p>
                                <p className="text-xs text-slate-500 font-mono">Python API: :8000</p>
                                <p className="text-xs text-slate-500 font-mono">Node Bridge: :3001</p>
                            </div>
                        </div>
                        <button
                            onClick={checkSystemStatus}
                            disabled={isTesting}
                            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isTesting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                            Check Connection
                        </button>
                    </div>

                    {pythonStatus === 'error' && (
                        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg text-sm border border-amber-200">
                            <p className="font-bold mb-1 flex items-center gap-2"><AlertTriangle size={16} /> Python Backend is Offline</p>
                            <p>To enable advanced features (Supabase, Advanced AI), run the Python server:</p>
                            <code className="block bg-amber-100 p-2 rounded mt-2 text-xs">
                                cd backend<br />
                                pip install -r requirements.txt<br />
                                uvicorn main:app --reload --port 8000
                            </code>
                        </div>
                    )}
                </div>
            </div>

            {/* Integrations Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-xl text-slate-800 flex items-center gap-2">
                        <Cpu className="text-purple-600" />
                        AI & WhatsApp Configuration
                    </h3>
                    {isSaved && <span className="text-green-600 font-bold flex items-center gap-2 text-sm animate-fade-in"><Check size={18} /> Saved Successfully</span>}
                </div>

                <div className="p-8 space-y-8">
                    {/* AI Config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1">
                            <label className="block text-base font-bold text-slate-800 mb-2">AI Intelligence Provider</label>
                            <select
                                value={aiConfig.provider}
                                onChange={handleProviderChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                            >
                                <option value="gemini">Google Gemini (Free Tier)</option>
                                <option value="openai">OpenAI (GPT-4 / GPT-3.5)</option>
                                <option value="deepseek">DeepSeek</option>
                                <option value="groq">Groq (Llama 3)</option>
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-base font-bold text-slate-800 mb-2">API Key</label>
                            <input
                                type="password"
                                value={aiConfig.apiKey}
                                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                                placeholder={`Enter ${aiConfig.provider} API Key`}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                            />
                        </div>
                    </div>

                    <hr className="border-slate-100" />


                    {/* Bridge Connection Code */}
                    <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Smartphone className="text-purple-500" size={20} />
                                WhatsApp Bridge Connection
                            </h4>
                            {bridgeStatus && <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">● Connected</span>}
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Your Connection Code:
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={bridgeConnectionCode || 'Loading...'}
                                    readOnly
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-lg font-bold text-center tracking-wider cursor-default"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(bridgeConnectionCode);
                                        setCodeCopied(true);
                                        setTimeout(() => setCodeCopied(false), 2000);
                                    }}
                                    className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all flex items-center gap-2 font-medium"
                                >
                                    {codeCopied ? (
                                        <>
                                            <Check size={20} />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Code2 size={20} />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm text-slate-700 font-medium mb-2">📖 Quick Setup:</p>
                            <ol className="text-sm text-slate-600 space-y-1.5 ml-4 list-decimal leading-relaxed">
                                <li className="break-words">Click <strong>"Download Bridge App"</strong> below</li>
                                <li className="break-words">Extract the ZIP file to a folder</li>
                                <li className="break-words">Run <strong>"Shepherd AI Bridge.exe"</strong></li>
                                <li className="break-words">Copy your code above (click Copy button)</li>
                                <li className="break-words">Paste code in bridge app and click Connect</li>
                                <li className="break-words">Scan WhatsApp QR code with your phone</li>
                                <li className="break-words">Done! Messages auto-send via WhatsApp</li>
                            </ol>
                            <div className="mt-4">
                                <button
                                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-3 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                                    onClick={() => {
                                        window.location.href = 'https://github.com/Teleiosite/shepherd-ai/releases/download/v1.0.1/Shepherd-AI-Bridge.zip';
                                    }}
                                >
                                    <Download size={20} />
                                    <span className="truncate">Download Bridge App (Windows)</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Config */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageCircle className="text-green-500" size={20} /> WhatsApp Delivery Method</h4>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setWaConfig({ ...waConfig, provider: 'meta' })}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${waConfig.provider === 'meta' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    Meta Cloud API
                                </button>
                                <button
                                    onClick={() => setWaConfig({ ...waConfig, provider: 'venom' })}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${waConfig.provider === 'venom' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    WPPConnect Bridge
                                </button>
                            </div>
                        </div>

                        {waConfig.provider === 'meta' ? (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 animate-fade-in">
                                <div className="flex items-start gap-2 mb-2 text-sm text-slate-600">
                                    <AlertTriangle size={16} className="mt-0.5 text-amber-500 shrink-0" />
                                    <p>Use the Official WhatsApp Business API. Requires Facebook Developer Account. <br /><strong>Note:</strong> 24-hour reply window applies.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                                        <input
                                            type="text"
                                            value={waConfig.phoneId || ''}
                                            onChange={(e) => setWaConfig({ ...waConfig, phoneId: e.target.value })}
                                            placeholder="e.g. 10452..."
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-green-500 outline-none font-mono bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Access Token</label>
                                        <input
                                            type="password"
                                            value={waConfig.token || ''}
                                            onChange={(e) => setWaConfig({ ...waConfig, token: e.target.value })}
                                            placeholder="e.g. EAAG..."
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-green-500 outline-none font-mono bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 animate-fade-in">
                                <div className="flex items-start gap-2 mb-2 text-sm text-slate-600">
                                    <Server size={16} className="mt-0.5 text-purple-500 shrink-0" />
                                    <p>Uses <strong>WPPConnect Bridge</strong> running on your local machine. No template restrictions. <br />Download and run the bridge app from the WhatsApp Bridge Connection section above.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bridge Server URL (Advanced)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={waConfig.bridgeUrl || 'http://localhost:3001'}
                                            onChange={(e) => setWaConfig({ ...waConfig, bridgeUrl: e.target.value })}
                                            className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-purple-500 outline-none font-mono bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="border-slate-100" />

                    {/* Smart Workflows Automation */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Zap className="text-orange-500" size={20} />
                                    Smart Workflows Automation
                                </h4>
                                <p className="text-sm text-slate-600 mt-1">
                                    Automatically run daily workflow checks and send messages to due contacts
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={autoRunEnabled}
                                                onChange={handleToggleAutoRun}
                                                className="sr-only peer"
                                            />
                                            <div className="w-14 h-8 bg-slate-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                                            <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6 shadow-sm"></div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-800 group-hover:text-slate-900">
                                                {autoRunEnabled ? 'Automation Enabled' : 'Automation Disabled'}
                                            </span>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {autoRunEnabled
                                                    ? 'System will auto-run workflows once daily when you login'
                                                    : 'You will manually control when to generate and send workflow messages'}
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {autoRunEnabled && (
                                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200 text-sm font-medium shrink-0">
                                        <Zap size={16} fill="currentColor" className="animate-pulse" />
                                        Active
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-200">
                                <div className="flex items-start gap-2 text-sm text-slate-600">
                                    <HelpCircle size={16} className="mt-0.5 shrink-0 text-blue-500" />
                                    <div>
                                        <p className="font-medium text-slate-700">How it works:</p>
                                        <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
                                            <li>Checks all contacts against their journey day (e.g., Day 3, Day 7)</li>
                                            <li>Generates personalized messages using AI and Knowledge Base</li>
                                            <li>Sends messages automatically via WhatsApp Bridge</li>
                                            <li>Runs once per day (on first login of the day)</li>
                                            <li>Skips contacts who already received a message today</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleSaveIntegrations}
                            disabled={isSaving}
                            className="bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 flex items-center gap-2 font-bold transition-all shadow-sm active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Saving...
                                </>
                            ) : isSaved ? (
                                <>
                                    <Check size={20} />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Database & Backup Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-xl text-slate-800 flex items-center gap-2">
                        <Database className="text-blue-600" />
                        Database & Data Management
                    </h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Download size={20} /></div>
                                <h4 className="font-bold text-slate-800">Backup Data</h4>
                            </div>
                            <button onClick={() => storage.downloadBackup()} className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
                                Download Backup (.json)
                            </button>
                        </div>

                        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Upload size={20} /></div>
                                <h4 className="font-bold text-slate-800">Restore Data</h4>
                            </div>
                            <div className="relative">
                                <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleRestore} />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors shadow-sm flex items-center justify-center gap-2">
                                    {restoreStatus === 'success' ? <span className="text-green-600 flex items-center gap-2"><Check size={18} /> Restored! Reloading...</span> : 'Select Backup File'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <h4 className="text-red-600 font-bold flex items-center gap-2 mb-2"><AlertTriangle size={20} /> Danger Zone</h4>
                        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
                            <div>
                                <p className="text-sm text-red-800 font-medium">Factory Reset</p>
                                <p className="text-xs text-red-600">Permanently delete all data.</p>
                            </div>
                            <button onClick={handleReset} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm">Reset All Data</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
