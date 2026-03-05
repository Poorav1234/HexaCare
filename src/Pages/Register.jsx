import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Droplet,
  Wallet,
  Hexagon,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { registerUser, signInWithGoogle } from "../firebase/authService";
import AuthLayout from "../components/AuthLayout";
import Toast from "../components/Toast";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    gender: "",
    dateOfBirth: "",
    bloodGroup: "",
    walletAddress: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (
      formData.password &&
      (!/[A-Z]/.test(formData.password) ||
        !/[a-z]/.test(formData.password) ||
        !/[0-9]/.test(formData.password))
    ) {
      newErrors.password =
        "Password must contain upper, lower case letters and a number.";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.phoneNumber) newErrors.phoneNumber = "Phone number is required";
    else if (!/^\d{8,15}$/.test(formData.phoneNumber))
      newErrors.phoneNumber = "Phone number must be 8–15 digits";

    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";

    if (formData.walletAddress) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
        newErrors.walletAddress =
          "Invalid EVM wallet address. Must be 42 characters starting with 0x";
      }
    } else {
      newErrors.walletAddress =
        "Wallet address is required for blockchain integration";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleManualRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");
    try {
      const { password, confirmPassword, ...userData } = formData;
      await registerUser(formData.email, formData.password, userData);
      navigate("/dashboard");
    } catch (error) {
      setServerError(error.message || "Failed to register account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setServerError("");
    try {
      const { isNewOrIncomplete } = await signInWithGoogle();
      if (isNewOrIncomplete) {
        navigate("/complete-profile");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setServerError(error.message || "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Initialize your HexaCare identity"
      subtitle="Create your AI-ready, blockchain-linked health profile."
    >
      <Toast
        message={serverError}
        type="error"
        onClose={() => setServerError("")}
      />
      <div className="glass-card w-full max-w-2xl mx-auto p-8 rounded-2xl relative overflow-hidden">
        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-neonCyan/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-neonPurple/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="relative mb-2">
            <Hexagon className="w-10 h-10 text-neonCyan absolute animate-pulse opacity-50" />
            <HeartPulse className="w-10 h-10 text-neonPurple relative z-10 drop-shadow-[0_0_8px_rgba(176,0,255,0.8)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-white mt-4">
            INITIALIZE <span className="text-neonCyan">NODE</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create your HexaCare identity</p>
        </div>

        <form onSubmit={handleManualRegister} className="space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border ${
                    errors.fullName ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"
                  } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="Dr. Sarah Connor"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border ${
                    errors.email ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"
                  } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="sarah@hexacare.net"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border ${
                    errors.password ? "border-red-500/50" : "border-slate-700 focus:border-neonPurple"
                  } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border ${
                    errors.confirmPassword
                      ? "border-red-500/50"
                      : "border-slate-700 focus:border-neonPurple"
                  } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border ${
                    errors.phoneNumber
                      ? "border-red-500/50"
                      : "border-slate-700 focus:border-neonCyan"
                  } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${
                  errors.gender ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"
                } text-white rounded-lg px-4 py-2.5 text-sm outline-none transition-colors duration-200 appearance-none`}
              >
                <option value="" disabled className="text-slate-500">
                  Select Identity
                </option>
                <option value="Male" className="bg-slate-900">
                  Male
                </option>
                <option value="Female" className="bg-slate-900">
                  Female
                </option>
                <option value="Other" className="bg-slate-900">
                  Other
                </option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-xs text-red-400">{errors.gender}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Date of Birth *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border ${
                    errors.dateOfBirth
                      ? "border-red-500/50"
                      : "border-slate-700 focus:border-neonCyan"
                  } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  style={{ colorScheme: "dark" }}
                />
              </div>
              {errors.dateOfBirth && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.dateOfBirth}
                </p>
              )}
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Droplet className="h-4 w-4 text-slate-500" />
                </div>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border border-slate-700 focus:border-neonCyan text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200 appearance-none`}
                >
                  <option value="" disabled className="text-slate-500">
                    Select Type
                  </option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (bg) => (
                      <option key={bg} value={bg} className="bg-slate-900">
                        {bg}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                EVM Wallet Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wallet className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  name="walletAddress"
                  value={formData.walletAddress}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/50 border ${
                    errors.walletAddress
                      ? "border-red-500/50"
                      : "border-slate-700 focus:border-neonGreen"
                  } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="0x71C...976F"
                />
              </div>
              {errors.walletAddress && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.walletAddress}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full relative group overflow-hidden rounded-lg bg-slate-800 border border-slate-700 py-3 px-4 text-sm font-medium text-white shadow-lg transition-all hover:border-neonCyan hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 w-0 bg-gradient-to-r from-neonCyan/20 to-neonPurple/20 transition-all duration-[250ms] ease-out group-hover:w-full" />
              <span className="relative flex items-center justify-center">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "REGISTER NODE IDENTIFIER"
                )}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-slate-700 flex-1" />
          <span className="text-xs text-slate-500 uppercase tracking-widest">
            Or
          </span>
          <div className="h-px bg-slate-700 flex-1" />
        </div>

        <button
          onClick={handleGoogleRegister}
          disabled={loading || googleLoading}
          className="mt-6 w-full flex items-center justify-center bg-white text-slate-900 py-3 px-4 rounded-lg font-medium text-sm transition-all hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </>
          )}
        </button>

        <p className="mt-8 text-center text-xs text-slate-500 relative z-10">
          Already verified?{" "}
          <Link
            to="/login"
            className="text-neonPurple hover:text-white transition-colors"
          >
            Access System
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;