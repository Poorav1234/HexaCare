// src/services/deviceApi.js
// Frontend API client for the Trusted Device Approval system.
// Communicates with backend /auth/device/* endpoints.

import { getDeviceHeaders } from "./deviceFingerprint";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/**
 * Make an API request with device fingerprint headers included.
 */
async function deviceRequest(path, options = {}) {
    const deviceHeaders = getDeviceHeaders();

    const res = await fetch(`${BACKEND_URL}${path}`, {
        method: options.method || "POST",
        headers: {
            "Content-Type": "application/json",
            ...deviceHeaders,
            ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, ...data };
    return data;
}

// ── Approval Status Polling ─────────────────────────────────────────────────

/**
 * Poll the approval status of a pending device approval.
 * @param {string} email - User's email
 * @param {string} approvalId - The pending approval ID
 * @returns {{ status: 'pending' | 'approved' | 'denied' | 'expired' | 'not_found' }}
 */
export async function checkDeviceApprovalStatus(email, approvalId) {
    return deviceRequest("/auth/device/status", {
        body: { email, approvalId },
    });
}

// ── Trusted Device Management ───────────────────────────────────────────────

/**
 * List all trusted devices for the authenticated user.
 * Requires Firebase ID Token.
 */
export async function listTrustedDevices(idToken) {
    return deviceRequest("/auth/device/trusted", {
        method: "GET",
        headers: { Authorization: `Bearer ${idToken}` },
    });
}

/**
 * Revoke a specific trusted device.
 */
export async function revokeTrustedDevice(idToken, deviceId) {
    return deviceRequest(`/auth/device/trusted/${deviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
    });
}

/**
 * Revoke ALL trusted devices (logout from everywhere).
 */
export async function revokeAllTrustedDevices(idToken) {
    return deviceRequest("/auth/device/revoke-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
    });
}

export default {
    checkDeviceApprovalStatus,
    listTrustedDevices,
    revokeTrustedDevice,
    revokeAllTrustedDevices,
};
