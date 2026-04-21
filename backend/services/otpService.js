// backend/services/otpService.js
// Cryptographically secure OTP generation, hashing, storage, and verification.
// Uses in-memory Map storage with automatic cleanup.

const crypto = require("crypto");

// ── In-Memory OTP Store ─────────────────────────────────────────────────────
const otpStore = new Map();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of otpStore) {
        if (now > data.expiresAt) {
            otpStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

// ── Functions ───────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash an OTP using SHA-256 with a constant-time comparison in mind.
 */
function hashOtp(otp) {
    return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

/**
 * Store an OTP for a given key (e.g., "login:user@example.com").
 * @param {string} key - Unique identifier
 * @param {string} otp - The plain OTP
 * @param {number} ttlSeconds - Time to live (default: 60)
 */
function storeOtp(key, otp, ttlSeconds = 60) {
    otpStore.set(key, {
        hash: hashOtp(otp),
        expiresAt: Date.now() + ttlSeconds * 1000,
        used: false,
        attempts: 0,
    });
}

/**
 * Verify an OTP. Single-use — consumed on success.
 * @param {string} key
 * @param {string} otp
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyOtp(key, otp) {
    const data = otpStore.get(key);

    if (!data) {
        return { valid: false, reason: "OTP not found or expired. Please request a new one." };
    }

    if (data.used) {
        return { valid: false, reason: "OTP has already been used." };
    }

    if (Date.now() > data.expiresAt) {
        otpStore.delete(key);
        return { valid: false, reason: "OTP has expired. Please request a new one." };
    }

    // Rate-limit verification attempts (prevent brute-force on the 6-digit space)
    data.attempts += 1;
    if (data.attempts > 5) {
        otpStore.delete(key);
        return { valid: false, reason: "Too many invalid attempts. Please request a new OTP." };
    }

    // Constant-time comparison to prevent timing attacks
    const inputHash = hashOtp(otp);
    if (!crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(data.hash))) {
        return { valid: false, reason: "Invalid OTP. Please try again." };
    }

    // Mark as used (single-use) and remove
    data.used = true;
    otpStore.delete(key);

    return { valid: true };
}

/**
 * Check if an OTP was recently issued for a key (anti-spam).
 * @param {string} key
 * @returns {boolean}
 */
function hasRecentOtp(key) {
    const data = otpStore.get(key);
    if (!data) return false;
    return Date.now() < data.expiresAt;
}

module.exports = { generateOtp, storeOtp, verifyOtp, hasRecentOtp };
