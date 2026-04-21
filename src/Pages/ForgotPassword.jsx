// src/Pages/ForgotPassword.jsx
// Multi-step OTP-based password reset flow:
//   Step 1 → Enter email
//   Step 2 → Verify OTP
//   Step 3 → Set new password
//   Step 4 → Success

import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, KeyRound, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import {
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword as resetPasswordApi,
} from "../services/securityApi";
import AuthLayout from "../Components/AuthLayout";
import Toast from "../Components/Toast";
import OtpInput from "../Components/OtpInput";

const STEPS = { EMAIL: "email", OTP: "otp", PASSWORD: "password", SUCCESS: "success" };

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [step, setStep] = useState(STEPS.EMAIL);
    const [email, setEmail] = useState(location.state?.email || "");
    const [resetToken, setResetToken] = useState("");
    const [passwords, setPasswords] = useState({ password: "", confirmPassword: "" });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [toastType, setToastType] = useState("error");
    const [otpError, setOtpError] = useState("");
    const [isFallback, setIsFallback] = useState(false);

    const showToast = (msg, type = "error") => { setToastMsg(msg); setToastType(type); };

    // ── Step 1: Request OTP ─────────────────────────────────────────────────
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setErrors({ email: "Please enter a valid email address." });
            return;
        }
        setLoading(true);
        setErrors({});
        try {
            await requestPasswordResetOtp(email);
            setStep(STEPS.OTP);
        } catch (err) {
            showToast(err.error || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify OTP ──────────────────────────────────────────────────
    const handleOtpComplete = async (otp) => {
        setLoading(true);
        setOtpError("");
        try {
            const result = await verifyPasswordResetOtp(email, otp);
            setResetToken(result.resetToken);
            setStep(STEPS.PASSWORD);
        } catch (err) {
            setOtpError(err.error || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpResend = async () => {
        try {
            await requestPasswordResetOtp(email);
        } catch (err) {
            setOtpError(err.error || "Failed to resend OTP.");
            throw err;
        }
    };

    // ── Step 3: Reset Password ──────────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!passwords.password) newErrors.password = "Password is required.";
        else if (passwords.password.length < 8) newErrors.password = "Minimum 8 characters.";
        else if (!/[A-Z]/.test(passwords.password)) newErrors.password = "Must contain an uppercase letter.";
        else if (!/[0-9]/.test(passwords.password)) newErrors.password = "Must contain a number.";

        if (!passwords.confirmPassword) newErrors.confirmPassword = "Please confirm your password.";
        else if (passwords.password !== passwords.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        setErrors({});
        try {
            const result = await resetPasswordApi(resetToken, passwords.password);
            setIsFallback(!!result.fallback);
            setStep(STEPS.SUCCESS);
        } catch (err) {
            showToast(err.error || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step Progress Indicator ─────────────────────────────────────────────
    const stepOrder = [STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD];
    const currentIdx = stepOrder.indexOf(step);

    const StepDots = () => (
        <div className="flex items-center justify-center gap-2 mb-8">
            {stepOrder.map((s, i) => (
                <React.Fragment key={s}>
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                            step === s
                                ? "bg-neonCyan/20 border-neonCyan text-neonCyan shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                                : currentIdx > i
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                                : "bg-slate-800 border-slate-700 text-slate-500"
                        }`}
                    >
                        {currentIdx > i ? "✓" : i + 1}
                    </div>
                    {i < 2 && (
                        <div
                            className={`w-12 h-0.5 transition-all duration-300 ${
                                currentIdx > i ? "bg-emerald-400" : "bg-slate-700"
                            }`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <AuthLayout title="Reset Password" subtitle="Secure OTP-based password recovery.">
            <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg("")} />

            <div className="glass-card w-full max-w-2xl mx-auto p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-neonCyan/20 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-neonPurple/20 blur-3xl rounded-full" />

                <div className="relative z-10">
                    {step !== STEPS.SUCCESS && <StepDots />}

                    {/* ── STEP 1: Email ──────────────────────────────────── */}
                    {step === STEPS.EMAIL && (
                        <form onSubmit={handleRequestOtp} className="space-y-5">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neonPurple/10 border border-neonPurple/20 flex items-center justify-center">
                                    <KeyRound className="w-8 h-8 text-neonPurple" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Forgot Your Password?</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Enter your email to receive a verification OTP.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                                        className={`w-full bg-slate-800/50 border ${
                                            errors.email ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"
                                        } text-white rounded-lg pl-10 pr-4 py-3 outline-none transition-colors duration-200 placeholder-slate-500`}
                                        placeholder="doctor@hexacare.net"
                                    />
                                </div>
                                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group overflow-hidden rounded-lg bg-slate-800 border border-slate-700 py-3 px-4 text-sm font-medium text-white shadow-lg transition-all hover:border-neonCyan hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 w-0 bg-gradient-to-r from-neonCyan/20 to-neonPurple/20 transition-all duration-[250ms] ease-out group-hover:w-full" />
                                <span className="relative flex items-center justify-center font-bold tracking-wider gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SEND OTP"}
                                </span>
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2: OTP ────────────────────────────────────── */}
                    {step === STEPS.OTP && (
                        <div>
                            <OtpInput
                                length={6}
                                email={email}
                                onComplete={handleOtpComplete}
                                onResend={handleOtpResend}
                                expiresIn={60}
                                loading={loading}
                                error={otpError}
                            />
                            <button
                                type="button"
                                onClick={() => setStep(STEPS.EMAIL)}
                                className="mt-6 w-full text-center text-xs text-slate-500 hover:text-neonCyan transition-colors"
                            >
                                ← Change email
                            </button>
                        </div>
                    )}

                    {/* ── STEP 3: New Password ──────────────────────────── */}
                    {step === STEPS.PASSWORD && (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Set New Password</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Create a strong password for your account.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwords.password}
                                        onChange={(e) => { setPasswords({ ...passwords, password: e.target.value }); setErrors({}); }}
                                        className={`w-full bg-slate-800/50 border ${
                                            errors.password ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"
                                        } text-white rounded-lg pl-10 pr-4 py-3 outline-none transition-colors duration-200 placeholder-slate-500`}
                                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                                    />
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => { setPasswords({ ...passwords, confirmPassword: e.target.value }); setErrors({}); }}
                                        className={`w-full bg-slate-800/50 border ${
                                            errors.confirmPassword ? "border-red-500/50" : "border-slate-700 focus:border-neonPurple"
                                        } text-white rounded-lg pl-10 pr-4 py-3 outline-none transition-colors duration-200 placeholder-slate-500`}
                                        placeholder="Re-enter password"
                                    />
                                </div>
                                {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group overflow-hidden rounded-lg bg-slate-800 border border-slate-700 py-3 px-4 text-sm font-medium text-white shadow-lg transition-all hover:border-emerald-400 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 w-0 bg-gradient-to-r from-emerald-500/20 to-neonCyan/20 transition-all duration-[250ms] ease-out group-hover:w-full" />
                                <span className="relative flex items-center justify-center font-bold tracking-wider gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "RESET PASSWORD"}
                                </span>
                            </button>
                        </form>
                    )}

                    {/* ── STEP 4: Success ────────────────────────────────── */}
                    {step === STEPS.SUCCESS && (
                        <div className="text-center py-6 space-y-6">
                            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-400/30 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Password Reset Successful!</h3>
                                <p className="text-sm text-slate-400 mt-2">
                                    {isFallback
                                        ? "A password reset link has been sent to your email. Please use the link to set your new password."
                                        : "Your password has been updated. You can now login with your new password."}
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/login")}
                                className="w-full relative group overflow-hidden rounded-lg bg-slate-800 border border-slate-700 py-3 px-4 text-sm font-medium text-white shadow-lg transition-all hover:border-neonCyan hover:shadow-lg"
                            >
                                <div className="absolute inset-0 w-0 bg-gradient-to-r from-neonCyan/20 to-neonPurple/20 transition-all duration-[250ms] ease-out group-hover:w-full" />
                                <span className="relative flex items-center justify-center font-bold tracking-wider">
                                    GO TO LOGIN
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Back to Login */}
                    {step !== STEPS.SUCCESS && (
                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="text-xs text-slate-500 hover:text-neonCyan transition-colors inline-flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3 h-3" /> Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </AuthLayout>
    );
};

export default ForgotPassword;
