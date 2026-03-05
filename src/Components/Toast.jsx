// src/components/Toast.jsx
import React, { useEffect } from "react";

const toastBase =
  "fixed z-50 inset-x-0 top-4 flex justify-center px-4 sm:px-6 pointer-events-none";

export function Toast({ message, type = "info", onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(id);
  }, [message, duration, onClose]);

  if (!message) return null;

  const color =
    type === "error"
      ? "bg-rose-500/90 border-rose-300 text-white"
      : type === "success"
      ? "bg-emerald-500/90 border-emerald-300 text-white"
      : "bg-slate-900/90 border-slate-600 text-slate-50";

  return (
    <div className={toastBase}>
      <div
        className={`pointer-events-auto max-w-md w-full rounded-2xl border shadow-lg shadow-slate-900/40 px-4 py-3 flex items-center gap-3 backdrop-blur-md ${color}`}
      >
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-xs uppercase tracking-wide font-semibold hover:opacity-70 transition-opacity"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default Toast;