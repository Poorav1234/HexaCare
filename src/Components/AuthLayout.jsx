// src/components/AuthLayout.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function AuthLayout({ children, title, subtitle }) {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#22c1c3_0,_transparent_55%),_radial-gradient(circle_at_bottom,_#8a2be2_0,_transparent_55%)] opacity-70 animate-[pulse_12s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,_#0ea5e9_0,_transparent_60%)] mix-blend-overlay opacity-40" />
        {/* Hexagon grid overlay */}
        <div className="absolute inset-0 opacity-30 mix-blend-soft-light">
          <div className="w-[200%] h-[200%] bg-[linear-gradient(120deg,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(240deg,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[length:32px_56px] translate-x-[-25%] translate-y-[-25%] animate-[slow-pan_40s_linear_infinite]" />
        </div>
        {/* Glowing scanner rings */}
        <div className="absolute -left-40 top-1/3 w-80 h-80 rounded-full border border-cyan-400/40 blur-xl animate-[float_10s_ease-in-out_infinite]" />
        <div className="absolute -right-40 bottom-1/4 w-96 h-96 rounded-full border border-violet-500/40 blur-xl animate-[float_11s_ease-in-out_infinite_reverse]" />
        {/* Particles */}
        {Array.from({ length: 26 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/70 shadow-[0_0_12px_rgba(45,212,191,0.8)]"
            style={{
              top: `${10 + (i * 3) % 80}%`,
              left: `${(i * 17) % 100}%`,
              animation: `twinkle ${6 + (i % 4)}s ease-in-out ${
                i * 0.4
              }s infinite`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full grid lg:grid-cols-[1.1fr,1fr] gap-10 items-center">
          {/* Brand / Hero */}
          <div className="hidden lg:flex flex-col gap-6 text-slate-100">
            <div className="inline-flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-violet-500 flex items-center justify-center shadow-[0_0_32px_rgba(34,211,238,0.65)]">
                  <div className="w-6 h-6 border-2 border-slate-950/80 rounded-[0.8rem] rotate-12 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-950/90" />
                  </div>
                </div>
                <div className="absolute -inset-1 rounded-3xl bg-cyan-400/20 blur animate-pulse" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    HexaCare
                  </h1>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/80">
                    AI · ML · Chain
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300/80">
                  A secure, AI‑powered health vault anchored on blockchain.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-lg font-medium text-slate-100/90">
                Own your health data, unlock AI‑driven insights, and connect
                securely across the care ecosystem.
              </p>
              <ul className="space-y-2 text-sm text-slate-200/80">
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 text-xs">
                    ✓
                  </span>
                  Encrypted records mapped to your on‑chain wallet.
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 text-xs">
                    ⚡
                  </span>
                  Real‑time AI triage and anomaly detection.
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/20 text-violet-300 text-xs">
                    ⛓
                  </span>
                  Verifiable access trails using blockchain primitives.
                </li>
              </ul>
            </div>
          </div>

          {/* Auth Card */}
          <div className="relative">
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-cyan-400/70 via-violet-500/70 to-emerald-400/70 opacity-70 blur-[18px]" />
            <div className="relative rounded-3xl bg-slate-900/70 border border-slate-700/60 backdrop-blur-2xl shadow-[0_24px_80px_rgba(15,23,42,0.95)] overflow-hidden">
              <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent opacity-70" />
              <div className="absolute -top-40 right-0 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl" />
              <div className="relative px-6 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8">
                {/* Tabs */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="mt-1 text-xs text-slate-300/80">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 border border-slate-700/80 p-1 text-[11px] font-medium text-slate-200/90">
                    <Link
                      to="/login"
                      className={classNames(
                        "px-3 py-1 rounded-full transition-all",
                        isLogin
                          ? "bg-slate-100 text-slate-900 shadow"
                          : "text-slate-300 hover:bg-slate-800/90"
                      )}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className={classNames(
                        "px-3 py-1 rounded-full transition-all",
                        isRegister
                          ? "bg-slate-100 text-slate-900 shadow"
                          : "text-slate-300 hover:bg-slate-800/90"
                      )}
                    >
                      Register
                    </Link>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-700/60" />

                <div className="mt-5 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/80 scrollbar-track-transparent pr-1">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes (Tailwind via global CSS, see index.css) */}
    </div>
  );
}

export default AuthLayout;