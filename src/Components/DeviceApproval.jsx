// src/Components/DeviceApproval.jsx
// Gmail-style "Waiting for Device Approval" screen.
// Shown after OTP verification when login is from an unknown device.
// Polls the backend every 3 seconds to check if the user approved/denied via email.

import React, { useState, useEffect, useRef } from "react";
import {
    Shield,
    Monitor,
    Globe,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Mail,
    ArrowLeft,
} from "lucide-react";
import { checkDeviceApprovalStatus } from "../services/deviceApi";
import { getDeviceDescription } from "../services/deviceFingerprint";

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_DURATION = 10 * 60 * 1000; // 10 minutes

const DeviceApproval = ({
    email = "",
    approvalId = "",
    deviceInfo = null,
    onApproved,
    onDenied,
    onExpired,
    onBack,
}) => {
    const [status, setStatus] = useState("pending"); // pending | approved | denied | expired
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [polling, setPolling] = useState(true);
    const pollRef = useRef(null);
    const timerRef = useRef(null);
    const startTime = useRef(Date.now());

    // Current device info for display
    const currentDevice = deviceInfo || getDeviceDescription();

    // Masked email
    const maskedEmail = email
        ? `${email.slice(0, 3)}***${email.slice(email.indexOf("@"))}`
        : "your email";

    // ── Polling Logic ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!approvalId || !email) return;

        const poll = async () => {
            try {
                const result = await checkDeviceApprovalStatus(email, approvalId);

                if (result.status === "approved") {
                    setStatus("approved");
                    setPolling(false);
                    setTimeout(() => onApproved?.(), 1500);
                } else if (result.status === "denied") {
                    setStatus("denied");
                    setPolling(false);
                    setTimeout(() => onDenied?.(), 3000);
                } else if (result.status === "expired" || result.status === "not_found") {
                    setStatus("expired");
                    setPolling(false);
                    setTimeout(() => onExpired?.(), 3000);
                }
                // status === "pending" → keep polling
            } catch (err) {
                console.warn("[DeviceApproval] Poll error:", err);
            }
        };

        // Start polling
        poll();
        pollRef.current = setInterval(poll, POLL_INTERVAL);

        // Timer display
        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime.current;
            setTimeElapsed(elapsed);

            // Stop polling after max duration
            if (elapsed >= MAX_POLL_DURATION) {
                setStatus("expired");
                setPolling(false);
                clearInterval(pollRef.current);
                clearInterval(timerRef.current);
            }
        }, 1000);

        return () => {
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
        };
    }, [approvalId, email]);

    // ── Time Formatting ─────────────────────────────────────────────────────
    const formatElapsed = (ms) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${mins}:${String(secs).padStart(2, "0")}`;
    };

    const maxMinutes = MAX_POLL_DURATION / 60000;
    const progressPercent = Math.min(100, (timeElapsed / MAX_POLL_DURATION) * 100);

    // ── Render: Approved ─────────────────────────────────────────────────────
    if (status === "approved") {
        return (
            <div className="space-y-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-emerald-400 tracking-wide">
                        Device Approved
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">
                        This device has been added to your trusted devices. Logging you in...
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Completing login...</span>
                </div>
            </div>
        );
    }

    // ── Render: Denied ──────────────────────────────────────────────────────
    if (status === "denied") {
        return (
            <div className="space-y-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-red-400 tracking-wide">
                        Access Denied
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">
                        This login attempt was denied by the account owner.
                    </p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-300">
                        If this was you, check your email and approve the device.
                    </p>
                </div>
            </div>
        );
    }

    // ── Render: Expired ─────────────────────────────────────────────────────
    if (status === "expired") {
        return (
            <div className="space-y-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-amber-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-amber-400 tracking-wide">
                        Request Expired
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">
                        The device approval request has expired. Please log in again.
                    </p>
                </div>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 mx-auto text-sm text-neonCyan hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </button>
            </div>
        );
    }

    // ── Render: Pending (Waiting) ────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                    {/* Pulsating ring animation */}
                    <div className="absolute inset-0 rounded-2xl bg-neonCyan/10 border border-neonCyan/20 animate-ping opacity-30" />
                    <div className="relative w-20 h-20 rounded-2xl bg-neonCyan/10 border border-neonCyan/30 flex items-center justify-center">
                        <Shield className="w-10 h-10 text-neonCyan" />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                    New Device Detected
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                    Approval required to continue
                </p>
            </div>

            {/* Explanation */}
            <div className="p-4 bg-sky-500/5 border border-sky-500/15 rounded-xl">
                <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-neonCyan flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-slate-300">
                            A verification email has been sent to{" "}
                            <span className="text-neonCyan font-mono text-xs">{maskedEmail}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Open the email and click <strong className="text-emerald-400">Approve Device</strong> to continue.
                        </p>
                    </div>
                </div>
            </div>

            {/* Device Info Card */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Device Details
                </p>
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                        <Monitor className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">Browser:</span>
                        <span className="text-slate-200 ml-auto font-medium">
                            {currentDevice.browser || "Unknown"}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">OS:</span>
                        <span className="text-slate-200 ml-auto font-medium">
                            {currentDevice.os || "Unknown"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Timer + Progress */}
            <div className="flex flex-col items-center gap-3">
                {/* Waiting animation */}
                <div className="flex items-center gap-2 text-sm text-neonCyan">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Waiting for approval...</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{formatElapsed(timeElapsed)}</span>
                    <span>/ {maxMinutes}:00</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                            progressPercent < 60
                                ? "bg-neonCyan"
                                : progressPercent < 85
                                ? "bg-amber-400"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <p className="text-xs text-slate-600 text-center">
                    This request expires in {maxMinutes} minutes. Check your inbox or spam folder.
                </p>
            </div>

            {/* Back to Login */}
            <button
                onClick={onBack}
                className="w-full text-center text-xs text-slate-500 hover:text-neonCyan transition-colors mt-2"
            >
                ← Cancel and return to Login
            </button>
        </div>
    );
};

export default DeviceApproval;
