import React from 'react';
import { X, Download, Cloud, CheckCircle, XCircle } from 'lucide-react';

interface BridgeOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionCode: string;
}

const BridgeOptionsModal: React.FC<BridgeOptionsModalProps> = ({ isOpen, onClose, connectionCode }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-2xl font-bold text-slate-800">Choose Your WhatsApp Bridge</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid md:grid-cols-2 gap-6">
                    {/* Desktop Bridge */}
                    <div className="border-2 border-purple-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                <Download className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Desktop Bridge</h3>
                                <p className="text-sm text-slate-500">Windows Application</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">100% Free forever</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">Easy setup (download & run)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">No technical knowledge needed</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <XCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">Requires Windows PC to be running</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <XCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">Not accessible from mobile</span>
                            </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg mb-4">
                            <p className="text-xs text-slate-600 font-medium mb-2">📝 Quick Setup:</p>
                            <ol className="text-xs text-slate-600 space-y-1 ml-4 list-decimal">
                                <li>Download ZIP file</li>
                                <li>Extract and run .exe</li>
                                <li>Paste your connection code</li>
                                <li>Scan QR with WhatsApp</li>
                            </ol>
                        </div>

                        <button
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                            onClick={() => window.location.href = 'https://github.com/Teleiosite/shepherd-ai/releases/download/v1.0.1/Shepherd-AI-Bridge.zip'}
                        >
                            <Download size={20} />
                            Download for Windows
                        </button>
                    </div>

                    {/* Cloud Bridge */}
                    <div className="border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-teal-50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Cloud className="text-green-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Cloud Bridge</h3>
                                <p className="text-sm text-slate-500">Hosted on Render</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">Runs 24/7 automatically</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">No PC needed</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">Mobile-friendly</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">Free tier: 750 hours/month</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <XCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-700">Requires Render account (free)</span>
                            </div>
                        </div>

                        <div className="bg-green-100 border border-green-300 p-4 rounded-lg mb-4">
                            <p className="text-xs text-slate-700 font-medium mb-2">🚀 Your Connection Code:</p>
                            <code className="block bg-white p-2 rounded text-xs font-mono border break-all">
                                {connectionCode || 'Generate code first!'}
                            </code>
                        </div>

                        <div className="bg-white p-4 rounded-lg mb-4 border border-green-200">
                            <p className="text-xs text-slate-600 font-medium mb-2">📝 Quick Deploy:</p>
                            <ol className="text-xs text-slate-600 space-y-1 ml-4 list-decimal">
                                <li>Click "Deploy to Render"</li>
                                <li>Paste your connection code above</li>
                                <li>Wait 3 minutes for deployment</li>
                                <li>Check logs, scan QR code</li>
                            </ol>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm"
                                onClick={() => window.open('https://render.com/deploy?repo=https://github.com/Teleiosite/shepherd-ai', '_blank')}
                            >
                                🚀 Deploy Now
                            </button>
                            <button
                                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm"
                                onClick={() => window.open('https://github.com/Teleiosite/shepherd-ai/tree/main/shepherd-cloud-bridge', '_blank')}
                            >
                                📖 View Guide
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                    <p className="text-sm text-slate-600 text-center">
                        💡 <strong>Tip:</strong> Desktop bridge is easier for beginners. Cloud bridge is better for teams and mobile access.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BridgeOptionsModal;
