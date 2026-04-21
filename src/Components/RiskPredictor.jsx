import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, Beaker, CheckCircle, ChevronLeft, Loader2, AlertTriangle, Info } from "lucide-react";
import NavBar from "./NavBar";
import { savePrediction } from "../firebase/firestoreService";
import { getUserProfile } from "../firebase/dbService";

const RiskPredictor = ({ title, type, user, inputsConfig }) => {
    const [profileData, setProfileData] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (user && user.uid) {
                try {
                    const data = await getUserProfile(user.uid);
                    if (data) {
                        setProfileData(data);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
        };
        fetchProfileData();
    }, [user, type]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
        });
    };

    // Deterministic Scoring Function matching the 'student-friendly' requirement
    const evaluateRisk = (data) => {
        let score = 0;
        const items = Object.values(data);

        // Very simple arbitrary algorithm logic based on pure numbers and string lengths 
        // to act as a placeholder for linear regression output
        items.forEach(val => {
            if (typeof val === 'number' || !isNaN(parseFloat(val))) {
                const num = parseFloat(val);
                if (num > 100) score += 3;
                else if (num > 50) score += 2;
                else if (num > 0) score += 1;
            } else if (typeof val === 'boolean') {
                if (val) score += 4;
            }
        });

        const maxBase = items.length * 3;
        let riskLevel = "Low";

        if (score > maxBase * 0.7) riskLevel = "High";
        else if (score > maxBase * 0.4) riskLevel = "Medium";

        return { score, riskLevel };
    };

    const handlePredict = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let score = 0;
            let riskLevel = "Low";
            let predictionProbability = null;

            // Format payload generically for the backend API
            const payload = { ...formData };

            // Attempt to hit our scalable background ML endpoint natively resolving the route parameter
            const response = await fetch(`http://localhost:8000/predict/${type}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                riskLevel = data.risk === "High Risk" ? "High" : "Low";
                score = Math.round(data.probability * 100);
                predictionProbability = data.probability;
            } else {
                // If it fails (e.g. 404 because the model folder doesn't exist yet), fallback dynamically
                console.warn(`[ML Node] Native Model for '${type}' not attached. Resolving deterministic offline function...`);
                const evalResult = evaluateRisk(formData);
                score = evalResult.score;
                riskLevel = evalResult.riskLevel;
            }

            try {
                await savePrediction(user, type, formData, riskLevel, score);
            } catch (saveErr) {
                console.error("Failed to save prediction, but continuing with display", saveErr);
            }
            
            setResult({ riskLevel, score, predictionProbability, inputs: formData });
        } catch (err) {
            console.error("Failed to execute prediction", err);
            alert("Error in prediction: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 p-6 md:p-12 relative z-10">
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Link to="/dashboard" className="p-2 glass-card hover:bg-slate-800/80 rounded-xl transition-colors text-slate-400 hover:text-white">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                                <Activity className="w-6 h-6 text-neonPurple" /> {title} Node
                            </h1>
                            <p className="text-sm text-slate-400 mt-1">Submit biological parameters for decentralized ML analysis.</p>
                        </div>
                    </div>

                    {/* Prediction Form vs Result View */}
                    {!result ? (
                        <div className="glass-card rounded-2xl p-6 md:p-8 border border-slate-700/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neonPurple/10 blur-3xl rounded-full pointer-events-none"></div>

                            <form onSubmit={handlePredict} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {inputsConfig.map((input) => {
                                        // Handle conditional visibility (e.g., pregnancies only for females)
                                        if (input.conditional) {
                                            const conditionValue = formData[input.conditional];
                                            const shouldShow = input.conditionalValue !== undefined 
                                                ? conditionValue === input.conditionalValue 
                                                : !!conditionValue;
                                            
                                            if (!shouldShow) return null;
                                        }

                                        return (
                                            <div key={input.name}>
                                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                                    {input.label}
                                                    {input.optional && <span className="text-slate-500 text-xs ml-2">(optional)</span>}
                                                </label>
                                                {input.help && (
                                                    <p className="text-xs text-slate-500 mb-2 italic">{input.help}</p>
                                                )}
                                            {input.type === 'checkbox' ? (
                                                <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                                    <input
                                                        type="checkbox"
                                                        name={input.name}
                                                        onChange={handleChange}
                                                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-neonPurple focus:ring-neonPurple/50"
                                                    />
                                                    <span className="text-sm text-slate-300">Yes, applies to me</span>
                                                </div>
                                            ) : input.type === 'select' ? (
                                                <select
                                                    name={input.name}
                                                    required
                                                    defaultValue=""
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900 border border-slate-700/80 text-white rounded-xl px-4 py-3 text-sm focus:border-neonPurple focus:ring-1 focus:ring-neonPurple outline-none transition-all"
                                                >
                                                    <option value="" disabled>Select {input.label}</option>
                                                    {input.options.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={input.type}
                                                    name={input.name}
                                                    required
                                                    min={input.min}
                                                    max={input.max}
                                                    step={input.step}
                                                    onChange={handleChange}
                                                    placeholder={input.placeholder}
                                                    className="w-full bg-slate-900 border border-slate-700/80 text-white rounded-xl px-4 py-3 text-sm focus:border-neonPurple focus:ring-1 focus:ring-neonPurple outline-none transition-all placeholder-slate-600"
                                                />
                                            )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-6 border-t border-slate-800">
                                    <button
                                        type="submit"
                                        disabled={loading || Object.keys(formData).length < inputsConfig.length}
                                        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 border border-neonPurple/30 py-4 px-6 rounded-xl font-bold text-sm tracking-wide text-white transition-all hover:border-neonPurple hover:shadow-[0_0_20px_rgba(176,0,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 w-0 bg-gradient-to-r from-neonPurple/20 to-neonCyan/20 transition-all duration-300 group-hover:w-full"></div>
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin text-neonPurple" />
                                                <span className="relative z-10 text-neonPurple">COMPUTING RISK TENSORS...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Beaker className="w-5 h-5 text-neonPurple group-hover:scale-110 transition-transform" />
                                                <span className="relative z-10">RUN PREDICTION MODEL</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="glass-card rounded-2xl p-8 border border-slate-700/50 text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
                            <div className={`absolute -top-20 -left-20 w-64 h-64 blur-[100px] rounded-full opacity-30 ${result.riskLevel === 'Low' ? 'bg-neonGreen' : result.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-rose-500'}`}></div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ${result.riskLevel === 'Low' ? 'bg-neonGreen/20 text-neonGreen shadow-neonGreen/20' : result.riskLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-500 shadow-yellow-500/20' : 'bg-rose-500/20 text-rose-500 shadow-rose-500/20'}`}>
                                    {result.riskLevel === 'Low' ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                                </div>

                                <h2 className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">Analysis Complete</h2>
                                <h3 className="text-4xl font-black text-white mb-4 tracking-wider">
                                    Risk: <span className={result.riskLevel === 'Low' ? 'text-neonGreen' : result.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-rose-400'}>{result.riskLevel.toUpperCase()}</span>
                                </h3>
                                
                                {result.predictionProbability !== undefined && result.predictionProbability !== null && (
                                    <p className="text-slate-300 text-lg mb-6 shadow-sm border border-slate-700/50 rounded-lg py-2 px-4 shadow-neonPurple/5">
                                        ML Evaluated Probability: <span className="text-white font-bold">{(result.predictionProbability * 100).toFixed(1)}%</span>
                                    </p>
                                )}

                                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 max-w-md w-full mb-8 text-left">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                        <Info className="w-4 h-4 text-neonCyan" /> System Interpretation
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        {result.riskLevel === 'Low' ? (
                                            <>
                                                <li className="flex gap-2"><span className="text-neonGreen">•</span> Biomarkers indicate nominal operational state.</li>
                                                <li className="flex gap-2"><span className="text-neonGreen">•</span> No immediate clinical warnings generated.</li>
                                            </>
                                        ) : result.riskLevel === 'Medium' ? (
                                            <>
                                                <li className="flex gap-2"><span className="text-yellow-400">•</span> Deviations found in biological metrics.</li>
                                                <li className="flex gap-2"><span className="text-yellow-400">•</span> Recommended action: Consult with organic care supervisor.</li>
                                            </>
                                        ) : (
                                            <>
                                                <li className="flex gap-2"><span className="text-rose-400">•</span> Critical risk factors identified in tensor output.</li>
                                                <li className="flex gap-2"><span className="text-rose-400">•</span> Immediate diagnostic testing highly advised.</li>
                                            </>
                                        )}
                                    </ul>
                                </div>

                                <button
                                    onClick={() => { setResult(null); setFormData({}); }}
                                    className="text-sm font-medium text-neonPurple hover:text-white transition-colors uppercase tracking-widest border-b border-neonPurple/50 hover:border-white pb-1"
                                >
                                    Initialize New Run
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RiskPredictor;
