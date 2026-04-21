// src/admin/AdminManagement.jsx
// Super-admin-only page for creating, viewing, and toggling admin users.
// Requires password re-authentication before allowing admin creation.

import React, { useEffect, useState } from "react";
import {
    UserPlus,
    Users,
    Mail,
    Lock,
    User,
    Loader2,
    ShieldCheck,
    ShieldOff,
    Shield,
    Copy,
    Check,
    Eye,
    EyeOff,
    AlertTriangle,
    KeyRound,
} from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import AdminLayout from "./AdminLayout";
import {
    createAdminUser,
    getAllAdmins,
    toggleAdminStatus,
} from "../firebase/adminService";

const AdminManagement = ({ user }) => {
    // ── State ────────────────────────────────────────────────────────────────
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ── Re-auth Gate ─────────────────────────────────────────────────────────
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authPassword, setAuthPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    // After creation, hold the credentials briefly so super admin can copy them
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    const [toggleLoading, setToggleLoading] = useState(null); // uid being toggled
    const [successMessage, setSuccessMessage] = useState("");

    // ── Data Fetching ────────────────────────────────────────────────────────
    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const data = await getAllAdmins();
            setAdmins(data);
        } catch (error) {
            console.error("Failed to fetch admins:", error);
        } finally {
            setLoading(false);
        }
    };

    // ── Validation ───────────────────────────────────────────────────────────
    const validate = () => {
        const newErrors = {};

        if (!form.name.trim()) newErrors.name = "Name is required";

        if (!form.email.trim()) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email))
            newErrors.email = "Invalid email format";

        if (!form.password) newErrors.password = "Password is required";
        else if (form.password.length < 8)
            newErrors.password = "Minimum 8 characters";
        else if (!/[A-Z]/.test(form.password))
            newErrors.password = "Must contain an uppercase letter";
        else if (!/[0-9]/.test(form.password))
            newErrors.password = "Must contain a number";

        if (!form.confirmPassword)
            newErrors.confirmPassword = "Please confirm the password";
        else if (form.password !== form.confirmPassword)
            newErrors.confirmPassword = "Passwords do not match";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setSuccessMessage("");
        setCreatedCredentials(null);

        try {
            const result = await createAdminUser({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                createdByUid: user.uid,
                createdByEmail: user.email,
            });

            // Show credentials so super admin can share manually if email fails
            setCreatedCredentials({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
            });

            setForm({ name: "", email: "", password: "", confirmPassword: "" });
            setSuccessMessage(`Admin "${result.name}" created successfully.`);

            // Refresh admin list
            await fetchAdmins();
        } catch (error) {
            setErrors({ submit: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (uid, currentlyActive) => {
        setToggleLoading(uid);
        try {
            await toggleAdminStatus(
                uid,
                !currentlyActive,
                user.uid,
                user.email
            );
            await fetchAdmins();
        } catch (error) {
            console.error("Toggle failed:", error);
        } finally {
            setToggleLoading(null);
        }
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // ── Re-authentication Handler ────────────────────────────────────────────
    const handleReAuth = async (e) => {
        e.preventDefault();
        if (!authPassword) { setAuthError("Password is required."); return; }
        setAuthLoading(true);
        setAuthError("");
        try {
            await signInWithEmailAndPassword(auth, user.email, authPassword);
            setIsAuthenticated(true);
            setAuthPassword("");
        } catch (err) {
            if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                setAuthError("Incorrect password. Please try again.");
            } else {
                setAuthError(err.message || "Authentication failed.");
            }
        } finally {
            setAuthLoading(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <AdminLayout user={user}>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                    <Users className="w-6 h-6 text-neonPurple" />
                    Admin Management
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Create, activate, and deactivate admin accounts.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ── Create Admin Form ─────────────────────────────────── */}
                <div className="lg:col-span-2">
                    <div className="glass-card rounded-2xl p-6 border border-slate-700/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-neonPurple/10 blur-3xl rounded-full pointer-events-none" />

                        {!isAuthenticated ? (
                            /* ── Re-auth Gate ──────────────────────────── */
                            <div className="relative z-10">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                        <KeyRound className="w-8 h-8 text-amber-400" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-1">
                                        Verify Identity
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Re-enter your password to access admin creation.
                                    </p>
                                </div>

                                <form onSubmit={handleReAuth} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                            Super Admin Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <input
                                                type="password"
                                                value={authPassword}
                                                onChange={(e) => { setAuthPassword(e.target.value); setAuthError(""); }}
                                                placeholder="Enter your password"
                                                className={`w-full bg-slate-900 border ${authError ? "border-red-500/50" : "border-slate-700 focus:border-amber-400"} text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder-slate-600`}
                                            />
                                        </div>
                                        {authError && <p className="mt-1 text-xs text-red-400">{authError}</p>}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={authLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-amber-500/30 py-3 rounded-xl text-sm font-bold tracking-wider text-white transition-all hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {authLoading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin text-amber-400" /> VERIFYING...</>
                                        ) : (
                                            <><Shield className="w-4 h-4 text-amber-400" /> AUTHENTICATE</>
                                        )}
                                    </button>
                                </form>

                                <p className="text-center text-[10px] text-slate-600 mt-4">
                                    This ensures only verified super admins can create new accounts.
                                </p>
                            </div>
                        ) : (
                            /* ── Create Form (after auth) ──────────────── */
                            <>
                        <h2 className="relative z-10 text-lg font-bold text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-neonPurple" />
                            Create Admin
                        </h2>
                        <p className="relative z-10 text-xs text-slate-500 mb-6">
                            Credentials will be emailed automatically.
                        </p>

                        <form
                            onSubmit={handleCreate}
                            className="space-y-4 relative z-10"
                        >
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        className={`w-full bg-slate-900 border ${
                                            errors.name
                                                ? "border-red-500/50"
                                                : "border-slate-700 focus:border-neonPurple"
                                        } text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder-slate-600`}
                                    />
                                </div>
                                {errors.name && (
                                    <p className="mt-1 text-xs text-red-400">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="admin@hexacare.net"
                                        className={`w-full bg-slate-900 border ${
                                            errors.email
                                                ? "border-red-500/50"
                                                : "border-slate-700 focus:border-neonPurple"
                                        } text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder-slate-600`}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-xs text-red-400">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                                        className={`w-full bg-slate-900 border ${
                                            errors.password
                                                ? "border-red-500/50"
                                                : "border-slate-700 focus:border-neonPurple"
                                        } text-white rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition-colors placeholder-slate-600`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-xs text-red-400">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <input
                                        name="confirmPassword"
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Re-enter password"
                                        className={`w-full bg-slate-900 border ${
                                            errors.confirmPassword
                                                ? "border-red-500/50"
                                                : "border-slate-700 focus:border-neonPurple"
                                        } text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder-slate-600`}
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-xs text-red-400">
                                        {errors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            {/* Submit Error */}
                            {errors.submit && (
                                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    {errors.submit}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-neonPurple/30 py-3 rounded-xl text-sm font-bold tracking-wider text-white transition-all hover:border-neonPurple hover:shadow-[0_0_20px_rgba(20,184,166,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-neonPurple" />
                                        CREATING ADMIN...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 text-neonPurple" />
                                        CREATE ADMIN
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Success + Credentials Display */}
                        {successMessage && (
                            <div className="mt-4 p-4 bg-neonGreen/10 border border-neonGreen/20 rounded-xl">
                                <p className="text-sm text-neonGreen font-medium mb-2">
                                    ✓ {successMessage}
                                </p>

                                {createdCredentials && (
                                    <div className="space-y-2 mt-3">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                            Credentials (copy if email failed)
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 font-mono flex-1 truncate">
                                                {createdCredentials.email}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    copyToClipboard(
                                                        createdCredentials.email,
                                                        "email"
                                                    )
                                                }
                                                className="text-slate-500 hover:text-white transition-colors"
                                            >
                                                {copiedField === "email" ? (
                                                    <Check className="w-3 h-3 text-neonGreen" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 font-mono flex-1 truncate">
                                                {createdCredentials.password}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    copyToClipboard(
                                                        createdCredentials.password,
                                                        "password"
                                                    )
                                                }
                                                className="text-slate-500 hover:text-white transition-colors"
                                            >
                                                {copiedField === "password" ? (
                                                    <Check className="w-3 h-3 text-neonGreen" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── Admin List ────────────────────────────────────────── */}
                <div className="lg:col-span-3">
                    <div className="glass-card rounded-2xl p-6 border border-slate-700/50 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-5 h-5 text-neonCyan" />
                                Admin Roster
                            </h2>
                            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                                {admins.length} Admins
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                            </div>
                        ) : admins.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl p-8">
                                <Users className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-sm">
                                    No admin accounts found.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-3 max-h-[600px] pr-1">
                                {admins.map((admin) => {
                                    const isSuperAdmin =
                                        admin.role === "super_admin";
                                    const isActive = admin.isActive !== false;

                                    return (
                                        <div
                                            key={admin.uid}
                                            className={`bg-slate-900/50 border rounded-xl p-4 transition-colors ${
                                                isActive
                                                    ? "border-slate-700/80 hover:border-neonCyan/50"
                                                    : "border-red-500/20 opacity-60"
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                                            isSuperAdmin
                                                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                                : "bg-slate-800 text-slate-300 border border-slate-700"
                                                        }`}
                                                    >
                                                        {admin.fullName?.charAt(
                                                            0
                                                        ) || "A"}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                                                            {admin.fullName ||
                                                                "Unnamed Admin"}
                                                            {isSuperAdmin && (
                                                                <span className="text-[9px] uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                                                                    Super
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-mono">
                                                            {admin.email}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 ml-auto">
                                                    {/* Status Badge */}
                                                    <span
                                                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${
                                                            isActive
                                                                ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20"
                                                                : "text-red-400 bg-red-500/10 border-red-500/20"
                                                        }`}
                                                    >
                                                        {isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>

                                                    {/* Toggle Button (not for super admin) */}
                                                    {!isSuperAdmin && (
                                                        <button
                                                            onClick={() =>
                                                                handleToggle(
                                                                    admin.uid,
                                                                    isActive
                                                                )
                                                            }
                                                            disabled={
                                                                toggleLoading ===
                                                                admin.uid
                                                            }
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                                                                isActive
                                                                    ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                                                                    : "bg-neonGreen/10 border border-neonGreen/20 text-neonGreen hover:bg-neonGreen/20"
                                                            }`}
                                                        >
                                                            {toggleLoading ===
                                                            admin.uid ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : isActive ? (
                                                                <ShieldOff className="w-3 h-3" />
                                                            ) : (
                                                                <ShieldCheck className="w-3 h-3" />
                                                            )}
                                                            {isActive
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* UID + Timestamps */}
                                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 font-mono">
                                                <span>UID: {admin.uid}</span>
                                                <span>
                                                    Created:{" "}
                                                    {admin.createdAt
                                                        ? new Date(
                                                              admin.createdAt
                                                          ).toLocaleDateString()
                                                        : "—"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminManagement;
