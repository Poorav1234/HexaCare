// src/admin/AdminDashboard.jsx
// Comprehensive system overview with advanced analytics.
// Pie chart (model usage), bar chart (model frequency), line chart (activity trend).
// Shows most/least used model. Privacy-enforced — no user-specific data.

import React, { useEffect, useState, useMemo } from "react";
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
    BarChart3,
    PieChart,
    LineChart,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import {
    getSystemStats,
    getModelUsageAnalytics,
    getActivityTimeline,
} from "../firebase/adminService";

// ── Stat Card ────────────────────────────────────────────────────────────────
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

// ── Mini Bar Chart (pure CSS) ────────────────────────────────────────────────
const MiniBarChart = ({ data, colors }) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <div className="flex items-end gap-2 h-36">
            {data.map((d, i) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">{d.value}</span>
                    <div
                        className={`w-full rounded-t-lg transition-all duration-700 ease-out ${colors[i % colors.length]}`}
                        style={{ height: `${Math.max((d.value / max) * 100, 8)}%`, minHeight: "8px" }}
                    />
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider truncate w-full text-center">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

// ── Donut Chart (Pie Chart - pure SVG) ───────────────────────────────────────
const DonutChart = ({ data, colors, size = 130 }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="flex items-center gap-6">
            <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
                {data.map((d, i) => {
                    const pct = d.value / total;
                    const dash = circumference * pct;
                    const gap = circumference - dash;
                    const currentOffset = offset;
                    offset += dash;
                    return (
                        <circle
                            key={d.label}
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke={colors[i % colors.length]}
                            strokeWidth="12"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-currentOffset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                        />
                    );
                })}
                <text x="50" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="900">{total}</text>
                <text x="50" y="58" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="600">TOTAL</text>
            </svg>
            <div className="space-y-2">
                {data.map((d, i) => (
                    <div key={d.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="text-xs text-slate-400">{d.label}</span>
                        <span className="text-xs text-slate-300 font-bold ml-auto">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Line Chart (SVG Sparkline with Area Fill) ────────────────────────────────
const ActivityLineChart = ({ timeline }) => {
    if (!timeline || timeline.length === 0) return <div className="h-44 flex items-center justify-center text-xs text-slate-600">No data</div>;

    // Show last 14 days for clarity
    const data = timeline.slice(-14);
    const maxVal = Math.max(...data.map(d => d.logins + d.reports + d.predictions), 1);

    const width = 500;
    const height = 160;
    const padding = { top: 10, right: 10, bottom: 30, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getPoints = (key) => {
        return data.map((d, i) => {
            const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
            const y = padding.top + chartH - (d[key] / maxVal) * chartH;
            return `${x},${y}`;
        });
    };

    const combinedPoints = data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
        const totalVal = d.logins + d.reports + d.predictions;
        const y = padding.top + chartH - (totalVal / maxVal) * chartH;
        return { x, y };
    });

    const linePath = combinedPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${combinedPoints[combinedPoints.length - 1].x} ${padding.top + chartH} L ${combinedPoints[0].x} ${padding.top + chartH} Z`;

    return (
        <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(pct => (
                    <line
                        key={pct}
                        x1={padding.left} y1={padding.top + chartH * (1 - pct)}
                        x2={padding.left + chartW} y2={padding.top + chartH * (1 - pct)}
                        stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4"
                    />
                ))}

                {/* Area fill */}
                <path d={areaPath} fill="url(#areaGrad)" />

                {/* Line */}
                <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots */}
                {combinedPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0ea5e9" stroke="#020617" strokeWidth="1.5" />
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => {
                    if (i % 2 !== 0 && data.length > 7) return null;
                    const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
                    return (
                        <text key={i} x={x} y={height - 5} textAnchor="middle" fill="#475569" fontSize="8" fontWeight="600">
                            {d.dateLabel}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};

// ── Model Usage Highlight Card ───────────────────────────────────────────────
const ModelHighlight = ({ model, type, icon: Icon, accentColor }) => (
    <div className="glass-card rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{type}</p>
            <p className="text-sm text-white font-bold truncate">{model?.label || "—"}</p>
        </div>
        <span className="text-xl font-black text-white">{model?.value ?? "—"}</span>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [modelUsage, setModelUsage] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [statsData, modelData, timelineData] = await Promise.all([
                getSystemStats(),
                getModelUsageAnalytics(),
                getActivityTimeline(30),
            ]);
            setStats(statsData);
            setModelUsage(modelData);
            setTimeline(timelineData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // Chart color palettes
    const pieColors = ["#0ea5e9", "#a855f7", "#f59e0b", "#10b981", "#ef4444", "#6366f1"];
    const barColors = ["bg-neonCyan/80", "bg-violet-400/80", "bg-amber-400/80", "bg-neonGreen/80", "bg-rose-400/80", "bg-blue-400/80"];

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
                        Real-time platform metrics, advanced analytics, and usage statistics.
                    </p>
                </div>
                <button
                    onClick={() => fetchAll(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
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
                        <StatCard title="Total Users" value={stats?.totalUsers} icon={Users} accent="bg-neonCyan/10" subtitle="Registered accounts" />
                        <StatCard title="Active Users" value={stats?.activeUsers} icon={TrendingUp} accent="bg-neonGreen/10" subtitle="Non-deactivated accounts" />
                        <StatCard title="Recently Active" value={stats?.recentlyActive} icon={Activity} accent="bg-neonPurple/10" subtitle="Last 7 days" />
                        <StatCard title="Admins" value={stats?.adminCount} icon={Shield} accent="bg-amber-500/10" subtitle="Including super admin" />
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <StatCard title="Reports Stored" value={stats?.reportsCount} icon={FileText} accent="bg-rose-500/10" subtitle="Medical records on chain" />
                        <StatCard title="Predictions Run" value={stats?.predictionsCount} icon={Brain} accent="bg-violet-500/10" subtitle="Health risk analyses" />
                        <StatCard title="Activity Logs" value={stats?.logsCount} icon={ScrollText} accent="bg-blue-500/10" subtitle="Tracked events" />
                    </div>

                    {/* ── Charts Row 1 ───────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Line Chart — Activity Over Time */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <LineChart className="w-4 h-4 text-neonCyan" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                        Activity Trend (14d)
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-2 h-2 rounded-full bg-neonCyan inline-block" /> Combined</span>
                                </div>
                            </div>
                            <ActivityLineChart timeline={timeline} />
                        </div>

                        {/* Pie Chart — Model Usage Distribution */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <PieChart className="w-4 h-4 text-violet-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                    Model Usage Distribution
                                </h3>
                            </div>
                            {modelUsage?.distribution?.length > 0 ? (
                                <DonutChart
                                    data={modelUsage.distribution}
                                    colors={pieColors}
                                />
                            ) : (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-600">No prediction data yet</div>
                            )}
                        </div>
                    </div>

                    {/* ── Charts Row 2 ───────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Bar Chart — Model Frequency */}
                        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-4 h-4 text-amber-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                    Model Usage Count
                                </h3>
                            </div>
                            {modelUsage?.distribution?.length > 0 ? (
                                <MiniBarChart
                                    data={modelUsage.distribution}
                                    colors={barColors}
                                />
                            ) : (
                                <div className="h-36 flex items-center justify-center text-xs text-slate-600">No prediction data yet</div>
                            )}
                        </div>

                        {/* Most / Least Used Model */}
                        <div className="flex flex-col gap-4">
                            <ModelHighlight
                                model={modelUsage?.mostUsed}
                                type="Most Used Model"
                                icon={ArrowUpRight}
                                accentColor="bg-neonGreen/20 text-neonGreen"
                            />
                            <ModelHighlight
                                model={modelUsage?.leastUsed}
                                type="Least Used Model"
                                icon={ArrowDownRight}
                                accentColor="bg-amber-500/20 text-amber-400"
                            />
                            <div className="glass-card rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Predictions</p>
                                    <p className="text-sm text-white font-bold">{modelUsage?.total ?? 0} analyses</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Quick Navigation ──────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: "Users", desc: "Anonymized overview", path: "/admin/users", icon: Users, color: "text-neonCyan" },
                            { label: "Reports", desc: "Blockchain metadata", path: "/admin/reports", icon: FileText, color: "text-neonPurple" },
                            { label: "Security Logs", desc: "SOC monitoring", path: "/admin/logs", icon: Shield, color: "text-amber-400" },
                            { label: "My Profile", desc: "Account settings", path: "/admin/profile", icon: Zap, color: "text-neonGreen" },
                        ].map((nav) => (
                            <Link
                                key={nav.path}
                                to={nav.path}
                                className="glass-card rounded-2xl p-5 border border-slate-700/50 group hover:border-slate-600 transition-all duration-300"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <nav.icon className={`w-5 h-5 ${nav.color}`} />
                                    <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                                </div>
                                <p className="text-sm font-bold text-white">{nav.label}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{nav.desc}</p>
                            </Link>
                        ))}
                    </div>

                    {/* System Info Card */}
                    <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-neonGreen" />
                            System Status
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "Firebase Auth", status: "Connected", color: "neonGreen" },
                                { label: "Realtime DB", status: "Connected", color: "neonGreen" },
                                { label: "Firestore", status: "Connected", color: "neonGreen" },
                                { label: "Blockchain", status: "Sepolia Testnet", color: "neonCyan" },
                            ].map((s) => (
                                <div key={s.label} className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full bg-${s.color} animate-pulse`} />
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
                                        <p className={`text-xs text-${s.color} font-mono`}>{s.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
};

export default AdminDashboard;
