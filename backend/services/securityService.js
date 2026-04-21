// backend/services/securityService.js
// Brute-force protection: tracks failed login attempts per account and IP,
// locks accounts/IPs after threshold, and provides token-based unlock/reset.

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// ── Configuration ───────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;   // 10 minutes
const LOCK_DURATION_MS = 15 * 60 * 1000;    // 15 minutes
const UNLOCK_TOKEN_EXPIRY = "30m";
const RESET_TOKEN_EXPIRY = "10m";

// Generate a stable JWT secret per server session (or use env var)
const JWT_SECRET =
    process.env.JWT_SECRET ||
    crypto.randomBytes(32).toString("hex");

// ── In-Memory Stores ────────────────────────────────────────────────────────
// account email → { attempts: [{timestamp, ip}], lockedUntil, lockedAt }
const failedAttempts = new Map();
// ip string → { attempts: [{timestamp}], lockedUntil }
const ipAttempts = new Map();

// Cleanup expired entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of failedAttempts) {
        if (data.lockedUntil && now > data.lockedUntil) {
            data.lockedUntil = null;
            data.lockedAt = null;
            data.attempts = [];
        }
        data.attempts = data.attempts.filter((a) => now - a.timestamp < ATTEMPT_WINDOW_MS);
        if (data.attempts.length === 0 && !data.lockedUntil) failedAttempts.delete(key);
    }
    for (const [key, data] of ipAttempts) {
        if (data.lockedUntil && now > data.lockedUntil) {
            data.lockedUntil = null;
            data.attempts = [];
        }
        data.attempts = data.attempts.filter((a) => now - a.timestamp < ATTEMPT_WINDOW_MS);
        if (data.attempts.length === 0 && !data.lockedUntil) ipAttempts.delete(key);
    }
}, 10 * 60 * 1000);

// ── Lock Checking ───────────────────────────────────────────────────────────

function checkLockStatus(email, ip) {
    const now = Date.now();

    const accountData = failedAttempts.get(email);
    if (accountData?.lockedUntil && now < accountData.lockedUntil) {
        const remainingMs = accountData.lockedUntil - now;
        return {
            locked: true,
            type: "account",
            remainingMs,
            remainingMin: Math.ceil(remainingMs / 60000),
            lockedAt: accountData.lockedAt,
        };
    }

    const ipData = ipAttempts.get(ip);
    if (ipData?.lockedUntil && now < ipData.lockedUntil) {
        const remainingMs = ipData.lockedUntil - now;
        return {
            locked: true,
            type: "ip",
            remainingMs,
            remainingMin: Math.ceil(remainingMs / 60000),
        };
    }

    return { locked: false };
}

// ── Attempt Recording ───────────────────────────────────────────────────────

/**
 * Record a failed login attempt.
 * @returns {{ locked, shouldNotify, attemptCount, remainingAttempts, ... }}
 */
function recordFailedAttempt(email, ip) {
    const now = Date.now();

    // — Account tracking —
    if (!failedAttempts.has(email)) {
        failedAttempts.set(email, { attempts: [], lockedUntil: null, lockedAt: null });
    }
    const acct = failedAttempts.get(email);
    acct.attempts.push({ timestamp: now, ip });
    acct.attempts = acct.attempts.filter((a) => now - a.timestamp < ATTEMPT_WINDOW_MS);

    // — IP tracking —
    if (!ipAttempts.has(ip)) {
        ipAttempts.set(ip, { attempts: [], lockedUntil: null });
    }
    const ipd = ipAttempts.get(ip);
    ipd.attempts.push({ timestamp: now });
    ipd.attempts = ipd.attempts.filter((a) => now - a.timestamp < ATTEMPT_WINDOW_MS);

    let locked = false;
    let shouldNotify = false;

    // Lock account after threshold
    if (acct.attempts.length >= MAX_FAILED_ATTEMPTS && !acct.lockedUntil) {
        acct.lockedUntil = now + LOCK_DURATION_MS;
        acct.lockedAt = now;
        locked = true;
        shouldNotify = true;
    }

    // Lock IP after double threshold (attack from single IP)
    if (ipd.attempts.length >= MAX_FAILED_ATTEMPTS * 2 && !ipd.lockedUntil) {
        ipd.lockedUntil = now + LOCK_DURATION_MS;
    }

    return {
        locked,
        shouldNotify,
        attemptCount: acct.attempts.length,
        maxAttempts: MAX_FAILED_ATTEMPTS,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - acct.attempts.length),
        ip,
        lockDurationMin: LOCK_DURATION_MS / 60000,
    };
}

function recordSuccessfulLogin(email) {
    failedAttempts.delete(email);
}

function unlockAccount(email) {
    const data = failedAttempts.get(email);
    if (data) {
        data.lockedUntil = null;
        data.lockedAt = null;
        data.attempts = [];
    }
}

// ── Token Generation / Verification ─────────────────────────────────────────

function generateUnlockToken(email) {
    return jwt.sign({ email, purpose: "account_unlock" }, JWT_SECRET, {
        expiresIn: UNLOCK_TOKEN_EXPIRY,
    });
}

function verifyUnlockToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.purpose !== "account_unlock") return { valid: false, reason: "Invalid token purpose." };
        return { valid: true, email: decoded.email };
    } catch (err) {
        return {
            valid: false,
            reason: err.name === "TokenExpiredError" ? "Unlock link has expired." : "Invalid unlock token.",
        };
    }
}

function generateResetToken(email) {
    return jwt.sign({ email, purpose: "password_reset" }, JWT_SECRET, {
        expiresIn: RESET_TOKEN_EXPIRY,
    });
}

function verifyResetToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.purpose !== "password_reset") return { valid: false, reason: "Invalid token purpose." };
        return { valid: true, email: decoded.email };
    } catch (err) {
        return {
            valid: false,
            reason: err.name === "TokenExpiredError" ? "Reset token has expired." : "Invalid reset token.",
        };
    }
}

module.exports = {
    checkLockStatus,
    recordFailedAttempt,
    recordSuccessfulLogin,
    unlockAccount,
    generateUnlockToken,
    verifyUnlockToken,
    generateResetToken,
    verifyResetToken,
    JWT_SECRET,
};
