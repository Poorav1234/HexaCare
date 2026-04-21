// src/services/securityApi.js
// Frontend API client for the backend authentication security endpoints.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

async function request(path, body) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, ...data };
    return data;
}

// ── Login OTP ───────────────────────────────────────────────────────────────

export async function requestLoginOtp(email, password) {
    return request("/auth/login/request-otp", { email, password });
}

export async function verifyLoginOtp(email, otp) {
    return request("/auth/login/verify-otp", { email, otp });
}

// ── Forgot Password ─────────────────────────────────────────────────────────

export async function requestPasswordResetOtp(email) {
    return request("/auth/forgot-password/request-otp", { email });
}

export async function verifyPasswordResetOtp(email, otp) {
    return request("/auth/forgot-password/verify-otp", { email, otp });
}

export async function resetPassword(resetToken, newPassword) {
    return request("/auth/forgot-password/reset", { resetToken, newPassword });
}

// ── Account Unlock ──────────────────────────────────────────────────────────

export async function requestAccountUnlock(email) {
    return request("/auth/account/request-unlock", { email });
}

export async function verifyAccountUnlock(email, otp) {
    return request("/auth/account/verify-unlock", { email, otp });
}
