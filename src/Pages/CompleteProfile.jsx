import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Phone,
  Calendar,
  Droplet,
  Wallet,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { completeGoogleProfile } from "../firebase/authService";
import AuthLayout from "../Components/AuthLayout";
import Toast from "../Components/Toast";
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CompleteProfile = ({ user }) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    bloodGroup: '',
    walletAddress: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const validate = () => {
    const newErrors = {};

    if (!formData.password)
      newErrors.password = "Password is required to secure your account";
    else if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    } else {
      const digits = formData.phoneNumber.replace(/\D/g, "");
      if (
        !isValidPhoneNumber(formData.phoneNumber) ||
        /(\d)\1{7,}/.test(digits) ||
        digits.includes("123456789") ||
        digits.includes("987654321")
      ) {
        newErrors.phoneNumber = "Invalid phone number";
      }
    }

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");
    try {
      const userData = {
        fullName: user.displayName || "Unknown User",
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        bloodGroup: formData.bloodGroup,
        walletAddress: formData.walletAddress,
        profileCompleted: true,
      };

      await completeGoogleProfile(user.email, formData.password, userData);
      setSuccessMsg("Google signup completed, please login.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        setServerError(
          "Please log in with Google again to complete this action."
        );
      } else {
        setServerError(
          error.message || "Failed to complete profile. Try again."
        );
      }
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AuthLayout
      title="Complete your HexaCare profile"
      subtitle="Link a password and finalize your account profile."
    >
      <Toast
        message={serverError}
        type="error"
        onClose={() => setServerError("")}
      />
      <Toast
        message={successMsg}
        type="success"
        onClose={() => setSuccessMsg("")}
      />
      <div className="glass-card w-full max-w-4xl mx-auto p-8 rounded-2xl relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neonGreen/10 blur-3xl rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-neonCyan/10 blur-3xl rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center mb-6">
          <div className="relative mb-2">
            <ShieldCheck className="w-12 h-12 text-neonGreen drop-shadow-[0_0_8px_rgba(0,255,102,0.8)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-white mt-2 text-center">
            COMPLETE <span className="text-neonGreen">PROFILE</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 text-center max-w-md">
            Welcome,{" "}
            <span className="text-white font-medium">
              {user.displayName || user.email}
            </span>
            ! Please provide the required information to
            finalize your HexaCare account.
          </p>
        </div>

        <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700 mt-4 relative z-10">
          <h3 className="text-neonCyan text-sm font-medium mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Setup Local Credentials
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Link a password to your account. This allows you to log in manually
            using <span className="text-white">{user.email}</span> in the future
            without Google.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Password */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-slate-900 border ${errors.password
                    ? "border-red-500/50"
                    : "border-slate-700 focus:border-neonGreen"
                    } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="Set Password *"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full bg-slate-900 border ${errors.confirmPassword
                    ? "border-red-500/50"
                    : "border-slate-700 focus:border-neonGreen"
                    } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  placeholder="Confirm Password *"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={formData.phoneNumber}
                  onChange={(v) => setFormData({ ...formData, phoneNumber: v || "" })}
                  className={`w-full bg-slate-800/50 border ${errors.phoneNumber
                    ? "border-red-500/50"
                    : "border-slate-700 focus-within:border-neonCyan"
                    } text-white rounded-lg px-4 py-2.5 text-sm outline-none transition-colors duration-200`}
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
                className={`w-full bg-slate-800/50 border ${errors.gender ? "border-red-500/50" : "border-slate-700 focus:border-neonCyan"
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
              <div className="relative z-20">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Calendar className="h-4 w-4 text-slate-500" />
                </div>
                <DatePicker
                  selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : null}
                  onChange={(date) => {
                    const localDate = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0] : "";
                    setFormData({ ...formData, dateOfBirth: localDate });
                    if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: "" });
                  }}
                  className={`w-full bg-slate-800/50 border ${errors.dateOfBirth
                    ? "border-red-500/50"
                    : "border-slate-700 focus:border-neonCyan"
                    } text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-200`}
                  dateFormat="yyyy-MM-dd"
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  maxDate={new Date()}
                  placeholderText="Select Date"
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
                  className={`w-full bg-slate-800/50 border ${errors.walletAddress
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
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-lg bg-slate-800 border border-slate-700 py-3 px-4 text-sm font-medium text-white shadow-lg transition-all hover:border-neonGreen hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 w-0 bg-gradient-to-r from-neonGreen/20 to-neonCyan/20 transition-all duration-[250ms] ease-out group-hover:w-full" />
              <span className="relative flex items-center justify-center font-bold tracking-wider">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "COMPLETE PROFILE"
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default CompleteProfile;
