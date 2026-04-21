// src/admin/AdminReports.jsx
// Admin page to view all platform reports with search, filters, and stats.

import React, { useEffect, useState, useMemo } from "react";
import {
    FileText,
    Search,
    Loader2,
    RefreshCw,
    Link as LinkIcon,
    Copy,
    Check,
    ExternalLink,
    Heart,
    Activity,
    Brain,
    Stethoscope,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getAllReportsAdmin } from "../firebase/adminService";

const TYPE_META = {
    Heart: { icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" },
    Diabetes: { icon: Activity, color: "text-blue-400", bg: "bg-blue-400/10" },
    Cancer: { icon: Brain, color: "text-neonPurple", bg: "bg-neonPurple/10" },
    General: { icon: Stethoscope, color: "text-slate-300", bg: "bg-slate-700/50" },
};

const AdminReports = ({ user }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [copiedHash, setCopiedHash] = useState(null);

    const fetchReports = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await getAllReportsAdmin();
            setReports(data);
        } catch (err) {
            console.error("Failed to fetch reports:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    const filteredReports = useMemo(() => {
        let list = reports;
        if (typeFilter !== "all") list = list.filter((r) => r.reportType === typeFilter);
        if (searchTerm.trim()) {
            const t = searchTerm.toLowerCase();
            list = list.filter(
                (r) =>
                    r.reportTitle?.toLowerCase().includes(t) ||
                    r.userName?.toLowerCase().includes(t) ||
                    r.userEmail?.toLowerCase().includes(t) ||
                    r.txHash?.toLowerCase().includes(t) ||
                    r.notes?.toLowerCase().includes(t)
            );
        }
        return list;
    }, [reports, searchTerm, typeFilter]);

    const stats = useMemo(() => {
        const types = {};
        reports.forEach((r) => {
            types[r.reportType] = (types[r.reportType] || 0) + 1;
        });
        return { total: reports.length, types };
    }, [reports]);

    const formatDate = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    const copyToClipboard = (hash) => {
        navigator.clipboard.writeText(hash);
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    const openIPFS = (url) => {
        if (!url) return;
        if (url.startsWith("ipfs://")) {
            window.open(`https://ipfs.io/ipfs/${url.replace("ipfs://", "")}`, "_blank");
        }
    };

    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <FileText className="w-6 h-6 text-neonPurple" />
                        All Reports
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Platform-wide medical reports stored on blockchain.
                    </p>
                </div>
                <button
                    onClick={() => fetchReports(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total</p>
                    <p className="text-2xl font-black text-neonCyan">{stats.total}</p>
                </div>
                {Object.entries(TYPE_META).map(([type, meta]) => (
                    <div key={type} className="glass-card rounded-xl p-4 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{type}</p>
                        <p className={`text-2xl font-black ${meta.color}`}>{stats.types[type] || 0}</p>
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
                        placeholder="Search by title, user, hash, notes..."
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-neonCyan transition-colors placeholder-slate-600"
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:border-neonCyan outline-none"
                >
                    <option value="all">All Types</option>
                    <option value="General">General</option>
                    <option value="Heart">Heart</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Cancer">Cancer</option>
                </select>

                <span className="text-xs text-slate-500 px-2 py-1 border border-slate-700 rounded-lg text-center bg-slate-900 whitespace-nowrap">
                    {filteredReports.length} reports
                </span>
            </div>

            {/* Reports Table */}
            <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-600">
                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">No reports found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Report</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Type</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden md:table-cell">User</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">Date</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Tx Hash</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">IPFS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((r) => {
                                    const meta = TYPE_META[r.reportType] || TYPE_META.General;
                                    const Icon = meta.icon;

                                    return (
                                        <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-sm text-white font-medium truncate max-w-[200px]">{r.reportTitle || "—"}</p>
                                                    <p className="text-[10px] text-slate-600 font-mono truncate max-w-[200px]">{r.notes?.substring(0, 50) || ""}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg}`}>
                                                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                                                    </div>
                                                    <span className={`text-xs font-medium ${meta.color}`}>{r.reportType}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div>
                                                    <p className="text-xs text-slate-300 truncate max-w-[150px]">{r.userName || "—"}</p>
                                                    <p className="text-[10px] text-slate-600 font-mono truncate max-w-[150px]">{r.userEmail || ""}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className="text-xs text-slate-500 font-mono">{formatDate(r.createdAt)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.txHash ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-mono text-neonCyan truncate max-w-[100px]">{r.txHash}</span>
                                                        <button
                                                            onClick={() => copyToClipboard(r.txHash)}
                                                            className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
                                                        >
                                                            {copiedHash === r.txHash ? <Check className="w-3 h-3 text-neonGreen" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                {r.fileUrl ? (
                                                    <button
                                                        onClick={() => openIPFS(r.fileUrl)}
                                                        className="flex items-center gap-1 text-neonCyan/70 hover:text-neonCyan text-xs transition-colors"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View
                                                    </button>
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
        </AdminLayout>
    );
};

export default AdminReports;
