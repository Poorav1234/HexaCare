// src/admin/AdminLogs.jsx
// Filterable, sortable activity logs table for admins.

import React, { useEffect, useState, useMemo } from "react";
import {
    ScrollText,
    Search,
    Filter,
    Loader2,
    RefreshCw,
    ChevronDown,
    LogIn,
    FileText,
    Link as LinkIcon,
    UserPlus,
    ShieldCheck,
    ShieldOff,
    Activity,
    Brain,
    User,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getActivityLogs, LOG_ACTIONS } from "../firebase/logService";

// ─── Action metadata for display ─────────────────────────────────────────────
const ACTION_META = {
    [LOG_ACTIONS.USER_LOGIN]: {
        label: "User Login",
        icon: LogIn,
        color: "text-neonCyan",
        bg: "bg-neonCyan/10",
    },
    [LOG_ACTIONS.USER_REGISTER]: {
        label: "User Registered",
        icon: UserPlus,
        color: "text-neonPurple",
        bg: "bg-neonPurple/10",
    },
    [LOG_ACTIONS.REPORT_SUBMITTED]: {
        label: "Report Submitted",
        icon: FileText,
        color: "text-blue-400",
        bg: "bg-blue-400/10",
    },
    [LOG_ACTIONS.BLOCKCHAIN_STORED]: {
        label: "Blockchain Stored",
        icon: LinkIcon,
        color: "text-neonGreen",
        bg: "bg-neonGreen/10",
    },
    [LOG_ACTIONS.PREDICTION_RUN]: {
        label: "Prediction Run",
        icon: Brain,
        color: "text-violet-400",
        bg: "bg-violet-400/10",
    },
    [LOG_ACTIONS.ADMIN_CREATED]: {
        label: "Admin Created",
        icon: UserPlus,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
    },
    [LOG_ACTIONS.ADMIN_ACTIVATED]: {
        label: "Admin Activated",
        icon: ShieldCheck,
        color: "text-neonGreen",
        bg: "bg-neonGreen/10",
    },
    [LOG_ACTIONS.ADMIN_DEACTIVATED]: {
        label: "Admin Deactivated",
        icon: ShieldOff,
        color: "text-red-400",
        bg: "bg-red-400/10",
    },
    [LOG_ACTIONS.ROLE_CHANGED]: {
        label: "Role Changed",
        icon: ShieldCheck,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
    },
    [LOG_ACTIONS.PROFILE_UPDATED]: {
        label: "Profile Updated",
        icon: User,
        color: "text-slate-300",
        bg: "bg-slate-700/50",
    },
};

const DEFAULT_META = {
    label: "Unknown Action",
    icon: Activity,
    color: "text-slate-400",
    bg: "bg-slate-800",
};

const AdminLogs = ({ user }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // ── Data Fetching ────────────────────────────────────────────────────────
    const fetchLogs = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const filters = {};
            if (actionFilter !== "all") filters.action = actionFilter;

            const data = await getActivityLogs(filters);
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [actionFilter]);

    // ── Filtering ────────────────────────────────────────────────────────────
    const filteredLogs = useMemo(() => {
        if (!searchTerm.trim()) return logs;

        const term = searchTerm.toLowerCase();
        return logs.filter(
            (log) =>
                log.email?.toLowerCase().includes(term) ||
                log.userId?.toLowerCase().includes(term) ||
                log.action?.toLowerCase().includes(term) ||
                JSON.stringify(log.metadata || {})
                    .toLowerCase()
                    .includes(term)
        );
    }, [logs, searchTerm]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatTimestamp = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    };

    const uniqueActions = useMemo(() => {
        const actions = new Set(logs.map((l) => l.action));
        return Array.from(actions);
    }, [logs]);

    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <ScrollText className="w-6 h-6 text-neonCyan" />
                        Activity Logs
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        System-wide event history with filtering support.
                    </p>
                </div>
                <button
                    onClick={() => fetchLogs(true)}
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

            {/* Filters Bar */}
            <div className="glass-card rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by email, user ID, or action..."
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-neonCyan transition-colors placeholder-slate-600"
                    />
                </div>

                {/* Action Filter */}
                <div className="relative">
                    <button
                        onClick={() =>
                            setShowFilterDropdown(!showFilterDropdown)
                        }
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700 text-sm text-slate-300 rounded-xl hover:border-neonCyan transition-colors w-full sm:w-auto"
                    >
                        <Filter className="w-4 h-4 text-slate-500" />
                        {actionFilter === "all"
                            ? "All Actions"
                            : ACTION_META[actionFilter]?.label || actionFilter}
                        <ChevronDown className="w-3 h-3 ml-1 text-slate-500" />
                    </button>

                    {showFilterDropdown && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowFilterDropdown(false)}
                            />
                            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-20 overflow-hidden max-h-72 overflow-y-auto">
                                <button
                                    onClick={() => {
                                        setActionFilter("all");
                                        setShowFilterDropdown(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                        actionFilter === "all"
                                            ? "text-neonCyan bg-slate-800"
                                            : "text-slate-300 hover:bg-slate-800"
                                    }`}
                                >
                                    All Actions
                                </button>
                                {Object.entries(LOG_ACTIONS).map(
                                    ([key, value]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setActionFilter(value);
                                                setShowFilterDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                                actionFilter === value
                                                    ? "text-neonCyan bg-slate-800"
                                                    : "text-slate-300 hover:bg-slate-800"
                                            }`}
                                        >
                                            {ACTION_META[value]?.label || value}
                                        </button>
                                    )
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Count */}
                <span className="text-xs text-slate-500 px-2 py-1 border border-slate-700 rounded-lg text-center bg-slate-900 whitespace-nowrap">
                    {filteredLogs.length} entries
                </span>
            </div>

            {/* Logs Table */}
            <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-600">
                        <ScrollText className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">No activity logs found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                                        Timestamp
                                    </th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                                        Action
                                    </th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => {
                                    const meta =
                                        ACTION_META[log.action] ||
                                        DEFAULT_META;
                                    const Icon = meta.icon;

                                    return (
                                        <tr
                                            key={log.id}
                                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                                        >
                                            {/* Timestamp */}
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                                                    {formatTimestamp(
                                                        log.timestamp
                                                    )}
                                                </span>
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg}`}
                                                    >
                                                        <Icon
                                                            className={`w-3.5 h-3.5 ${meta.color}`}
                                                        />
                                                    </div>
                                                    <span
                                                        className={`text-xs font-medium ${meta.color}`}
                                                    >
                                                        {meta.label}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* User */}
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-xs text-slate-300 truncate max-w-[180px]">
                                                        {log.email || "—"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600 font-mono truncate max-w-[180px]">
                                                        {log.userId}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Metadata */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                {log.metadata &&
                                                Object.keys(log.metadata)
                                                    .length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(
                                                            log.metadata
                                                        ).map(
                                                            ([key, value]) => (
                                                                <span
                                                                    key={key}
                                                                    className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50"
                                                                >
                                                                    {key}:{" "}
                                                                    {String(
                                                                        value
                                                                    ).substring(
                                                                        0,
                                                                        20
                                                                    )}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
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

export default AdminLogs;
