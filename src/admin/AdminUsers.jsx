// src/admin/AdminUsers.jsx
// Admin page to view all platform users with search, filter, and stats.

import React, { useEffect, useState, useMemo } from "react";
import {
    Users,
    Search,
    Filter,
    Loader2,
    RefreshCw,
    ChevronDown,
    Shield,
    User,
    Mail,
    Phone,
    Calendar,
    Droplet,
    Wallet,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getAllUsers } from "../firebase/adminService";

const AdminUsers = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showFilterDrop, setShowFilterDrop] = useState(false);
    const [expandedUser, setExpandedUser] = useState(null);

    const fetchUsers = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const filteredUsers = useMemo(() => {
        let list = users;

        if (roleFilter !== "all") {
            list = list.filter((u) =>
                roleFilter === "admin"
                    ? u.role === "admin" || u.role === "super_admin"
                    : u.role === "user" || !u.role
            );
        }
        if (statusFilter !== "all") {
            list = list.filter((u) =>
                statusFilter === "active" ? u.isActive !== false : u.isActive === false
            );
        }
        if (searchTerm.trim()) {
            const t = searchTerm.toLowerCase();
            list = list.filter(
                (u) =>
                    u.fullName?.toLowerCase().includes(t) ||
                    u.email?.toLowerCase().includes(t) ||
                    u.uid?.toLowerCase().includes(t) ||
                    u.phoneNumber?.toLowerCase().includes(t)
            );
        }
        return list;
    }, [users, searchTerm, roleFilter, statusFilter]);

    const stats = useMemo(() => ({
        total: users.length,
        active: users.filter((u) => u.isActive !== false).length,
        admins: users.filter((u) => u.role === "admin" || u.role === "super_admin").length,
        users: users.filter((u) => u.role === "user" || !u.role).length,
    }), [users]);

    const formatDate = (ts) => {
        if (!ts) return "—";
        return new Date(ts).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
        });
    };

    const getRoleBadge = (role) => {
        if (role === "super_admin") return { text: "Super Admin", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
        if (role === "admin") return { text: "Admin", cls: "text-neonPurple bg-neonPurple/10 border-neonPurple/20" };
        return { text: "User", cls: "text-slate-400 bg-slate-800 border-slate-700" };
    };

    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <Users className="w-6 h-6 text-neonCyan" />
                        All Users
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Platform-wide user directory with full profile details.
                    </p>
                </div>
                <button
                    onClick={() => fetchUsers(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Total", value: stats.total, color: "text-neonCyan" },
                    { label: "Active", value: stats.active, color: "text-neonGreen" },
                    { label: "Admins", value: stats.admins, color: "text-amber-400" },
                    { label: "Regular", value: stats.users, color: "text-slate-300" },
                ].map((s) => (
                    <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{s.label}</p>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, UID, phone..."
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-neonCyan transition-colors placeholder-slate-600"
                    />
                </div>

                {/* Role Filter */}
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:border-neonCyan outline-none"
                >
                    <option value="all">All Roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                </select>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:border-neonCyan outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>

                <span className="text-xs text-slate-500 px-2 py-1 border border-slate-700 rounded-lg text-center bg-slate-900 whitespace-nowrap">
                    {filteredUsers.length} users
                </span>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-600">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">No users found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">User</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Email</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden md:table-cell">Phone</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Role</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">Status</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">Registered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => {
                                    const badge = getRoleBadge(u.role);
                                    const isActive = u.isActive !== false;
                                    const isExpanded = expandedUser === u.uid;

                                    return (
                                        <React.Fragment key={u.uid}>
                                            <tr
                                                onClick={() => setExpandedUser(isExpanded ? null : u.uid)}
                                                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                                                            {u.fullName?.charAt(0) || "?"}
                                                        </div>
                                                        <span className="text-sm text-white font-medium truncate max-w-[140px]">
                                                            {u.fullName || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-400 font-mono truncate max-w-[180px] block">{u.email || "—"}</span>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className="text-xs text-slate-400">{u.phoneNumber || "—"}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${badge.cls}`}>
                                                        {badge.text}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <span className={`flex items-center gap-1.5 text-xs ${isActive ? "text-neonGreen" : "text-red-400"}`}>
                                                        {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <span className="text-xs text-slate-500 font-mono">{formatDate(u.createdAt)}</span>
                                                </td>
                                            </tr>

                                            {/* Expanded Row */}
                                            {isExpanded && (
                                                <tr className="bg-slate-900/80">
                                                    <td colSpan={6} className="px-6 py-4">
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                                                            <div>
                                                                <span className="text-slate-500 uppercase tracking-widest font-bold block text-[10px] mb-1">UID</span>
                                                                <span className="text-slate-300 font-mono text-[10px] break-all">{u.uid}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 uppercase tracking-widest font-bold block text-[10px] mb-1">Gender</span>
                                                                <span className="text-slate-300">{u.gender || "—"}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 uppercase tracking-widest font-bold block text-[10px] mb-1">DOB</span>
                                                                <span className="text-slate-300">{u.dateOfBirth || "—"}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 uppercase tracking-widest font-bold block text-[10px] mb-1">Blood Group</span>
                                                                <span className="text-slate-300">{u.bloodGroup || "—"}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 uppercase tracking-widest font-bold block text-[10px] mb-1">Wallet</span>
                                                                <span className="text-neonCyan/70 font-mono text-[10px] break-all">{u.walletAddress || "—"}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminUsers;
