// src/admin/AdminReports.jsx
// Blockchain reports overview — metadata only.
// ❌ No report content, user names, emails, or personal linkage.
// ✅ Only Report ID, timestamp, type, status, and tx hash.

import React, { useEffect, useState, useMemo } from "react";
import {
    FileText,
    Search,
    Loader2,
    RefreshCw,
    Copy,
    Check,
    Lock,
    Shield,
    Link as LinkIcon,
    BarChart3,
    CheckCircle2,
    Clock,
    Hash,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getReportMetadataOnly } from "../firebase/adminService";

const AdminReports = ({ user }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [copiedHash, setCopiedHash] = useState(null);

    const fetchReports = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await getReportMetadataOnly();
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
        if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
        if (searchTerm.trim()) {
            const t = searchTerm.toLowerCase();
            list = list.filter(
                (r) =>
                    r.id?.toLowerCase().includes(t) ||
                    r.txHash?.toLowerCase().includes(t) ||
                    r.reportType?.toLowerCase().includes(t)
            );
        }
        return list;
    }, [reports, searchTerm, typeFilter, statusFilter]);

    const stats = useMemo(() => {
        const types = {};
        let onChain = 0;
        let pending = 0;
        reports.forEach((r) => {
            types[r.reportType] = (types[r.reportType] || 0) + 1;
            if (r.status === "On-Chain") onChain++;
            else pending++;
        });
        return { total: reports.length, types, onChain, pending };
    }, [reports]);

    const formatDate = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const copyToClipboard = (hash) => {
        navigator.clipboard.writeText(hash);
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    const shortenHash = (hash) => {
        if (!hash) return "—";
        return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
    };

    const typeColors = {
        Heart: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        Diabetes: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
        Cancer: { color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
        General: { color: "text-slate-400", bg: "bg-slate-700/50", border: "border-slate-600/30" },
    };

    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <FileText className="w-6 h-6 text-neonPurple" />
                        Blockchain Reports
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Metadata overview of medical records on blockchain.
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

            {/* Privacy Notice */}
            <div className="glass-card rounded-xl p-4 mb-6 flex items-center gap-3 border border-amber-500/20 bg-amber-500/5">
                <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400/80">
                    <strong>Privacy Enforced:</strong> Only report metadata (ID, timestamp, status) is displayed. Report content, user identities, and personal data are not accessible.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total</p>
                    <p className="text-2xl font-black text-neonCyan">{stats.total}</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-neonGreen" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">On-Chain</p>
                    </div>
                    <p className="text-2xl font-black text-neonGreen">{stats.onChain}</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pending</p>
                    </div>
                    <p className="text-2xl font-black text-amber-400">{stats.pending}</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Types</p>
                    <p className="text-2xl font-black text-violet-400">{Object.keys(stats.types).length}</p>
                </div>
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
                        placeholder="Search by report ID, tx hash, or type..."
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

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:border-neonCyan outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="On-Chain">On-Chain</option>
                    <option value="Pending">Pending</option>
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
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Report ID</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Type</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Timestamp</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Status</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden md:table-cell">Tx Hash</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold hidden lg:table-cell">IPFS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((r) => {
                                    const tc = typeColors[r.reportType] || typeColors.General;

                                    return (
                                        <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            {/* Report ID */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-3 h-3 text-slate-600" />
                                                    <span className="text-xs text-slate-300 font-mono truncate max-w-[120px]">{r.id}</span>
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${tc.color} ${tc.bg} ${tc.border}`}>
                                                    {r.reportType}
                                                </span>
                                            </td>

                                            {/* Timestamp */}
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{formatDate(r.createdAt)}</span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`flex items-center gap-1.5 text-xs font-medium ${
                                                    r.status === "On-Chain" ? "text-neonGreen" : "text-amber-400"
                                                }`}>
                                                    {r.status === "On-Chain" ? (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    ) : (
                                                        <Clock className="w-3 h-3" />
                                                    )}
                                                    {r.status}
                                                </span>
                                            </td>

                                            {/* Tx Hash */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {r.txHash ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-mono text-neonCyan truncate max-w-[110px]">{shortenHash(r.txHash)}</span>
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

                                            {/* IPFS */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className={`flex items-center gap-1 text-xs ${r.hasIPFS ? "text-neonCyan/70" : "text-slate-600"}`}>
                                                    <LinkIcon className="w-3 h-3" />
                                                    {r.hasIPFS ? "Stored" : "—"}
                                                </span>
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
