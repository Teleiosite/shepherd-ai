import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, FileSpreadsheet, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { storage } from '../services/storage';

interface WorkflowStep {
    id: string;
    category: string;
    day: number;
    title: string;
    prompt: string;
}

interface WorkflowGroup {
    category: string;
    steps: WorkflowStep[];
}

const WorkflowsManager: React.FC = () => {
    const [workflows, setWorkflows] = useState<WorkflowGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [replaceExisting, setReplaceExisting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        setLoading(true);
        try {
            const steps = await storage.getWorkflowSteps();

            // Group by category
            const grouped = steps.reduce((acc: any, step: WorkflowStep) => {
                if (!acc[step.category]) {
                    acc[step.category] = [];
                }
                acc[step.category].push(step);
                return acc;
            }, {});

            const workflowGroups = Object.entries(grouped).map(([category, steps]: any) => ({
                category,
                steps: steps.sort((a: WorkflowStep, b: WorkflowStep) => a.day - b.day)
            }));

            setWorkflows(workflowGroups);
        } catch (error) {
            console.error('Failed to load workflows:', error);
        }
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedCategory) return;

        setUploading(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await storage.uploadWorkflowExcel(selectedCategory, formData, replaceExisting);

            setUploadResult(result);

            if (result.success) {
                await loadWorkflows();
                setSelectedCategory('');
                setReplaceExisting(false);
            }
        } catch (error: any) {
            setUploadResult({
                success: false,
                message: error.response?.data?.detail || 'Upload failed'
            });
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const downloadTemplate = () => {
        // Create sample Excel data
        const csvContent = `Day,Title,Goal
0,Welcome Message,Send warm welcome and introduction
1,First Check-in,Ask how they're doing and settling in
3,Share Resource,Send helpful resource or information
7,Weekly Update,Share what's happening this week
14,Two-Week Milestone,Celebrate two weeks together
30,Monthly Check-in,Review progress and next steps`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workflow_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const deleteWorkflow = async (category: string) => {
        if (!confirm(`Delete all steps for "${category}"?`)) return;

        try {
            await storage.deleteWorkflowCategory(category);
            await loadWorkflows();
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-purple-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Custom Workflows</h2>
                <button
                    onClick={downloadTemplate}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium"
                >
                    <Download size={18} />
                    Download Template
                </button>
            </div>

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Upload className="text-purple-500" size={20} />
                    Upload Workflow
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Category Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., New Convert, Customer Journey, Youth Track"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            This will be used to assign the workflow to contacts
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            id="replace-existing"
                            type="checkbox"
                            checked={replaceExisting}
                            onChange={(e) => setReplaceExisting(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="replace-existing" className="text-sm text-slate-700">
                            Replace existing workflow for this category
                        </label>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileSpreadsheet className="text-purple-600 mb-3" size={40} />
                        <p className="text-base text-slate-600 mb-1">Click to upload Excel file (.xlsx or .csv)</p>
                        <p className="text-xs text-slate-400">Format: Day, Title, Goal</p>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            disabled={!selectedCategory || uploading}
                        />
                    </div>

                    {uploading && (
                        <div className="flex items-center gap-2 text-purple-600">
                            <Loader className="animate-spin" size={18} />
                            <span className="text-sm font-medium">Uploading workflow...</span>
                        </div>
                    )}

                    {uploadResult && (
                        <div className={`flex items-start gap-2 p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            {uploadResult.success ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                            <div className="flex-1">
                                <p className="font-medium">{uploadResult.message}</p>
                                {uploadResult.created > 0 && (
                                    <p className="text-sm mt-1">✅ Created {uploadResult.created} steps</p>
                                )}
                                {uploadResult.skipped > 0 && (
                                    <p className="text-sm mt-1">⚠️ Skipped {uploadResult.skipped} duplicate steps</p>
                                )}
                                {uploadResult.errors && uploadResult.errors.length > 0 && (
                                    <details className="text-sm mt-2">
                                        <summary className="cursor-pointer font-medium">View errors ({uploadResult.errors.length})</summary>
                                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                                            {uploadResult.errors.slice(0, 5).map((err: string, idx: number) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                            {uploadResult.errors.length > 5 && <li>...and {uploadResult.errors.length - 5} more</li>}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Workflows List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Your Workflows ({workflows.length})</h3>

                {workflows.length === 0 ? (
                    <div className="bg-slate-50 p-8 rounded-xl text-center">
                        <FileSpreadsheet className="mx-auto text-slate-400 mb-3" size={48} />
                        <p className="text-slate-600 font-medium">No workflows yet</p>
                        <p className="text-sm text-slate-500 mt-1">Upload an Excel file to create your first workflow</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {workflows.map((workflow) => (
                            <div key={workflow.category} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-800">{workflow.category}</h4>
                                        <p className="text-sm text-slate-500">{workflow.steps.length} steps</p>
                                    </div>
                                    <button
                                        onClick={() => deleteWorkflow(workflow.category)}
                                        className="text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {workflow.steps.map((step) => (
                                        <div key={step.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                            <div className="flex-shrink-0 w-16 text-center">
                                                <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">
                                                    Day {step.day}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{step.title}</p>
                                                {step.prompt && (
                                                    <p className="text-sm text-slate-600 mt-1">{step.prompt}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkflowsManager;
