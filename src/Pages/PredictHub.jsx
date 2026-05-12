import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../Components/NavBar";
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Zap, Activity, ShieldAlert, HeartPulse, Droplet } from "lucide-react";

const PredictHub = ({ user, profileData }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const analyzeReport = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:8000/upload_report", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            
            if (data.success) {
                setResult(data);
            } else {
                setError(data.message || "An error occurred while analyzing the report.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to connect to the analysis server. Please ensure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const getModelIcon = (model) => {
        if (model === "heart") return <HeartPulse className="w-5 h-5 text-rose-400" />;
        if (model === "diabetes") return <Droplet className="w-5 h-5 text-sky-400" />;
        if (model === "lung") return <Activity className="w-5 h-5 text-amber-400" />;
        return <ShieldAlert className="w-5 h-5 text-emerald-400" />;
    };

    const getModelName = (model) => {
        if (model === "heart") return "Heart Disease Model";
        if (model === "diabetes") return "Diabetes Model";
        if (model === "lung") return "Lung Cancer Model";
        return "Health Model";
    };

    return (
        <div className="min-h-screen flex flex-col bg-futuristic">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 p-6 md:p-12 relative z-10">
                <div className="max-w-4xl mx-auto space-y-10">

                    {/* Header */}
                    <section className="glass-card p-8 rounded-2xl relative overflow-hidden border-t-4 border-t-neonCyan">
                        <div className="absolute -top-16 -right-16 w-64 h-64 bg-neonCyan/5 blur-3xl rounded-full pointer-events-none" />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-neonCyan/10 border border-neonCyan/30 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-neonCyan" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-neonCyan">Automated AI Pipeline</span>
                                </div>
                                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Smart Report Analyzer</h1>
                                <p className="text-slate-400 max-w-xl">
                                    Upload your medical report (PDF, Image, or Text). Our intelligent system will extract relevant parameters, automatically route it to the appropriate diagnostic model, and generate an instant risk prediction.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Upload Section */}
                    <section className="glass-card p-8 rounded-2xl border border-slate-700/50">
                        <div 
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 ${file ? 'border-neonCyan/50 bg-neonCyan/5' : 'border-slate-600 hover:border-slate-400 hover:bg-slate-800/50'}`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => !loading && fileInputRef.current?.click()}
                            style={{ cursor: loading ? 'default' : 'pointer' }}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                            />
                            
                            {file ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full bg-neonCyan/20 flex items-center justify-center mb-4">
                                        <FileText className="w-8 h-8 text-neonCyan" />
                                    </div>
                                    <p className="text-white font-medium text-lg mb-1">{file.name}</p>
                                    <p className="text-slate-400 text-sm mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError(null); }}
                                        className="text-xs text-rose-400 hover:text-rose-300 uppercase tracking-wider font-bold"
                                        disabled={loading}
                                    >
                                        Remove File
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                        <UploadCloud className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-white font-medium text-lg mb-2">Drag & Drop your report here</p>
                                    <p className="text-slate-400 text-sm mb-6">or click to browse from your device</p>
                                    <div className="px-6 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-300 font-medium">
                                        Supports PDF, PNG, JPG, TXT
                                    </div>
                                </div>
                            )}
                        </div>

                        {file && !result && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={analyzeReport}
                                    disabled={loading}
                                    className={`px-8 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-neonCyan text-slate-900 hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]'}`}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                            Analyzing Report...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5" />
                                            Analyze & Predict
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Error Message */}
                    {error && (
                        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center text-center">
                            <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
                            <h3 className="text-xl font-bold text-rose-400 mb-2">Analysis Failed</h3>
                            <p className="text-slate-300 max-w-lg">{error}</p>
                        </div>
                    )}

                    {/* Results Section */}
                    {result && result.success && (
                        <section className="space-y-6 animate-fadeIn">
                            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                <CheckCircle className="w-7 h-7 text-emerald-400" />
                                Analysis Complete
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Extracted Data */}
                                <div className="glass-card p-6 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Extracted Parameters
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(result.extractedFields || {}).map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                                <span className="text-slate-300 capitalize text-sm">{key.replace(/_/g, " ")}</span>
                                                <span className="font-mono text-neonCyan font-bold">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                                        <p className="text-xs text-slate-500">
                                            Auto-detected model: {getModelName(result.detectedDisease)}
                                        </p>
                                    </div>
                                </div>

                                {/* Next Steps */}
                                <div className="space-y-4">
                                    <div className="glass-card p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none transition-all duration-500 bg-neonCyan/5" />
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                                                    {getModelIcon(result.detectedDisease)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white capitalize">{getModelName(result.detectedDisease)}</h4>
                                                    <p className="text-xs text-slate-400">Confidence Score: {result.confidence}</p>
                                                </div>
                                            </div>
                                            
                                            {!result.readyForPrediction ? (
                                                <div className="mt-4">
                                                    <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 mb-4">
                                                        <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                                                            <AlertTriangle className="w-4 h-4" /> Missing Information
                                                        </h3>
                                                        <p className="text-slate-300 text-sm mb-3">We need a few more details to run the prediction accurately.</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {result.missingFields.map(field => (
                                                                <span key={field} className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs font-bold uppercase tracking-wider">{field.replace(/_/g, " ")}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/predict/${result.detectedDisease}`, { state: { extractedFields: result.extractedFields } })}
                                                        className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                                    >
                                                        Provide Missing Details
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-4">
                                                    <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 mb-4">
                                                        <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4" /> Ready for Prediction
                                                        </h3>
                                                        <p className="text-slate-300 text-sm">All required fields have been successfully extracted from the report.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/predict/${result.detectedDisease}`, { state: { extractedFields: result.extractedFields, autoPredict: true } })}
                                                        className="w-full py-3 rounded-xl bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                                    >
                                                        Proceed to Prediction
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PredictHub;
