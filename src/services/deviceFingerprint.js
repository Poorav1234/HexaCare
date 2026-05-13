// src/services/deviceFingerprint.js
// Browser-side device fingerprinting utility.
// Generates a stable fingerprint hash from browser characteristics.
// Uses NO hardware identifiers (MAC, serial, etc.)
// Uses UUID/token-based identification combined with browser characteristics.

const DEVICE_TOKEN_KEY = "hexacare_device_token";

/**
 * Get or create a persistent device token stored in localStorage.
 * This provides a stable identifier even if browser characteristics change slightly.
 */
function getOrCreateDeviceToken() {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) {
        // Generate a UUID v4-like token
        token = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
}

/**
 * Collect browser fingerprint data.
 * This data is sent as a custom header to the backend for server-side hashing.
 */
function collectFingerprintData() {
    const components = {
        deviceToken: getOrCreateDeviceToken(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform || "unknown",
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        colorDepth: screen.colorDepth,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
    };

    return components;
}

/**
 * Get the device token header value for API requests.
 * The backend uses this along with User-Agent for fingerprinting.
 */
export function getDeviceHeaders() {
    const data = collectFingerprintData();
    return {
        "X-Device-Token": data.deviceToken,
        "X-Device-Fingerprint": btoa(JSON.stringify(data)),
    };
}

/**
 * Get a human-readable description of the current device.
 */
export function getDeviceDescription() {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    if (ua.includes("Edg/")) browser = "Microsoft Edge";
    else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) browser = "Google Chrome";
    else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";
    else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

    if (ua.includes("Windows NT 10")) os = "Windows 10/11";
    else if (ua.includes("Windows NT")) os = "Windows";
    else if (ua.includes("Mac OS X")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return { browser, os };
}

/**
 * Clear the device token (used when user wants to reset device identity).
 */
export function clearDeviceToken() {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
}

export default {
    getDeviceHeaders,
    getDeviceDescription,
    clearDeviceToken,
};
