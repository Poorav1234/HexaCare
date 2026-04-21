// src/admin/AdminUsers.jsx
// Privacy-enforced users overview. Shows only aggregated/anonymized data.
// ❌ No emails, names, phones, personal details exposed.
// ✅ Only counts, role distribution, registration trends, and status stats.

import React, { useEffect, useState, useMemo } from "react";
import {
    Users,
    Loader2,
    RefreshCw,
    Shield,
    TrendingUp,
    UserPlus,
    UserMinus,
    BarChart3,
    PieChart,
    Lock,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getAnonymizedUserStats, getAllUsers } from "../firebase/adminService";

// ── Donut Chart (SVG) ────────────────────────────────────────────────────────
const DonutChart = ({ data, colors, size = 140 }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="flex items-center gap-6">
            <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="14" />
                {data.map((d, i) => {
                    if (d.value === 0) return null;
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
                            strokeWidth="14"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-currentOffset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                        />
                    );
                })}
                <text x="50" y="46" textAnchor="middle" fill="white" fontSize="18" fontWeight="900">{total}</text>
                <text x="50" y="60" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="600">USERS</text>
            </svg>
            <div className="space-y-3">
                {data.map((d, i) => (
                    <div key={d.label} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="text-sm text-slate-400">{d.label}</span>
                        <span className="text-sm text-white font-bold ml-auto">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Mini Bar Chart ───────────────────────────────────────────────────────────
const MiniBarChart = ({ data, colors }) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <div className="flex items-end gap-3 h-36">
            {data.map((d, i) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">{d.value}</span>
                    <div
                        className={`w-full rounded-t-lg transition-all duration-700 ease-out ${colors[i % colors.length]}`}
                        style={{ height: `${Math.max((d.value / max) * 100, 8)}%`, minHeight: "8px" }}
                    />
                    <span className="text-[9px] text-slate-500 font-mono tracking-wider truncate w-full text-center">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

const AdminUsers = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [statsData, usersData] = await Promise.all([
                getAnonymizedUserStats(),
                getAllUsers(),
            ]);
            setStats(statsData);
            setUsers(usersData);
        } catch (err) {
            console.error("Failed to fetch user stats:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const filteredUsers = useMemo(() => {
        let list = users;
        if (roleFilter !== "all") {
            const normalizedFilter = roleFilter === "admin" ? ["admin", "super_admin"] : ["user"];
            list = list.filter(u => 
                roleFilter === "admin" 
                    ? normalizedFilter.includes(u.role)
                    : (u.role === "user" || !u.role)
            );
        }
        if (searchTerm.trim()) {
            const t = searchTerm.toLowerCase();
            list = list.filter(u => 
                (u.fullName || "").toLowerCase().includes(t) ||
                (u.email || "").toLowerCase().includes(t) ||
                (u.phoneNumber || "").toLowerCase().includes(t)
            );
        }
        return list;
    }, [users, searchTerm, roleFilter]);

    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <Users className="w-6 h-6 text-neonCyan" />
                        Users Overview
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Anonymized platform-wide user statistics. No personal data exposed.
                    </p>
                </div>
                <button
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Privacy Notice Reminder (Updated) */}
            <div className="glass-card rounded-xl p-4 mb-6 flex items-center gap-3 border border-amber-500/20 bg-amber-500/5">
                <Shield className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400/80">
                    <strong>Admin Note:</strong> The user directory displays names, emails, roles, and phone numbers. To preserve privacy, passwords, sensitive medical data, and deep PII are not shown here.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                </div>
            ) : (
                <>
                    {/* Primary Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        {[
                            { label: "Total", value: stats?.total, icon: Users, color: "text-neonCyan", accent: "bg-neonCyan/10" },
                            { label: "Active", value: stats?.active, icon: CheckCircle2, color: "text-neonGreen", accent: "bg-neonGreen/10" },
                            { label: "Inactive", value: stats?.inactive, icon: XCircle, color: "text-red-400", accent: "bg-red-500/10" },
                            { label: "Admins", value: stats?.admins, icon: Shield, color: "text-amber-400", accent: "bg-amber-500/10" },
                            { label: "Regular", value: stats?.regularUsers, icon: Users, color: "text-slate-300", accent: "bg-slate-700/50" },
                            { label: "New (30d)", value: stats?.recentRegistrations, icon: UserPlus, color: "text-violet-400", accent: "bg-violet-500/10" },
                        ].map((s) => (
                            <div key={s.label} className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-slate-600 transition-all duration-300">
                                <div className={`absolute top-0 right-0 w-20 h-20 ${s.accent} blur-3xl rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <s.icon className={`w-4 h-4 ${s.color}`} />
                                    </div>
                                    <p className={`text-2xl font-black ${s.color}`}>{s.value ?? 0}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Role Distribution Pie */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <PieChart className="w-4 h-4 text-neonPurple" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                    Role Distribution
                                </h3>
                            </div>
                            <DonutChart
                                data={[
                                    { label: "Regular Users", value: stats?.regularUsers || 0 },
                                    { label: "Admins", value: stats?.admins || 0 },
                                ]}
                                colors={["#0ea5e9", "#f59e0b"]}
                                size={150}
                            />
                        </div>

                        {/* Status Distribution */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <PieChart className="w-4 h-4 text-neonGreen" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                    Account Status
                                </h3>
                            </div>
                            <DonutChart
                                data={[
                                    { label: "Active", value: stats?.active || 0 },
                                    { label: "Inactive", value: stats?.inactive || 0 },
                                ]}
                                colors={["#10b981", "#ef4444"]}
                                size={150}
                            />
                        </div>
                    </div>

                    {/* Registration Trend (6 months) */}
                    <div className="glass-card rounded-2xl p-6 border border-slate-700/50 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-4 h-4 text-neonCyan" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                Registration Trend (6 Months)
                            </h3>
                        </div>
                        {stats?.registrationsByMonth?.length > 0 ? (
                            <MiniBarChart
                                data={stats.registrationsByMonth}
                                colors={["bg-neonCyan/80", "bg-neonCyan/60", "bg-neonCyan/70", "bg-neonCyan/50", "bg-neonCyan/80", "bg-neonCyan/60"]}
                            />
                        ) : (
                            <div className="h-36 flex items-center justify-center text-xs text-slate-600">No registration data</div>
                        )}
                    </div>

                    {/* Summary Banner */}
                    <div className="glass-card rounded-2xl p-6 border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-neonCyan/10 border border-neonCyan/20 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-6 h-6 text-neonCyan" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Platform Health Summary</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {stats?.active || 0} of {stats?.total || 0} accounts are active.
                                {stats?.recentRegistrations ? ` ${stats.recentRegistrations} new registrations in the last 30 days.` : ""}
                                {stats?.admins ? ` ${stats.admins} admin account(s) managing the platform.` : ""}
                            </p>
                        </div>
                    </div>

                    {/* User Directory Table */}
                    <div className="glass-card rounded-2xl border border-slate-700/50 mt-8 overflow-hidden">
                        <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row items-center gap-4">
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 flex-grow">
                                <Users className="w-4 h-4 text-neonCyan" />
                                User Directory
                            </h2>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or phone..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 pl-9 text-sm outline-none focus:border-neonCyan transition-colors"
                                    />
                                    <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={e => setRoleFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 outline-none focus:border-neonCyan w-full sm:w-auto"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="user">Users</option>
                                    <option value="admin">Admins</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-700/50 bg-slate-900/30">
                                        <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Name</th>
                                        <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Email</th>
                                        <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Role</th>
                                        <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Phone Number</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-sm text-slate-500">
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u.uid} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-white font-bold">{u.fullName || "—"}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-400">{u.email || "—"}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${
                                                        u.role === "admin" || u.role === "super_admin" 
                                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                                            : "bg-slate-700/50 text-slate-300 border-slate-600/30"
                                                    }`}>
                                                        {u.role === "super_admin" ? "Super Admin" : u.role || "User"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-400 font-mono tracking-wider">{u.phoneNumber || "—"}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
};

export default AdminUsers;
