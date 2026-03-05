import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../firebase/authService";
import {
  LogOut,
  Activity,
  User,
  Fingerprint,
  Database,
  Hexagon,
  ShieldAlert,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const Dashboard = ({ user }) => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfileData = async () => {
            if (user && user.uid) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfileData(docSnap.data());
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

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neonCyan"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-12 pl-4 md:pl-12 pt-16">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-neonCyan/10 blur-3xl rounded-full pointer-events-none"></div>

                    <div className="flex items-center gap-4 mb-4 md:mb-0 relative z-10">
                        <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg shadow-neonCyan/5">
                            <Activity className="w-8 h-8 text-neonCyan" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                                NODE <span className="text-neonCyan">ACTIVE</span>
                            </h1>
                            <p className="text-slate-400 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse"></span>
                                System authenticated & fully operational
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-6 rounded-lg border border-slate-700 hover:border-red-500/50 transition-all text-sm font-medium group relative z-10"
                    >
                        <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
                        DISCONNECT
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                    {/* Main ID Card */}
                    <div className="lg:col-span-2 glass-card p-8 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neonPurple/10 blur-3xl rounded-full pointer-events-none"></div>

                        <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                            <User className="w-5 h-5 text-neonPurple" />
                            IDENTITY <span className="text-slate-500">RECORD</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Full Name</p>
                                <p className="text-base font-medium text-white">{profileData?.fullName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Email Classification</p>
                                <p className="text-base font-medium text-slate-300">{profileData?.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Communication Line</p>
                                <p className="text-base font-medium text-slate-300">{profileData?.phoneNumber}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Date of Synthesis</p>
                                <p className="text-base font-medium text-slate-300">{profileData?.dateOfBirth}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Gender Identity</p>
                                <p className="text-base font-medium text-slate-300">{profileData?.gender}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Auth Protocol</p>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700">
                                    <ShieldAlert className="w-3.5 h-3.5 text-neonGreen" />
                                    {profileData?.authProvider?.toUpperCase() || 'UNKNOWN'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Blockchain & Medical Info */}
                    <div className="space-y-6">
                        {/* Medical Block */}
                        <div className="glass-card p-6 rounded-2xl border-t-4 border-t-red-500/50 shadow-[0_-5px_20px_rgba(239,68,68,0.05)] relative overflow-hidden">
                            <Hexagon className="absolute -right-4 -bottom-4 w-24 h-24 text-red-500/5 stroke-1" />
                            <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                                <Database className="w-4 h-4 text-red-400" />
                                BIOMETRIC DATA
                            </h2>
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Blood Type</p>
                                    <p className="text-2xl font-bold text-red-400">{profileData?.bloodGroup || 'UNK'}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                </div>
                            </div>
                        </div>

                        {/* Wallet Block */}
                        <div className="glass-card p-6 rounded-2xl border-t-4 border-t-neonCyan shadow-[0_-5px_20px_rgba(0,243,255,0.05)] relative overflow-hidden">
                            <Hexagon className="absolute -right-4 -bottom-4 w-24 h-24 text-neonCyan/5 stroke-1" />
                            <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                                <Fingerprint className="w-4 h-4 text-neonCyan" />
                                BLOCKCHAIN LEDGER
                            </h2>
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">EVM Public Key</p>
                                <div className="bg-slate-950 rounded p-3 font-mono text-xs text-neonCyan/80 break-all border border-neonCyan/20 relative group">
                                    <div className="absolute inset-0 bg-neonCyan/5 opacity-0 group-hover:opacity-100 transition-opacity rounded"></div>
                                    {profileData?.walletAddress || 'No wallet linked'}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 hidden">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span>
                                    Network Synced
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
