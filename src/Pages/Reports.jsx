import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, Loader2, Link as LinkIcon, Download, AlertCircle, Copy, Check, Bot, X, Activity } from "lucide-react";
import { ethers } from "ethers";
import NavBar from "../Components/NavBar";
import { saveReportToBlockchain, getUserReports } from "../firebase/firestoreService";
import { doc, getDoc, collection, getDocs, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";

const parseAIResponse = (text) => {
    if (!text) return { error: "No text provided." };
    if (text.trim().startsWith("⚠️") && !text.includes("###")) {
        return { error: text };
    }

    const sections = { summary: "", findings: [], explanation: "", risks: "", advice: "", raw: text };

    const findSection = (headerName) => {
        const regex = new RegExp(`###\\s*\\d+\\.\\s*${headerName}\\s*([\\s\\S]*?)(?=###\\s*\\d+\\.|$)`, "i");
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    };

    sections.summary     = findSection("Summary");
    sections.explanation = findSection("Explanation");
    sections.risks       = findSection("Risks");
    sections.advice      = findSection("Advice");

    // Parse markdown table from Key Findings section
    const findingStr = findSection("Key Findings");
    if (findingStr) {
        const tableLines = findingStr
            .split("\n")
            .map(l => l.trim())
            .filter(l => l.startsWith("|") && !l.match(/^\|[-\s|]+\|$/)); // skip separator rows

        // Skip the header row (first pipe row)
        const dataRows = tableLines.slice(1);

        dataRows.forEach(row => {
            const cells = row.split("|").map(c => c.trim()).filter(Boolean);
            if (cells.length < 2) return;

            const name       = cells[0] || "";
            const value      = cells[1] || "";
            const normalRange = cells[2] || "";
            const statusRaw  = cells[3] || "";

            // Derive clean status string and color key
            let status = "Unknown";
            if (/normal/i.test(statusRaw))   status = "Normal";
            else if (/high/i.test(statusRaw)) status = "High";
            else if (/low/i.test(statusRaw))  status = "Low";

            if (name && value) {
                sections.findings.push({ name, value, normalRange, status, statusRaw });
            }
        });
    }

    return sections;
};

const StructuredReportView = ({ text }) => {
    const data = parseAIResponse(text);

    if (data.error || (!data.summary && data.findings.length === 0)) {
        return (
            <div className="text-sm text-slate-300 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-inner">
                <ReactMarkdown
                    components={{
                        h3: ({node, ...props}) => <h3 className="text-neonPurple font-bold text-sm mt-5 mb-2 uppercase tracking-wider border-b border-slate-800 pb-1" {...props} />,
                        p:  ({node, ...props}) => <p className="mb-4 leading-relaxed last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
                    }}
                >
                    {text}
                </ReactMarkdown>
            </div>
        );
    }

    const abnormalCount = data.findings.filter(f => f.status !== "Normal").length;
    const normalCount   = data.findings.filter(f => f.status === "Normal").length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Summary Card ── */}
            {data.summary && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-neonCyan/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(0,243,255,0.05)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-neonCyan/5 blur-3xl rounded-full pointer-events-none group-hover:bg-neonCyan/10 transition-all" />
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="text-3xl mt-1 select-none">🧠</div>
                        <div>
                            <h4 className="text-xs text-neonCyan font-bold uppercase tracking-wider mb-2">AI Summary</h4>
                            <p className="text-slate-200 text-[15px] leading-relaxed">{data.summary}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Key Findings Table ── */}
            {data.findings.length > 0 && (
                <div>
                    <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-neonPurple" />
                        Key Findings
                        <span className="ml-auto text-slate-600 normal-case font-normal text-[10px]">
                            {abnormalCount > 0 && <span className="text-amber-500">{abnormalCount} need attention</span>}
                            {abnormalCount > 0 && normalCount > 0 && " · "}
                            {normalCount > 0 && <span className="text-emerald-500">{normalCount} normal</span>}
                        </span>
                    </h4>

                    <div className="rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-800/80 text-left">
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[32%]">Parameter</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[22%]">Your Value</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[28%]">Normal Range</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[18%]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.findings.map((f, i) => {
                                    const stat = f.status.toLowerCase();
                                    let rowBg = "", valColor = "text-white", badge = "", badgeBg = "", badgeText = "";

                                    if (stat === "normal") {
                                        rowBg = i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60";
                                        valColor = "text-emerald-400";
                                        badge = "✅ Normal"; badgeBg = "bg-emerald-500/10"; badgeText = "text-emerald-400";
                                    } else if (stat === "high") {
                                        rowBg = "bg-amber-950/20";
                                        valColor = "text-amber-400";
                                        badge = "⚠️ High"; badgeBg = "bg-amber-500/10"; badgeText = "text-amber-400";
                                    } else if (stat === "low") {
                                        rowBg = "bg-amber-950/20";
                                        valColor = "text-amber-400";
                                        badge = "⚠️ Low"; badgeBg = "bg-amber-500/10"; badgeText = "text-amber-400";
                                    } else {
                                        rowBg = i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60";
                                        if (f.statusRaw) { badge = f.statusRaw; badgeBg = "bg-slate-700/50"; badgeText = "text-slate-400"; }
                                    }

                                    return (
                                        <tr key={i} className={`${rowBg} border-t border-slate-800/60 hover:bg-slate-800/40 transition-colors`}>
                                            <td className="px-4 py-3 text-slate-300 font-medium text-[13px]">{f.name}</td>
                                            <td className={`px-4 py-3 font-bold text-[13px] ${valColor}`}>{f.value}</td>
                                            <td className="px-4 py-3 text-slate-400 text-[12px]">{f.normalRange || "—"}</td>
                                            <td className="px-4 py-3">
                                                {badge && (
                                                    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg} ${badgeText} whitespace-nowrap`}>
                                                        {badge}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Explanation ── */}
            {data.explanation && (
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> What This Means
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{data.explanation}</p>
                </div>
            )}

            {/* ── Risks + Advice ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.risks && (
                    <div className="bg-red-950/20 border border-red-900/30 p-5 rounded-xl">
                        <h4 className="text-xs text-red-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Possible Risks
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed">{data.risks}</p>
                    </div>
                )}
                {data.advice && (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 p-5 rounded-xl">
                        <h4 className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Health Advice
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed">{data.advice}</p>
                    </div>
                )}
            </div>

            {/* ── Disclaimer ── */}
            <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-500 flex items-center justify-center gap-2">
                    ⚠️ <span className="uppercase tracking-widest">This is AI-generated and not a medical diagnosis. Please consult a doctor.</span>
                </p>
            </div>
        </div>
    );
};

const Reports = ({ user }) => {
    const [profileData, setProfileData] = useState(null);
    const [formData, setFormData] = useState({ reportTitle: "", reportType: "General", notes: "" });
    const [file, setFile] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [copiedHash, setCopiedHash] = useState(null);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");
    const [explainingId, setExplainingId] = useState(null);
    const [explanations, setExplanations] = useState({});
    const [modalReport, setModalReport] = useState(null);

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
                }
            }
        };
        fetchProfileData();
        fetchReports();
    }, [user]);

    const fetchReports = async () => {
        try {
            const data = await getUserReports(user.uid);
            setReports(data);
        } catch (error) {
            console.error("Failed to load reports", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setUploadError("");
        setUploadSuccess("");
        // CRITICAL: Clear all cached AI results to prevent cross-report contamination
        setExplanations({});
        setModalReport(null);

        try {
            let finalData = { ...formData, fileUrl: "" };
            let txHash = null;

            if (file) {
                const uploadData = new FormData();
                uploadData.append("file", file);
                uploadData.append("reportTitle", formData.reportTitle);
                uploadData.append("reportType", formData.reportType);
                uploadData.append("notes", formData.notes);

                const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`;

                let res;
                try {
                    res = await fetch(`${backendUrl}/upload`, {
                        method: "POST",
                        body: uploadData
                    });
                } catch (networkErr) {
                    throw new Error("Cannot connect to the backend server. Make sure it is running on port 5000 (run: cd backend && node server.js).");
                }

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `Backend returned error ${res.status}`);
                }
                const resData = await res.json();

                finalData.fileUrl = `ipfs://${resData.cid}`;
                finalData.summary = resData.summary;

                if (!window.ethereum) throw new Error("MetaMask not found. Please install MetaMask to interact with the blockchain.");
                const provider = new ethers.BrowserProvider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = await provider.getSigner();
                const contract = new ethers.Contract("0xe8e112009bf378220FAeDBf8BDDe368f827d4cCA", ["function addRecord(string memory _cid) public"], signer);

                const tx = await contract.addRecord(resData.cid);
                setUploadSuccess("File verified and pinned to IPFS! Waiting for blockchain confirmation...");
                await tx.wait();

                txHash = tx.hash;
            }

            // Ensure profile data is included in the user object passed to service
            const enhancedUser = { ...user, profile: profileData };
            await saveReportToBlockchain(enhancedUser, finalData, txHash);
            setFormData({ reportTitle: "", reportType: "General", notes: "" });
            setFile(null);
            setUploadSuccess(file ? "✅ Report uploaded to IPFS and recorded on blockchain!" : "✅ Report saved successfully.");

            await fetchReports();
        } catch (error) {
            console.error(error);
            // MetaMask rejection / user cancelled payment
            const msg = error?.message || "";
            const code = error?.code;
            if (code === 4001 || msg.includes("user rejected") || msg.includes("ACTION_REJECTED") || msg.includes("User denied")) {
                setUploadError(""); // clear any previous error
                setUploadSuccess("ℹ️ Payment cancelled. Your report was uploaded to IPFS but not recorded on the blockchain. You can try again anytime.");
            } else {
                setUploadError(msg || "Upload failed. Please check the console for details.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const copyToClipboard = (hash) => {
        navigator.clipboard.writeText(hash);
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    const openIPFSLink = (fileUrl) => {
        if (!fileUrl) return;
        if (fileUrl.startsWith('ipfs://')) {
            const cid = fileUrl.replace("ipfs://", "");
            window.open(`https://ipfs.io/ipfs/${cid}`, "_blank");
        }
    };

    const handleExplain = async (report) => {
        setModalReport(report);

        if (report.summary) {
            setExplanations(prev => ({ ...prev, [report.id]: report.summary }));
        } else {
            setExplanations(prev => ({ ...prev, [report.id]: "⚠️ This report was uploaded before Automatic AI Summaries were enabled. Please re-upload the document to analyze it." }));
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm("Are you sure you want to permanently delete ALL reports?")) return;
        try {
            setLoading(true);
            const q = query(collection(db, "reports"), where("uid", "==", user.uid));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "reports", document.id)));
            await Promise.all(deletePromises);
            
            // Clear local storage fallback
            const local = JSON.parse(localStorage.getItem('reports') || "[]");
            localStorage.setItem('reports', JSON.stringify(local.filter(r => r.uid !== user.uid)));
            
            await fetchReports();
        } catch (error) {
            console.error("Failed to delete records:", error);
            alert("Error deleting reports: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 p-6 md:p-12 relative z-10">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Submission Form */}
                    <div className="lg:col-span-1">
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50 relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neonCyan/10 blur-3xl rounded-full"></div>

                            <div className="relative z-10">
                                <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-1 flex items-center gap-2">
                                    <LinkIcon className="w-5 h-5 text-neonCyan" /> Upload Report
                                </h2>
                                <p className="text-sm text-slate-400 mb-6">Upload and securely store your medical reports.</p>

                                <form onSubmit={handleSubmit} className="space-y-4">

                                    {/* Error/Success Banners */}
                                    {uploadError && (
                                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-4 py-3">
                                            <span className="mt-0.5">⚠️</span>
                                            <span>{uploadError}</span>
                                        </div>
                                    )}
                                    {uploadSuccess && (
                                        <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-lg px-4 py-3">
                                            <span>{uploadSuccess}</span>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Report Title</label>
                                        <input
                                            required
                                            name="reportTitle"
                                            value={formData.reportTitle}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:border-neonCyan outline-none transition-colors"
                                            placeholder="E.g. Blood Panel Q1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Classification Category</label>
                                        <select
                                            name="reportType"
                                            value={formData.reportType}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:border-neonCyan outline-none transition-colors appearance-none"
                                        >
                                            <option value="General">General Diagnostics</option>
                                            <option value="Heart">Cardiology</option>
                                            <option value="Diabetes">Endocrinology</option>
                                            <option value="Cancer">Oncology</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Diagnostic Notes</label>
                                        <textarea
                                            required
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            rows={4}
                                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:border-neonCyan outline-none resize-none transition-colors"
                                            placeholder="..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Health Report File (Required - PDF Only)</label>
                                        <input
                                            type="file"
                                            required
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neonCyan/10 file:text-neonCyan hover:file:bg-neonCyan/20 rounded-lg px-2 py-2 text-sm focus:border-neonCyan outline-none transition-colors cursor-pointer"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 py-3 rounded-lg text-sm font-bold tracking-widest text-white transition-all hover:border-neonCyan hover:shadow-[0_0_15px_rgba(0,243,255,0.2)] disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="w-4 h-4 text-neonCyan animate-spin" /> ANALYZING & UPLOADING RECORD...</>
                                        ) : (
                                            "UPLOAD REPORT"
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Reports History */}
                    <div className="lg:col-span-2">
                        <div className="glass-card rounded-2xl p-6 border border-slate-700/50 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-neonPurple" /> Report History
                                </h2>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                                        {reports.length} Records
                                    </span>
                                    {reports.length > 0 && (
                                        <button 
                                            onClick={handleDeleteAll}
                                            className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/50 hover:bg-red-500/40 transition-colors"
                                        >
                                            Delete All
                                        </button>
                                    )}
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-neonPurple mb-4" />
                                    <span className="uppercase tracking-widest text-xs font-bold">Loading records...</span>
                                </div>
                            ) : reports.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl p-8">
                                    <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="text-sm">No medical records found for your account.</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar max-h-[600px]">
                                    {reports.map((report) => (
                                        <div
                                            key={report.id}
                                            onClick={() => openIPFSLink(report.fileUrl)}
                                            className={`bg-slate-900/50 border border-slate-700/80 rounded-xl p-4 transition-colors ${report.fileUrl ? 'cursor-pointer hover:border-neonCyan hover:shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 'hover:border-neonCyan/50'}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.reportType === 'Heart' ? 'bg-rose-500/20 text-rose-400' :
                                                        report.reportType === 'Diabetes' ? 'bg-blue-500/20 text-blue-400' :
                                                            report.reportType === 'Cancer' ? 'bg-neonPurple/20 text-neonPurple' :
                                                                'bg-slate-700/50 text-slate-300'
                                                        }`}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-200">{report.reportTitle}</h3>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider">{report.reportType}</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 text-right">
                                                    {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-400 mb-4">
                                                {report.notes}
                                            </p>

                                            <div className="mt-4 border-t border-slate-700/50 pt-4 mb-4">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleExplain(report); }}
                                                    disabled={!report.notes && !report.fileUrl}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neonPurple/10 text-neonPurple border border-neonPurple/30 hover:bg-neonPurple/20 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Bot className="w-4 h-4" /> Explain with AI
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-2 border border-slate-800">
                                                <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse"></div>
                                                <span className="text-[10px] uppercase font-mono text-slate-500">Receipt ID:</span>
                                                <span className="text-[10px] font-mono text-neonCyan truncate flex-1">{report.txHash}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(report.txHash);
                                                    }}
                                                    className="text-slate-500 hover:text-white transition-colors"
                                                >
                                                    {copiedHash === report.txHash ? <Check className="w-4 h-4 text-neonGreen" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* AI Explanation Modal */}
            {modalReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalReport(null)}>
                    <div 
                        className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
                            <h3 className="text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <Bot className="w-5 h-5 text-neonPurple" /> AI Analysis
                            </h3>
                            <button 
                                onClick={() => setModalReport(null)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Report For:</p>
                                <p className="font-bold text-white text-md">{modalReport.reportTitle}</p>
                            </div>
                            
                            {explainingId === modalReport.id ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Loader2 className="w-10 h-10 animate-spin text-neonPurple mb-4" />
                                    <p className="uppercase tracking-widest text-xs font-bold animate-pulse text-neonPurple">Groq AI is analyzing the report...</p>
                                </div>
                            ) : explanations[modalReport.id] ? (
                                <StructuredReportView text={explanations[modalReport.id]} />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
// hey