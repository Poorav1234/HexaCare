// src/admin/AdminLogs.jsx
// SOC-style security monitoring panel with real-time polling,
// event type + time range filters, and suspicious activity highlighting.

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
    AlertTriangle,
    Shield,
    Lock,
    KeyRound,
    Clock,
    Zap,
    Eye,
    XCircle,
    CheckCircle2,
    Radio,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getActivityLogs, LOG_ACTIONS, getSecurityLogs } from "../firebase/logService";

// ─── Action metadata for display ─────────────────────────────────────────────
const ACTION_META = {
    [LOG_ACTIONS.USER_LOGIN]: {
        label: "User Login",
        icon: LogIn,
        color: "text-neonCyan",
        bg: "bg-neonCyan/10",
        severity: "info",
    },
    [LOG_ACTIONS.USER_REGISTER]: {
        label: "User Registered",
        icon: UserPlus,
        color: "text-neonPurple",
        bg: "bg-neonPurple/10",
        severity: "info",
    },
    [LOG_ACTIONS.REPORT_SUBMITTED]: {
        label: "Report Submitted",
        icon: FileText,
        color: "text-blue-400",
        bg: "bg-blue-400/10",
        severity: "info",
    },
    [LOG_ACTIONS.BLOCKCHAIN_STORED]: {
        label: "Blockchain Stored",
        icon: LinkIcon,
        color: "text-neonGreen",
        bg: "bg-neonGreen/10",
        severity: "info",
    },
    [LOG_ACTIONS.PREDICTION_RUN]: {
        label: "Prediction Run",
        icon: Brain,
        color: "text-violet-400",
        bg: "bg-violet-400/10",
        severity: "info",
    },
    [LOG_ACTIONS.ADMIN_CREATED]: {
        label: "Admin Created",
        icon: UserPlus,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        severity: "warning",
    },
    [LOG_ACTIONS.ADMIN_ACTIVATED]: {
        label: "Admin Activated",
        icon: ShieldCheck,
        color: "text-neonGreen",
        bg: "bg-neonGreen/10",
        severity: "info",
    },
    [LOG_ACTIONS.ADMIN_DEACTIVATED]: {
        label: "Admin Deactivated",
        icon: ShieldOff,
        color: "text-red-400",
        bg: "bg-red-400/10",
        severity: "warning",
    },
    [LOG_ACTIONS.ROLE_CHANGED]: {
        label: "Role Changed",
        icon: ShieldCheck,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        severity: "warning",
    },
    [LOG_ACTIONS.PROFILE_UPDATED]: {
        label: "Profile Updated",
        icon: User,
        color: "text-slate-300",
        bg: "bg-slate-700/50",
        severity: "info",
    },
    // ── Security Events ──────────────────────────────────────────────────
    [LOG_ACTIONS.LOGIN_FAILED]: {
        label: "Failed Login",
        icon: XCircle,
        color: "text-red-400",
        bg: "bg-red-500/10",
        severity: "warning",
    },
    [LOG_ACTIONS.ACCOUNT_LOCKED]: {
        label: "Account Locked",
        icon: Lock,
        color: "text-red-500",
        bg: "bg-red-500/15",
        severity: "critical",
    },
    [LOG_ACTIONS.OTP_REQUESTED]: {
        label: "OTP Requested",
        icon: KeyRound,
        color: "text-amber-300",
        bg: "bg-amber-400/10",
        severity: "info",
    },
    [LOG_ACTIONS.PASSWORD_RESET]: {
        label: "Password Reset",
        icon: KeyRound,
        color: "text-neonCyan",
        bg: "bg-neonCyan/10",
        severity: "warning",
    },
    [LOG_ACTIONS.ADMIN_LOGIN]: {
        label: "Admin Login",
        icon: Shield,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        severity: "info",
    },
    [LOG_ACTIONS.ADMIN_ACTION]: {
        label: "Admin Action",
        icon: Zap,
        color: "text-violet-400",
        bg: "bg-violet-400/10",
        severity: "info",
    },
};

const DEFAULT_META = {
    label: "Unknown Action",
    icon: Activity,
    color: "text-slate-400",
    bg: "bg-slate-800",
    severity: "info",
};

// ─── Time Range Options ──────────────────────────────────────────────────────
const TIME_RANGES = [
    { label: "All Time", value: "all" },
    { label: "Last 1 Hour", value: "1h", ms: 60 * 60 * 1000 },
    { label: "Last 6 Hours", value: "6h", ms: 6 * 60 * 60 * 1000 },
    { label: "Last 24 Hours", value: "24h", ms: 24 * 60 * 60 * 1000 },
    { label: "Last 7 Days", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "Last 30 Days", value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
];

// ─── View Mode ───────────────────────────────────────────────────────────────
const VIEW_MODES = [
    { label: "All Events", value: "all" },
    { label: "Security Only", value: "security" },
];

const SEVERITY_STYLES = {
    info: "",
    warning: "border-l-2 border-l-amber-400/50",
    critical: "border-l-2 border-l-red-500 bg-red-500/5",
};

const AdminLogs = ({ user }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const autoRefreshRef = useRef(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [timeRange, setTimeRange] = useState("all");
    const [viewMode, setViewMode] = useState("all");

    // ── Data Fetching ────────────────────────────────────────────────────────
    const fetchLogs = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const filters = {};
            // We intentionally do not pass `actionFilter` to the backend.
            // Firestore requires explicit compound indexes for where(action) + orderBy(timestamp).
            // Instead, we fetch the 200/300 most recent documents and filter them locally.

            let data;
            if (viewMode === "security") {
                data = await getSecurityLogs(300);
            } else {
                data = await getActivityLogs(filters);
            }
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [viewMode]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // ── Auto-Refresh (near real-time polling) ────────────────────────────────
    useEffect(() => {
        if (autoRefresh) {
            autoRefreshRef.current = setInterval(() => {
                fetchLogs(true);
            }, 15000); // Poll every 15 seconds
        } else {
            if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
        }
        return () => {
            if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
        };
    }, [autoRefresh, fetchLogs]);

    // ── Filtering ────────────────────────────────────────────────────────────
    const filteredLogs = useMemo(() => {
        let result = logs;

        // Time range filter
        if (timeRange !== "all") {
            const range = TIME_RANGES.find(r => r.value === timeRange);
            if (range?.ms) {
                const cutoff = Date.now() - range.ms;
                result = result.filter((log) => {
                    const ts = log.timestamp?.toDate
                        ? log.timestamp.toDate().getTime()
                        : log.timestamp?.seconds
                        ? log.timestamp.seconds * 1000
                        : 0;
                    return ts > cutoff;
                });
            }
        }

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (log) =>
                    log.action?.toLowerCase().includes(term) ||
                    (ACTION_META[log.action]?.label || "").toLowerCase().includes(term) ||
                    JSON.stringify(log.metadata || {}).toLowerCase().includes(term)
            );
        }

        return result;
    }, [logs, searchTerm, timeRange]);

    // ── Security Summary Stats ───────────────────────────────────────────────
    const securityStats = useMemo(() => {
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;

        let totalLogins = 0;
        let failedLogins = 0;
        let accountLocks = 0;
        let adminActions = 0;

        logs.forEach((log) => {
            const ts = log.timestamp?.toDate
                ? log.timestamp.toDate().getTime()
                : log.timestamp?.seconds
                ? log.timestamp.seconds * 1000
                : 0;

            if (ts < last24h) return;

            switch (log.action) {
                case LOG_ACTIONS.USER_LOGIN:
                case LOG_ACTIONS.ADMIN_LOGIN:
                    totalLogins++;
                    break;
                case LOG_ACTIONS.LOGIN_FAILED:
                    failedLogins++;
                    break;
                case LOG_ACTIONS.ACCOUNT_LOCKED:
                    accountLocks++;
                    break;
                case LOG_ACTIONS.ADMIN_CREATED:
                case LOG_ACTIONS.ADMIN_ACTIVATED:
                case LOG_ACTIONS.ADMIN_DEACTIVATED:
                case LOG_ACTIONS.ROLE_CHANGED:
                case LOG_ACTIONS.ADMIN_ACTION:
                    adminActions++;
                    break;
            }
        });

        return { totalLogins, failedLogins, accountLocks, adminActions };
    }, [logs]);

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

    const isSuspicious = (log) => {
        return log.action === LOG_ACTIONS.LOGIN_FAILED ||
               log.action === LOG_ACTIONS.ACCOUNT_LOCKED ||
               log.severity === "critical" ||
               log.severity === "warning";
    };

    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <Shield className="w-6 h-6 text-neonCyan" />
                        Security Operations Center
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Real-time security monitoring and event tracking.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Auto-refresh Toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                            autoRefresh
                                ? "bg-neonGreen/10 border-neonGreen/30 text-neonGreen"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                    >
                        <Radio className={`w-3 h-3 ${autoRefresh ? "animate-pulse" : ""}`} />
                        {autoRefresh ? "Live" : "Auto"}
                    </button>
                    <button
                        onClick={() => fetchLogs(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Security Summary Cards ──────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="glass-card rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-neonGreen" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Logins (24h)</p>
                    </div>
                    <p className="text-2xl font-black text-neonGreen">{securityStats.totalLogins}</p>
                </div>
                <div className="glass-card rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Failed (24h)</p>
                    </div>
                    <p className={`text-2xl font-black ${securityStats.failedLogins > 0 ? "text-red-400" : "text-slate-500"}`}>
                        {securityStats.failedLogins}
                    </p>
                </div>
                <div className="glass-card rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-red-500" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Locks (24h)</p>
                    </div>
                    <p className={`text-2xl font-black ${securityStats.accountLocks > 0 ? "text-red-500" : "text-slate-500"}`}>
                        {securityStats.accountLocks}
                    </p>
                </div>
                <div className="glass-card rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Admin Ops (24h)</p>
                    </div>
                    <p className="text-2xl font-black text-amber-400">{securityStats.adminActions}</p>
                </div>
            </div>

            {/* ── Filter Bar ─────────────────────────────────────────────── */}
            <div className="glass-card rounded-2xl p-4 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 relative z-50">
                {/* View Mode Tabs */}
                <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
                    {VIEW_MODES.map((mode) => (
                        <button
                            key={mode.value}
                            onClick={() => setViewMode(mode.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                viewMode === mode.value
                                    ? "bg-neonCyan/20 text-neonCyan border border-neonCyan/30"
                                    : "text-slate-400 hover:text-white border border-transparent"
                            }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search events..."
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-neonCyan transition-colors placeholder-slate-600"
                    />
                </div>

                {/* Time Range */}
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:border-neonCyan outline-none"
                >
                    {TIME_RANGES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>

                {/* Count */}
                <span className="text-xs text-slate-500 px-2 py-1 border border-slate-700 rounded-lg text-center bg-slate-900 whitespace-nowrap">
                    {filteredLogs.length} events
                </span>
            </div>

            {/* ── Events Table ────────────────────────────────────────────── */}
            <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-600">
                        <ScrollText className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">No events found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold w-6"></th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                                        Timestamp
                                    </th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                                        Event
                                    </th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">
                                        Target User
                                    </th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => {
                                    const meta = ACTION_META[log.action] || DEFAULT_META;
                                    const Icon = meta.icon;
                                    const suspicious = isSuspicious(log);
                                    const severityStyle = SEVERITY_STYLES[log.severity || meta.severity] || "";

                                    return (
                                        <tr
                                            key={log.id}
                                            className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${severityStyle}`}
                                        >
                                            {/* Severity Indicator */}
                                            <td className="px-2 py-3">
                                                {suspicious && (
                                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                                )}
                                            </td>

                                            {/* Timestamp */}
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                                                    {formatTimestamp(log.timestamp)}
                                                </span>
                                            </td>

                                            {/* Event */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg}`}>
                                                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                                                    </div>
                                                    <div>
                                                        <span className={`text-xs font-medium ${meta.color}`}>
                                                            {meta.label}
                                                        </span>
                                                        {suspicious && (
                                                            <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                Alert
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Target User */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                {log.email || log.userId ? (
                                                    <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-1 rounded inline-block border border-slate-700/50">
                                                        {log.email || log.userId}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600">—</span>
                                                )}
                                            </td>

                                            {/* Metadata */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                {log.metadata && Object.keys(log.metadata).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(log.metadata).map(([key, value]) => (
                                                            <span
                                                                key={key}
                                                                className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50"
                                                            >
                                                                {key}: {String(value).substring(0, 20)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600">—</span>
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

            {/* Auto-refresh indicator */}
            {autoRefresh && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neonGreen/60">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Live monitoring active — refreshing every 15 seconds
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminLogs;
