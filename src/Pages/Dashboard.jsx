import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile } from "../firebase/dbService";
import NavBar from "../Components/NavBar";
import {
    Activity,
    HeartPulse,
    Droplet,
    ShieldAlert,
    FileText,
    ChevronRight,
} from "lucide-react";

const FeatureCard = ({ title, description, icon: Icon, path, onClick }) => (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-neonCyan transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neonCyan/5 blur-3xl rounded-full pointer-events-none group-hover:bg-neonCyan/20 transition-all duration-500"></div>
        <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-lg shadow-neonCyan/5 mb-4 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-neonCyan" />
            </div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 relative z-10">{title}</h3>
        <p className="text-sm text-slate-400 mb-6 relative z-10">{description}</p>
        <button
            onClick={() => onClick(path)}
            className="flex items-center gap-2 text-sm font-medium text-neonCyan hover:text-white transition-colors relative z-10"
        >
            View Service <ChevronRight className="w-4 h-4" />
        </button>
    </div>
);

const Dashboard = ({ user }) => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfileData();
    }, [user]);

    useEffect(() => {
        const autoConnectWallet = async () => {
            if (window.ethereum) {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    console.log("Wallet connected successfully");
                } catch (error) {
                    console.error("Wallet connection denied:", error);
                }
            } else {
                console.warn("MetaMask or Web3 wallet is not installed");
            }
        };
        // Trigger auto connect as soon as the dashboard loads
        autoConnectWallet();
    }, []);

    const handleNavigate = (path) => {
        navigate(path);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neonCyan"></div>
            </div>
        );
    }

    const features = [
        {
            title: "My Health Reports",
            description: "View and manage your medical test documents.",
            icon: FileText,
            path: "/reports",
        },
        {
            title: "Heart Risk Inference",
            description: "Evaluate heart health risks using daily metrics.",
            icon: HeartPulse,
            path: "/predict/heart",
        },
        {
            title: "Diabetes Risk Inference",
            description: "Analyze glucose and BMI for metabolic insights.",
            icon: Droplet,
            path: "/predict/diabetes",
        },
        {
            title: "Cancer Risk Inference",
            description: "Process lifestyle factors for oncology insights.",
            icon: Activity,
            path: "/predict/cancer",
        },
        {
            title: "Overall Health Inference",
            description: "Comprehensive evaluation of your overall health.",
            icon: ShieldAlert,
            path: "/predict/overall",
        },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 p-6 md:p-12 relative z-10">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Welcome Card */}
                    <section className="glass-card p-8 rounded-2xl relative overflow-hidden border-t-4 border-t-neonPurple">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-neonPurple/10 blur-3xl rounded-full pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                                    Welcome back, <span className="text-neonPurple">{profileData?.fullName || "User"}</span>
                                </h1>
                                <p className="text-slate-400">
                                    Your health dashboard is ready. All features are active and running.
                                </p>
                            </div>
                            <div className="hidden md:block text-right">
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-neonGreen/10 border border-neonGreen/20 text-neonGreen text-sm font-medium">
                                    <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse"></span>
                                    Healthy
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Features Grid */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white tracking-wide">
                                Available Services
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, idx) => (
                                <FeatureCard key={idx} {...feature} onClick={handleNavigate} />
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
