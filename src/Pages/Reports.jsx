import React, { useState, useEffect } from "react";
import { FileText, Loader2, Link as LinkIcon, Download, AlertCircle, Copy, Check } from "lucide-react";
import { ethers } from "ethers";
import NavBar from "../Components/NavBar";
import { saveReportToBlockchain, getUserReports } from "../firebase/firestoreService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

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

        try {
            let finalData = { ...formData, fileUrl: "" };
            let txHash = null;

            if (file) {
                const uploadData = new FormData();
                uploadData.append("file", file);

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

                if (!window.ethereum) throw new Error("MetaMask not found. Please install MetaMask to interact with the blockchain.");
                const provider = new ethers.BrowserProvider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = await provider.getSigner();
                const contract = new ethers.Contract("0xe8e112009bf378220FAeDBf8BDDe368f827d4cCA", ["function addRecord(string memory _cid) public"], signer);

                const tx = await contract.addRecord(resData.cid);
                setUploadSuccess("File uploaded to IPFS! Waiting for blockchain confirmation...");
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
            setUploadError(error.message || "Upload failed. Please check the console for details.");
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
                                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Health Report File (Optional)</label>
                                        <input
                                            type="file"
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
                                            <><Loader2 className="w-4 h-4 text-neonCyan animate-spin" /> UPLOADING RECORD...</>
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
                                <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                                    {reports.length} Records
                                </span>
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

                                            <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                                                {report.notes}
                                            </p>

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
        </div>
    );
};

export default Reports;
