// src/Components/OtpInput.jsx
// Reusable 6-digit OTP input component with countdown timer, auto-submit,
// paste support, and resend functionality. Matches HexaCare's dark neon theme.

import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, Timer, RefreshCw, Loader2 } from "lucide-react";

const OtpInput = ({
    length = 6,
    onComplete,
    onResend,
    expiresIn = 60,
    loading = false,
    error = "",
    email = "",
}) => {
    const [otp, setOtp] = useState(Array(length).fill(""));
    const [timeLeft, setTimeLeft] = useState(expiresIn);
    const [canResend, setCanResend] = useState(false);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef([]);

    // Countdown timer
    useEffect(() => {
        if (timeLeft <= 0) {
            setCanResend(true);
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Auto-focus first input on mount
    useEffect(() => {
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, []);

    const handleChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-advance to next input
        if (value && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (value && index === length - 1) {
            const fullOtp = newOtp.join("");
            if (fullOtp.length === length) {
                onComplete?.(fullOtp);
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Allow Enter to submit
        if (e.key === "Enter") {
            const fullOtp = otp.join("");
            if (fullOtp.length === length) {
                onComplete?.(fullOtp);
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").trim();
        if (!/^\d+$/.test(pasted)) return;

        const digits = pasted.slice(0, length).split("");
        const newOtp = [...otp];
        digits.forEach((d, i) => (newOtp[i] = d));
        setOtp(newOtp);

        const nextEmpty = newOtp.findIndex((d) => !d);
        inputRefs.current[nextEmpty === -1 ? length - 1 : nextEmpty]?.focus();

        if (newOtp.every((d) => d)) {
            onComplete?.(newOtp.join(""));
        }
    };

    const handleResend = async () => {
        if (!canResend || resending) return;
        setResending(true);
        try {
            await onResend?.();
            setTimeLeft(expiresIn);
            setCanResend(false);
            setOtp(Array(length).fill(""));
            inputRefs.current[0]?.focus();
        } catch {
            // Error handled by parent
        } finally {
            setResending(false);
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const progress = (timeLeft / expiresIn) * 100;

    // Mask email: "ab***@gmail.com"
    const maskedEmail = email
        ? `${email.slice(0, 3)}***${email.slice(email.indexOf("@"))}`
        : "your email";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neonCyan/10 border border-neonCyan/20 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-neonCyan" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                    Verify Your Identity
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                    Enter the 6-digit OTP sent to{" "}
                    <span className="text-neonCyan font-mono text-xs">{maskedEmail}</span>
                </p>
            </div>

            {/* OTP Digit Boxes */}
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => (inputRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        disabled={loading}
                        className={`
                            w-11 h-14 sm:w-12 sm:h-16 text-center text-xl font-bold
                            rounded-xl border-2 outline-none transition-all duration-200
                            bg-slate-900/80
                            ${digit
                                ? "border-neonCyan text-neonCyan shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                                : "border-slate-700 text-white"
                            }
                            ${error ? "border-red-500/50" : ""}
                            focus:border-neonCyan focus:shadow-[0_0_20px_rgba(14,165,233,0.4)]
                            disabled:opacity-50
                        `}
                    />
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-center text-sm text-red-400">{error}</p>
            )}

            {/* Timer + Progress + Resend */}
            <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                    <Timer
                        className={`w-4 h-4 ${
                            timeLeft > 10 ? "text-slate-400" : "text-amber-400 animate-pulse"
                        }`}
                    />
                    <span
                        className={`font-mono tracking-wider ${
                            timeLeft > 10 ? "text-slate-400" : "text-amber-400"
                        }`}
                    >
                        {timeLeft > 0 ? formatTime(timeLeft) : "Expired"}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                            progress > 30
                                ? "bg-neonCyan"
                                : progress > 10
                                ? "bg-amber-400"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || resending}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-neonCyan transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {resending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3 h-3" />
                    )}
                    Resend OTP
                </button>
            </div>

            {/* Loading Spinner */}
            {loading && (
                <div className="flex items-center justify-center gap-2 text-neonCyan">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Verifying...</span>
                </div>
            )}
        </div>
    );
};

export default OtpInput;
