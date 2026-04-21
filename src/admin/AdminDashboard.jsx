// src/admin/AdminDashboard.jsx
// System-wide statistics dashboard for admins.
// Shows only metadata (counts, timestamps) — no sensitive data is exposed.

import React, { useEffect, useState } from "react";
import {
    Users,
    FileText,
    Activity,
    Shield,
    TrendingUp,
    Brain,
    ScrollText,
    Loader2,
    RefreshCw,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getSystemStats } from "../firebase/adminService";

const StatCard = ({ title, value, icon: Icon, accent, subtitle }) => (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-slate-600 transition-all duration-300">
        <div
            className={`absolute top-0 right-0 w-28 h-28 ${accent} blur-3xl rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        />
        <div className="relative z-10 flex items-start justify-between">
            <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">
                    {title}
                </p>
                <p className="text-3xl font-black text-white tracking-tight">
                    {value ?? "—"}
                </p>
                {subtitle && (
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                <Icon className="w-5 h-5 text-slate-400" />
            </div>
        </div>
    </div>
);

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await getSystemStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <Activity className="w-6 h-6 text-neonCyan" />
                        System Overview
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Real-time platform metrics and usage statistics.
                    </p>
                </div>
                <button
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                    <RefreshCw
                        className={`w-4 h-4 ${
                            refreshing ? "animate-spin" : ""
                        }`}
                    />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                </div>
            ) : (
                <>
                    {/* Primary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title="Total Users"
                            value={stats?.totalUsers}
                            icon={Users}
                            accent="bg-neonCyan/10"
                            subtitle="Registered accounts"
                        />
                        <StatCard
                            title="Active Users"
                            value={stats?.activeUsers}
                            icon={TrendingUp}
                            accent="bg-neonGreen/10"
                            subtitle="Non-deactivated accounts"
                        />
                        <StatCard
                            title="Recently Active"
                            value={stats?.recentlyActive}
                            icon={Activity}
                            accent="bg-neonPurple/10"
                            subtitle="Last 7 days"
                        />
                        <StatCard
                            title="Admins"
                            value={stats?.adminCount}
                            icon={Shield}
                            accent="bg-amber-500/10"
                            subtitle="Including super admin"
                        />
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <StatCard
                            title="Reports Stored"
                            value={stats?.reportsCount}
                            icon={FileText}
                            accent="bg-rose-500/10"
                            subtitle="Medical records on chain"
                        />
                        <StatCard
                            title="Predictions Run"
                            value={stats?.predictionsCount}
                            icon={Brain}
                            accent="bg-violet-500/10"
                            subtitle="Health risk analyses"
                        />
                        <StatCard
                            title="Activity Logs"
                            value={stats?.logsCount}
                            icon={ScrollText}
                            accent="bg-blue-500/10"
                            subtitle="Tracked events"
                        />
                    </div>

                    {/* System Info Card */}
                    <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-neonGreen" />
                            System Status
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        Firebase Auth
                                    </p>
                                    <p className="text-xs text-neonGreen font-mono">
                                        Connected
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        Realtime DB
                                    </p>
                                    <p className="text-xs text-neonGreen font-mono">
                                        Connected
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        Firestore
                                    </p>
                                    <p className="text-xs text-neonGreen font-mono">
                                        Connected
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-neonCyan animate-pulse" />
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        Blockchain
                                    </p>
                                    <p className="text-xs text-neonCyan font-mono">
                                        Sepolia Testnet
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
};

export default AdminDashboard;
