// src/admin/AdminDashboard.jsx
// System-wide statistics dashboard for admins.
// Shows stat cards, charts (user roles, report types, registration trend),
// recent users and recent reports.

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
    Clock,
    ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { getSystemStats, getAllUsers, getAllReportsAdmin } from "../firebase/adminService";

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
        <div className="flex items-end gap-2 h-32">
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

// ── Donut Chart (pure SVG) ───────────────────────────────────────────────────
const DonutChart = ({ data, colors, size = 120 }) => {
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

// ── Registration Trend (sparkline) ───────────────────────────────────────────
const RegistrationTrend = ({ users }) => {
    const last7 = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            const count = users.filter((u) => {
                const ct = u.createdAt || 0;
                return ct >= d.getTime() && ct < nextDay.getTime();
            }).length;
            days.push({
                label: d.toLocaleDateString("en-IN", { weekday: "short" }),
                value: count,
            });
        }
        return days;
    }, [users]);

    return (
        <MiniBarChart
            data={last7}
            colors={["bg-neonCyan/80", "bg-neonCyan/60", "bg-neonCyan/70", "bg-neonCyan/50", "bg-neonCyan/80", "bg-neonCyan/60", "bg-neonCyan/70"]}
        />
    );
};

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [allReports, setAllReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [statsData, usersData, reportsData] = await Promise.all([
                getSystemStats(),
                getAllUsers(),
                getAllReportsAdmin(),
            ]);
            setStats(statsData);
            setAllUsers(usersData);
            setAllReports(reportsData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // Derived chart data
    const roleData = useMemo(() => [
        { label: "Users", value: allUsers.filter((u) => !u.role || u.role === "user").length },
        { label: "Admins", value: allUsers.filter((u) => u.role === "admin").length },
        { label: "Super", value: allUsers.filter((u) => u.role === "super_admin").length },
    ], [allUsers]);

    const reportTypeData = useMemo(() => {
        const types = {};
        allReports.forEach((r) => { types[r.reportType || "Other"] = (types[r.reportType || "Other"] || 0) + 1; });
        return Object.entries(types).map(([label, value]) => ({ label, value }));
    }, [allReports]);

    const recentUsers = useMemo(() => allUsers.slice(0, 5), [allUsers]);
    const recentReports = useMemo(() => allReports.slice(0, 5), [allReports]);

    const formatDate = (ts) => {
        if (!ts) return "—";
        const d = typeof ts === "number" ? new Date(ts) : ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    };

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
                        Real-time platform metrics, charts, and usage statistics.
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

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Registration Trend */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-4 h-4 text-neonCyan" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                    Registrations (7d)
                                </h3>
                            </div>
                            <RegistrationTrend users={allUsers} />
                        </div>

                        {/* User Roles Donut */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <PieChart className="w-4 h-4 text-neonPurple" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                    User Roles
                                </h3>
                            </div>
                            <DonutChart
                                data={roleData}
                                colors={["#0ea5e9", "#a855f7", "#f59e0b"]}
                            />
                        </div>

                        {/* Report Types Bar */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-4 h-4 text-rose-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                    Report Types
                                </h3>
                            </div>
                            {reportTypeData.length > 0 ? (
                                <MiniBarChart
                                    data={reportTypeData}
                                    colors={["bg-rose-400/80", "bg-blue-400/80", "bg-neonPurple/80", "bg-slate-500/80"]}
                                />
                            ) : (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-600">No reports yet</div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Recent Users */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-neonCyan" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Recent Users</h3>
                                </div>
                                <Link to="/admin/users" className="flex items-center gap-1 text-xs text-neonCyan hover:text-white transition-colors">
                                    View All <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            </div>
                            {recentUsers.length === 0 ? (
                                <p className="text-xs text-slate-600 text-center py-8">No users found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {recentUsers.map((u) => (
                                        <div key={u.uid} className="flex items-center gap-3 bg-slate-900/50 rounded-xl p-3 border border-slate-800/50">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                                                {u.fullName?.charAt(0) || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-white font-medium truncate">{u.fullName || "—"}</p>
                                                <p className="text-[10px] text-slate-500 font-mono truncate">{u.email}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{formatDate(u.createdAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Reports */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-neonPurple" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Recent Reports</h3>
                                </div>
                                <Link to="/admin/reports" className="flex items-center gap-1 text-xs text-neonPurple hover:text-white transition-colors">
                                    View All <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            </div>
                            {recentReports.length === 0 ? (
                                <p className="text-xs text-slate-600 text-center py-8">No reports found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {recentReports.map((r) => (
                                        <div key={r.id} className="flex items-center gap-3 bg-slate-900/50 rounded-xl p-3 border border-slate-800/50">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                r.reportType === "Heart" ? "bg-rose-500/20 text-rose-400" :
                                                r.reportType === "Diabetes" ? "bg-blue-500/20 text-blue-400" :
                                                r.reportType === "Cancer" ? "bg-neonPurple/20 text-neonPurple" :
                                                "bg-slate-700/50 text-slate-300"
                                            }`}>
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-white font-medium truncate">{r.reportTitle || "—"}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{r.userName || r.userEmail || "—"}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <span className="text-[10px] text-slate-500 font-mono">{formatDate(r.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
