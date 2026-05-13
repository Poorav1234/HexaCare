import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, HeartPulse, Loader2, ShieldAlert } from "lucide-react";
import {
  loginUser,
  signInWithGoogle,
} from "../firebase/authService";
import { getUserRole } from "../firebase/adminService";
import { requestLoginOtp, verifyLoginOtp, requestAccountUnlock } from "../services/securityApi";
import AuthLayout from "../Components/AuthLayout";
import Toast from "../Components/Toast";
import OtpInput from "../Components/OtpInput";
import DeviceApproval from "../Components/DeviceApproval";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const navigate = useNavigate();

  // ── OTP State ─────────────────────────────────────────────────────────────
  const [otpStep, setOtpStep] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // ── Lock State ────────────────────────────────────────────────────────────
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);

  // ── Device Approval State ────────────────────────────────────────────────
  const [deviceApprovalStep, setDeviceApprovalStep] = useState(false);
  const [approvalId, setApprovalId] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  // ── Email+Password Login → OTP Flow ───────────────────────────────────────
  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");
    setAccountLocked(false);

    try {
      // Step 1: Verify credentials + send OTP via backend
      await requestLoginOtp(formData.email, formData.password);
      // Credentials valid → show OTP input
      setOtpStep(true);
      setOtpError("");
    } catch (error) {
      if (error.status === 423) {
        setAccountLocked(true);
        setLockInfo(error);
        setServerError(error.error || "Account is temporarily locked.");
      } else if (error.status === 429) {
        setServerError(error.error || "Too many requests. Please wait.");
      } else {
        setServerError(error.error || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Verification ─────────────────────────────────────────────────────
  const handleOtpComplete = async (otp) => {
    setOtpLoading(true);
    setOtpError("");

    try {
      // Step 2: Verify OTP with backend
      const otpResult = await verifyLoginOtp(formData.email, otp);

      // Step 3: Check device trust status
      if (otpResult.deviceTrusted === false && otpResult.approvalId) {
        // New device detected → show device approval waiting screen
        setApprovalId(otpResult.approvalId);
        setDeviceInfo(otpResult.deviceInfo || null);
        setOtpStep(false);
        setDeviceApprovalStep(true);
        return;
      }

      // Device is trusted (or device check was skipped) → proceed to Firebase sign-in
      const result = await loginUser(formData.email, formData.password);
      // Check role to redirect admins to admin dashboard
      const role = await getUserRole(result.user?.uid || result.uid);
      navigate((role === "admin" || role === "super_admin") ? "/admin" : "/dashboard");
    } catch (error) {
      if (error.message === "PROFILE_INCOMPLETE") {
        navigate("/complete-profile");
      } else {
        setOtpError(error.error || error.message || "Verification failed. Please try again.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Device Approval Callbacks ────────────────────────────────────────────
  const handleDeviceApproved = async () => {
    try {
      const result = await loginUser(formData.email, formData.password);
      const role = await getUserRole(result.user?.uid || result.uid);
      navigate((role === "admin" || role === "super_admin") ? "/admin" : "/dashboard");
    } catch (error) {
      if (error.message === "PROFILE_INCOMPLETE") {
        navigate("/complete-profile");
      } else {
        setServerError(error.message || "Login failed after device approval.");
        setDeviceApprovalStep(false);
      }
    }
  };

  const handleDeviceDenied = () => {
    setServerError("Device access was denied. If this was you, try approving from your email.");
    setDeviceApprovalStep(false);
  };

  const handleDeviceExpired = () => {
    setServerError("Device approval request expired. Please log in again.");
    setDeviceApprovalStep(false);
  };

  const handleOtpResend = async () => {
    try {
      await requestLoginOtp(formData.email, formData.password);
    } catch (error) {
      setOtpError(error.error || "Failed to resend OTP.");
      throw error;
    }
  };

  // ── Account Unlock ────────────────────────────────────────────────────────
  const handleUnlockRequest = async () => {
    try {
      await requestAccountUnlock(formData.email);
      setServerError("");
      setResetMessage("Unlock instructions sent to your email.");
    } catch (error) {
      setServerError(error.error || "Failed to send unlock request.");
    }
  };

  // ── Google Login (unchanged — no OTP for Google) ──────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setServerError("");
    try {
      const { isNewOrIncomplete } = await signInWithGoogle();
      if (isNewOrIncomplete) {
        navigate("/complete-profile");
      } else {
        // Google sign-in doesn't return result in this scope,
        // App.jsx handles role-based redirect via onAuthStateChanged
        navigate("/dashboard");
      }
    } catch (error) {
      setServerError(error.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Forgot Password → navigate to dedicated page ─────────────────────────
  const handleForgotPassword = () => {
    navigate("/forgot-password", { state: { email: formData.email } });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: DEVICE APPROVAL WAITING SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (deviceApprovalStep) {
    return (
      <AuthLayout title="Device Verification" subtitle="One final security check.">
        <Toast message={serverError} type="error" onClose={() => setServerError("")} />
        <div className="glass-card w-full max-w-2xl mx-auto p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-neonCyan/20 blur-3xl rounded-full" />

          <div className="relative z-10">
            <DeviceApproval
              email={formData.email}
              approvalId={approvalId}
              deviceInfo={deviceInfo}
              onApproved={handleDeviceApproved}
              onDenied={handleDeviceDenied}
              onExpired={handleDeviceExpired}
              onBack={() => { setDeviceApprovalStep(false); setServerError(""); }}
            />
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: OTP VERIFICATION SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (otpStep) {
    return (
      <AuthLayout title="OTP Verification" subtitle="One more step to secure your login.">
        <Toast message={otpError} type="error" onClose={() => setOtpError("")} />
        <div className="glass-card w-full max-w-2xl mx-auto p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-neonCyan/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-neonPurple/20 blur-3xl rounded-full" />

          <div className="relative z-10">
            <OtpInput
              length={6}
              email={formData.email}
              onComplete={handleOtpComplete}
              onResend={handleOtpResend}
              expiresIn={60}
              loading={otpLoading}
              error={otpError}
            />

            <button
              type="button"
              onClick={() => { setOtpStep(false); setOtpError(""); }}
              className="mt-6 w-full text-center text-xs text-slate-500 hover:text-neonCyan transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN LOGIN FORM
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <AuthLayout
      title="Sign In to HexaCare"
      subtitle="Log in to your personalized health dashboard."
    >
      <Toast
        message={serverError || resetMessage}
        type={serverError ? "error" : resetMessage ? "success" : "info"}
        onClose={() => {
          setServerError("");
          setResetMessage("");
        }}
      />
      <div className="glass-card w-full max-w-2xl mx-auto p-8 rounded-2xl relative overflow-hidden">
        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-neonCyan/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-neonPurple/20 blur-3xl rounded-full"></div>

        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="relative mb-2">
            <HeartPulse className="w-12 h-12 text-neonPurple relative z-10 drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider text-white mt-4">
            HEXA<span className="text-neonCyan">CARE</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Personal Health Assistant
          </p>
        </div>

        {/* ── Account Locked Banner ──────────────────────────────────────── */}
        {accountLocked && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">Account Temporarily Locked</p>
                <p className="text-xs text-slate-400 mt-1">
                  {lockInfo?.error || `Multiple failed login attempts detected. Try again in ${lockInfo?.remainingMin || 15} minutes.`}
                </p>
                <button
                  type="button"
                  onClick={handleUnlockRequest}
                  className="mt-2 text-xs text-neonCyan hover:text-white transition-colors underline"
                >
                  Send unlock instructions to my email
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleManualLogin} className="space-y-5">
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
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.email ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"} text-white rounded-lg pl-10 pr-4 py-3 outline-none transition-colors duration-200 placeholder-slate-500`}
                placeholder="doctor@hexacare.net"
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.password ? "border-red-500/50" : "border-slate-700 focus:border-neonPurple"} text-white rounded-lg pl-10 pr-4 py-3 outline-none transition-colors duration-200 placeholder-slate-500`}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-neonCyan hover:text-white transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full relative group overflow-hidden rounded-lg bg-slate-800 border border-slate-700 py-3 px-4 text-sm font-medium text-white shadow-lg transition-all hover:border-neonCyan hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 w-0 bg-gradient-to-r from-neonCyan/20 to-neonPurple/20 transition-all duration-[250ms] ease-out group-hover:w-full"></div>
            <span className="relative flex items-center justify-center font-bold tracking-wider">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIGN IN"}
            </span>
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-slate-700 flex-1"></div>
          <span className="text-xs text-slate-500 uppercase tracking-widest">Or</span>
          <div className="h-px bg-slate-700 flex-1"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="mt-6 w-full flex items-center justify-center bg-white text-slate-900 py-3 px-4 rounded-lg font-medium text-sm transition-all hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-8 text-center text-xs text-slate-500">
          New to HexaCare?{" "}
          <Link to="/register" className="text-neonCyan hover:text-white transition-colors">
            Create an Account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
