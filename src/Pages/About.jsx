import React from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../Components/NavBar";
import { Shield, Brain, Lock, Zap, Users, HeartPulse } from "lucide-react";

const StatCard = ({ value, label }) => (
    <div className="glass-card p-6 rounded-2xl text-center border border-slate-700/50">
        <p className="text-3xl font-extrabold text-neonCyan mb-1">{value}</p>
        <p className="text-xs text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
);

const ValueCard = ({ icon: Icon, title, desc, color }) => (
    <div className="glass-card p-6 rounded-2xl border border-slate-700/50 group hover:border-neonPurple/40 transition-all">
        <div className={`w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <h3 className="text-white font-bold mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
);

const About = ({ user, profileData }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 relative z-10">

                {/* Hero Section */}
                <section className="px-6 md:px-12 pt-16 pb-12 relative overflow-hidden">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-neonCyan/5 blur-3xl rounded-full pointer-events-none" />
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neonCyan bg-neonCyan/10 border border-neonCyan/20 px-3 py-1.5 rounded-full mb-6">
                            <HeartPulse className="w-3.5 h-3.5" /> About HexaCare
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                            Healthcare Powered by <span className="text-neonCyan">AI</span> &amp; <span className="text-neonPurple">Blockchain</span>
                        </h1>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
                            HexaCare is a next-generation health intelligence platform that combines the power of artificial intelligence,
                            machine learning, and blockchain technology to give you a secure, private, and insightful view of your health.
                        </p>
                    </div>
                </section>

                {/* Stats */}
                <section className="px-6 md:px-12 py-10">
                    <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard value="4+" label="AI Models" />
                        <StatCard value="33+" label="Medical Parameters" />
                        <StatCard value="100%" label="Data Encrypted" />
                        <StatCard value="IPFS" label="Decentralized Storage" />
                    </div>
                </section>

                {/* Mission */}
                <section className="px-6 md:px-12 py-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="glass-card p-8 rounded-2xl border border-neonPurple/20 relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-48 h-48 bg-neonPurple/5 blur-3xl rounded-full pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-xs font-bold uppercase tracking-widest text-neonPurple mb-4 block">Our Mission</span>
                                <p className="text-xl text-slate-200 leading-relaxed font-medium">
                                    "To make advanced medical intelligence accessible to everyone — where your health data is <em>yours</em>,
                                    secured by blockchain, and analyzed by AI that speaks your language."
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Values */}
                <section className="px-6 md:px-12 py-12">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8 text-center">What We Stand For</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <ValueCard icon={Brain} color="text-neonCyan" title="AI-Driven Insights" desc="Our AI models analyze your medical reports and health data to deliver simple, accurate, and actionable insights — no medical degree required." />
                            <ValueCard icon={Lock} color="text-neonPurple" title="Privacy First" desc="Your reports are stored on IPFS and recorded on the Ethereum blockchain. Only you control access to your health records." />
                            <ValueCard icon={Shield} color="text-emerald-400" title="Built for Trust" desc="We follow strict data validation rules. Our AI never guesses — it only explains what's actually in your report with clear normal ranges." />
                            <ValueCard icon={Zap} color="text-amber-400" title="Instant Analysis" desc="Upload a PDF report and get a complete AI-generated health summary in seconds — including risks, advice, and plain-English explanations." />
                            <ValueCard icon={Users} color="text-sky-400" title="For Everyone" desc="Designed for patients, caregivers, and health enthusiasts alike. No technical knowledge needed — just upload and understand." />
                            <ValueCard icon={HeartPulse} color="text-rose-400" title="Preventive Health" desc="Our machine learning predictors help you spot health risks early — from diabetes to heart disease — before they become serious." />
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="px-6 md:px-12 py-16">
                    <div className="max-w-xl mx-auto text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Ready to take control of your health?</h2>
                        <p className="text-slate-400 mb-8">Upload your first medical report or try one of our AI risk predictors — it's free.</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => navigate("/reports")}
                                className="px-6 py-3 rounded-xl bg-neonCyan/10 border border-neonCyan/30 text-neonCyan text-sm font-semibold hover:bg-neonCyan/20 transition-all"
                            >
                                Upload a Report
                            </button>
                            <button
                                onClick={() => navigate("/predict")}
                                className="px-6 py-3 rounded-xl bg-neonPurple/10 border border-neonPurple/30 text-neonPurple text-sm font-semibold hover:bg-neonPurple/20 transition-all"
                            >
                                Try a Predictor
                            </button>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default About;
