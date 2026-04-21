// src/admin/AdminProfile.jsx
// Admin profile page with view/edit, password reset via OTP.

import React, { useState, useEffect } from "react";
import {
    User, Mail, Phone, Calendar, Shield, Lock, Loader2,
    Edit3, Save, X, KeyRound, CheckCircle2,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { getUserProfile, updateUserProfileFields } from "../firebase/dbService";
import { requestPasswordResetOtp, verifyPasswordResetOtp, resetPassword as resetPasswordApi } from "../services/securityApi";
import OtpInput from "../Components/OtpInput";
import Toast from "../Components/Toast";

const AdminProfile = ({ user }) => {
    const [profile, setProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ msg: "", type: "info" });

    // Password reset state
    const [resetStep, setResetStep] = useState(null); // null | "otp" | "password" | "done"
    const [resetLoading, setResetLoading] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [passwords, setPasswords] = useState({ password: "", confirmPassword: "" });
    const [passErrors, setPassErrors] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getUserProfile(user.uid);
                if (data) { setProfile(data); setEditForm(data); }
            } catch (e) {
                console.error("Error fetching profile:", e);
            } finally { setLoading(false); }
        };
        if (user?.uid) fetchProfile();
    }, [user]);

    const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateUserProfileFields(user.uid, editForm);
            setProfile(editForm);
            setIsEditing(false);
            setToast({ msg: "Profile updated successfully.", type: "success" });
        } catch (e) {
            setToast({ msg: "Failed to update profile.", type: "error" });
        } finally { setSaving(false); }
    };

    // ── Password Reset OTP Flow ─────────────────────────────────────────────
    const startPasswordReset = async () => {
        setResetLoading(true);
        try {
            await requestPasswordResetOtp(profile.email || user.email);
            setResetStep("otp");
        } catch (err) {
            setToast({ msg: err.error || "Failed to send OTP.", type: "error" });
        } finally { setResetLoading(false); }
    };

    const handleOtpComplete = async (otp) => {
        setResetLoading(true);
        setOtpError("");
        try {
            const result = await verifyPasswordResetOtp(profile.email || user.email, otp);
            setResetToken(result.resetToken);
            setResetStep("password");
        } catch (err) {
            setOtpError(err.error || "Invalid OTP.");
        } finally { setResetLoading(false); }
    };

    const handleOtpResend = async () => {
        try { await requestPasswordResetOtp(profile.email || user.email); }
        catch (err) { setOtpError(err.error || "Failed to resend."); throw err; }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!passwords.password) errs.password = "Required";
        else if (passwords.password.length < 8) errs.password = "Min 8 chars";
        else if (!/[A-Z]/.test(passwords.password)) errs.password = "Need uppercase";
        else if (!/[0-9]/.test(passwords.password)) errs.password = "Need a number";
        if (!passwords.confirmPassword) errs.confirmPassword = "Required";
        else if (passwords.password !== passwords.confirmPassword) errs.confirmPassword = "Mismatch";
        if (Object.keys(errs).length) { setPassErrors(errs); return; }

        setResetLoading(true);
        setPassErrors({});
        try {
            await resetPasswordApi(resetToken, passwords.password);
            setResetStep("done");
        } catch (err) {
            setToast({ msg: err.error || "Failed to reset.", type: "error" });
        } finally { setResetLoading(false); }
    };

    const infoFields = [
        { label: "Full Name", key: "fullName", icon: User, editable: true },
        { label: "Email", key: "email", icon: Mail, editable: false },
        { label: "Phone", key: "phoneNumber", icon: Phone, editable: true },
        { label: "Gender", key: "gender", icon: User, editable: false },
        { label: "Role", key: "role", icon: Shield, editable: false, format: (v) => v === "super_admin" ? "Super Admin" : v === "admin" ? "Admin" : "User" },
        { label: "Joined", key: "createdAt", icon: Calendar, editable: false, format: (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
    ];

    if (loading) {
        return (
            <AdminLayout user={user}>
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 animate-spin text-neonCyan" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={user}>
            <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "info" })} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <User className="w-6 h-6 text-neonPurple" />
                        My Profile
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">View and manage your admin account details.</p>
                </div>
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all">
                        <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => { setIsEditing(false); setEditForm(profile); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/50 rounded-xl text-sm text-slate-400 hover:text-red-400 transition-all">
                            <X className="w-4 h-4" /> Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-neonGreen/10 hover:bg-neonGreen/20 border border-neonGreen/30 rounded-xl text-sm text-neonGreen transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-700/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-neonPurple/10 blur-3xl rounded-full pointer-events-none" />

                    <div className="relative z-10 flex items-center gap-5 mb-8 pb-6 border-b border-slate-800">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-neonPurple flex items-center justify-center text-2xl font-black text-neonPurple flex-shrink-0">
                            {profile.fullName?.charAt(0) || "A"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{profile.fullName || "Admin"}</h2>
                            <p className="text-xs text-slate-500 font-mono">{profile.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${
                                    profile.role === "super_admin"
                                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                        : "text-neonPurple bg-neonPurple/10 border-neonPurple/20"
                                }`}>
                                    {profile.role === "super_admin" ? "Super Admin" : "Admin"}
                                </span>
                                <span className="text-[10px] text-neonGreen flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse" /> Active
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {infoFields.map(({ label, key, icon: Icon, editable, format }) => (
                            <div key={key} className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
                                {isEditing && editable ? (
                                    <input
                                        name={key}
                                        value={editForm[key] || ""}
                                        onChange={handleEditChange}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-neonPurple outline-none transition-colors"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-slate-200">
                                        <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                        {format ? format(profile[key]) : (profile[key] || "—")}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Password Reset Card */}
                <div className="glass-card rounded-2xl p-6 border border-slate-700/50 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-neonCyan/10 border border-neonCyan/20 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-neonCyan" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Password</h3>
                            <p className="text-[10px] text-slate-500">OTP-based reset</p>
                        </div>
                    </div>

                    {/* Reset Flow */}
                    {!resetStep && (
                        <div className="flex-1 flex flex-col justify-between">
                            <p className="text-xs text-slate-400 mb-4">
                                Reset your password securely via OTP verification sent to your registered email.
                            </p>
                            <button
                                onClick={startPasswordReset}
                                disabled={resetLoading}
                                className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-neonCyan/30 py-3 rounded-xl text-sm font-bold tracking-wider text-white transition-all hover:border-neonCyan hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] disabled:opacity-50"
                            >
                                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 text-neonCyan" />}
                                RESET PASSWORD
                            </button>
                        </div>
                    )}

                    {resetStep === "otp" && (
                        <div className="flex-1">
                            <OtpInput
                                length={6}
                                email={profile.email || user.email}
                                onComplete={handleOtpComplete}
                                onResend={handleOtpResend}
                                expiresIn={60}
                                loading={resetLoading}
                                error={otpError}
                            />
                            <button type="button" onClick={() => { setResetStep(null); setOtpError(""); }} className="mt-4 w-full text-center text-xs text-slate-500 hover:text-neonCyan transition-colors">
                                ← Cancel
                            </button>
                        </div>
                    )}

                    {resetStep === "password" && (
                        <form onSubmit={handleResetPassword} className="flex-1 space-y-4">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={passwords.password}
                                    onChange={(e) => { setPasswords({ ...passwords, password: e.target.value }); setPassErrors({}); }}
                                    className={`w-full bg-slate-900 border ${passErrors.password ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"} text-white rounded-lg px-3 py-2.5 text-sm outline-none transition-colors`}
                                    placeholder="Min 8 chars, 1 upper, 1 number"
                                />
                                {passErrors.password && <p className="mt-1 text-xs text-red-400">{passErrors.password}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Confirm</label>
                                <input
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) => { setPasswords({ ...passwords, confirmPassword: e.target.value }); setPassErrors({}); }}
                                    className={`w-full bg-slate-900 border ${passErrors.confirmPassword ? "border-red-500/50" : "border-slate-700 focus:border-neonPurple"} text-white rounded-lg px-3 py-2.5 text-sm outline-none transition-colors`}
                                    placeholder="Re-enter password"
                                />
                                {passErrors.confirmPassword && <p className="mt-1 text-xs text-red-400">{passErrors.confirmPassword}</p>}
                            </div>
                            <button type="submit" disabled={resetLoading} className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-neonCyan/30 py-3 rounded-xl text-sm font-bold tracking-wider text-white transition-all hover:border-neonCyan disabled:opacity-50">
                                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "SET NEW PASSWORD"}
                            </button>
                        </form>
                    )}

                    {resetStep === "done" && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                            <CheckCircle2 className="w-12 h-12 text-neonGreen mb-3" />
                            <h4 className="text-sm font-bold text-white mb-1">Password Updated!</h4>
                            <p className="text-xs text-slate-400 mb-4">Your password has been changed successfully.</p>
                            <button onClick={() => { setResetStep(null); setPasswords({ password: "", confirmPassword: "" }); }} className="text-xs text-neonCyan hover:text-white transition-colors">
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminProfile;
