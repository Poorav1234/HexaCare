import React from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../Components/NavBar";
import { HeartPulse, Droplet, Activity, ShieldAlert, ChevronRight, Zap } from "lucide-react";

const models = [
    {
        type: "heart",
        title: "Heart Disease Risk",
        subtitle: "Cardiovascular Analysis",
        description:
            "Assess your risk of heart disease using key health metrics like blood pressure, cholesterol, exercise stress data, and ECG patterns. Get an AI-powered risk score instantly.",
        icon: HeartPulse,
        color: "text-rose-400",
        border: "hover:border-rose-500/60",
        glow: "bg-rose-500/5 group-hover:bg-rose-500/10",
        badge: "bg-rose-500/10 text-rose-400",
        badgeLabel: "11 Parameters",
    },
    {
        type: "diabetes",
        title: "Diabetes Risk",
        subtitle: "Metabolic Assessment",
        description:
            "Evaluate your risk of developing diabetes by analyzing blood glucose, HbA1c, BMI, and lifestyle factors. Ideal for early detection and monitoring your metabolic health.",
        icon: Droplet,
        color: "text-sky-400",
        border: "hover:border-sky-500/60",
        glow: "bg-sky-500/5 group-hover:bg-sky-500/10",
        badge: "bg-sky-500/10 text-sky-400",
        badgeLabel: "8 Parameters",
    },
    {
        type: "cancer",
        title: "Cancer Risk",
        subtitle: "Oncology Screening",
        description:
            "Screen for potential cancer risk based on age, family history, smoking history, and radiation exposure. Get a preliminary lifestyle-based risk assessment.",
        icon: Activity,
        color: "text-amber-400",
        border: "hover:border-amber-500/60",
        glow: "bg-amber-500/5 group-hover:bg-amber-500/10",
        badge: "bg-amber-500/10 text-amber-400",
        badgeLabel: "4 Parameters",
    },
    {
        type: "overall",
        title: "Overall Health Score",
        subtitle: "Holistic Wellness Check",
        description:
            "Get a comprehensive wellness score based on your age, BMI, daily activity, and sleep patterns. Understand your overall health at a glance and spot areas to improve.",
        icon: ShieldAlert,
        color: "text-emerald-400",
        border: "hover:border-emerald-500/60",
        glow: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
        badge: "bg-emerald-500/10 text-emerald-400",
        badgeLabel: "4 Parameters",
    },
];

const PredictHub = ({ user, profileData }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 p-6 md:p-12 relative z-10">
                <div className="max-w-6xl mx-auto space-y-10">

                    {/* Header */}
                    <section className="glass-card p-8 rounded-2xl relative overflow-hidden border-t-4 border-t-neonCyan">
                        <div className="absolute -top-16 -right-16 w-64 h-64 bg-neonCyan/5 blur-3xl rounded-full pointer-events-none" />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-neonCyan/10 border border-neonCyan/30 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-neonCyan" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-neonCyan">AI Prediction Models</span>
                                </div>
                                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Health Risk Predictors</h1>
                                <p className="text-slate-400 max-w-xl">
                                    Choose a model below and enter your health data to receive an instant AI-powered risk assessment. All models are powered by trained machine learning algorithms.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neonCyan/5 border border-neonCyan/20 text-xs text-slate-400 self-start md:self-auto">
                                <div className="w-2 h-2 bg-neonCyan rounded-full animate-pulse" />
                                {models.length} Models Available
                            </div>
                        </div>
                    </section>

                    {/* Model Cards */}
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Select a Model</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {models.map((m) => {
                                const Icon = m.icon;
                                return (
                                    <div
                                        key={m.type}
                                        className={`glass-card p-6 rounded-2xl relative overflow-hidden group border border-slate-700/50 ${m.border} transition-all duration-300 cursor-pointer`}
                                        onClick={() => navigate(`/predict/${m.type}`)}
                                    >
                                        {/* Glow */}
                                        <div className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full pointer-events-none transition-all duration-500 ${m.glow}`} />

                                        <div className="relative z-10">
                                            {/* Icon + badge row */}
                                            <div className="flex items-start justify-between mb-5">
                                                <div className={`w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                                    <Icon className={`w-6 h-6 ${m.color}`} />
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${m.badge}`}>
                                                    {m.badgeLabel}
                                                </span>
                                            </div>

                                            {/* Text */}
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{m.subtitle}</p>
                                            <h3 className="text-xl font-bold text-white mb-3">{m.title}</h3>
                                            <p className="text-sm text-slate-400 leading-relaxed mb-6">{m.description}</p>

                                            {/* CTA */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/predict/${m.type}`); }}
                                                className={`flex items-center gap-2 text-sm font-semibold ${m.color} hover:text-white transition-colors`}
                                            >
                                                Start Assessment <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Disclaimer */}
                    <p className="text-center text-[11px] text-slate-600 pb-4">
                        ⚠️ All predictions are AI-assisted estimates and are not a substitute for medical diagnosis. Please consult a qualified healthcare professional.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default PredictHub;
