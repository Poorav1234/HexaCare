// backend/routes/authRoutes.js
// Authentication enhancement routes: OTP login, forgot password, account unlock.
// All endpoints are prefixed with /auth (mounted in server.js).

const express = require("express");
const axios = require("axios");
const router = express.Router();

const { generateOtp, storeOtp, verifyOtp, hasRecentOtp } = require("../services/otpService");
const {
    checkLockStatus,
    recordFailedAttempt,
    recordSuccessfulLogin,
    unlockAccount,
    generateUnlockToken,
    verifyUnlockToken,
    generateResetToken,
    verifyResetToken,
} = require("../services/securityService");
const { sendOtpEmail, sendLockNotification } = require("../services/emailService");

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const admin = require("../firebaseAdmin");

async function logSecurityEventServer(email, action, metadata = {}, severity = "info") {
    if (!admin) return;
    try {
        const db = admin.firestore();
        await db.collection("activityLogs").add({
            userId: "",
            email: email || "unknown",
            action,
            metadata,
            severity,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // silent fail
    }
}

// ── Simple Rate Limiter ─────────────────────────────────────────────────────
const otpRequestCounts = new Map();

function checkOtpRateLimit(key, maxPerMinute = 3) {
    const now = Date.now();
    if (!otpRequestCounts.has(key)) otpRequestCounts.set(key, []);
    const recent = otpRequestCounts.get(key).filter((t) => now - t < 60000);
    otpRequestCounts.set(key, recent);
    if (recent.length >= maxPerMinute) return false;
    recent.push(now);
    return true;
}

function getClientIp(req) {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "unknown"
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN OTP FLOW
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Step 1 — Verify credentials via Firebase REST API, then send OTP.
 * POST /auth/login/request-otp
 * Body: { email, password }
 */
router.post("/login/request-otp", async (req, res) => {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    if (!FIREBASE_API_KEY) {
        return res.status(500).json({ error: "Server misconfigured: FIREBASE_API_KEY not set." });
    }

    // Check brute-force lock
    const lockStatus = checkLockStatus(email, ip);
    if (lockStatus.locked) {
        return res.status(423).json({
            error: `Account is temporarily locked. Try again in ${lockStatus.remainingMin} minute(s).`,
            locked: true,
            remainingMin: lockStatus.remainingMin,
        });
    }

    try {
        // Verify credentials with Firebase REST API
        await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
            { email, password, returnSecureToken: false }
        );

        // Rate-limit successful OTP dispatches (isolated only for ACTUAL OTP requests)
        if (!checkOtpRateLimit(`login:${email}`, 3)) {
            return res.status(429).json({ error: "Too many OTP requests. Please wait a moment." });
        }

        // Credentials valid → generate and send OTP
        const otp = generateOtp();
        storeOtp(`login:${email}`, otp, 60);

        try {
            await sendOtpEmail(email, otp, "login");
            logSecurityEventServer(email, "otp_requested", { context: "login", ip }, "info");
        } catch (emailErr) {
            console.error("[Auth] Failed to send login OTP:", emailErr.message);
            return res.status(503).json({ error: "Failed to send OTP email. Please try again." });
        }

        res.json({ success: true, message: "OTP sent to your email.", expiresIn: 60 });
    } catch (error) {
        // Credential verification failed
        const failResult = recordFailedAttempt(email, ip);

        logSecurityEventServer(email, "login_failed", { remainingAttempts: failResult.remainingAttempts, ip }, "warning");

        // If account just got locked → send notification email
        if (failResult.locked && failResult.shouldNotify) {
            logSecurityEventServer(email, "account_locked", { ip, lockDurationMin: failResult.lockDurationMin }, "critical");

            const unlockToken = generateUnlockToken(email);
            const unlockUrl = `${BACKEND_URL}/auth/account/unlock/${unlockToken}`;
            try {
                await sendLockNotification(email, {
                    lockedAt: Date.now(),
                    ip,
                    lockDurationMin: failResult.lockDurationMin,
                    unlockUrl,
                });
            } catch (notifyErr) {
                console.error("[Auth] Lock notification email failed:", notifyErr.message);
            }
            return res.status(423).json({
                error: "Your account has been temporarily locked due to multiple failed login attempts",
                locked: true,
                remainingMin: failResult.lockDurationMin,
            });
        }

        const msg =
            failResult.remainingAttempts > 0
                ? `Invalid username or password. ${failResult.remainingAttempts} attempts remaining`
                : "Invalid username or password.";

        res.status(401).json({ error: msg, remainingAttempts: failResult.remainingAttempts });
    }
});

/**
 * Step 2 — Verify the login OTP.
 * POST /auth/login/verify-otp
 * Body: { email, otp }
 */
router.post("/login/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    const ip = getClientIp(req);

    if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required." });
    }

    const result = verifyOtp(`login:${email}`, otp);
    if (!result.valid) {
        logSecurityEventServer(email, "login_failed", { context: "invalid_otp", ip }, "warning");
        return res.status(401).json({ error: result.reason });
    }

    recordSuccessfulLogin(email);
    res.json({ success: true, message: "OTP verified. Login successful.", verified: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD FLOW
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Step 1 — Send password-reset OTP.
 * POST /auth/forgot-password/request-otp
 * Body: { email }
 */
router.post("/forgot-password/request-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    if (!checkOtpRateLimit(`reset:${email}`, 3)) {
        return res.status(429).json({ error: "Too many requests. Please wait before requesting another OTP." });
    }
    if (hasRecentOtp(`reset:${email}`)) {
        return res.status(429).json({ error: "An OTP was recently sent. Please wait for it to expire." });
    }

    const otp = generateOtp();
    storeOtp(`reset:${email}`, otp, 60);

    try {
        await sendOtpEmail(email, otp, "reset");
        logSecurityEventServer(email, "otp_requested", { context: "forgot_password" }, "info");
        // Generic message to prevent email enumeration
        res.json({ success: true, message: "If the email is registered, an OTP has been sent.", expiresIn: 60 });
    } catch (emailErr) {
        console.error("[Auth] Failed to send reset OTP:", emailErr.message);
        res.status(503).json({ error: "Failed to send OTP. Please try again." });
    }
});

/**
 * Step 2 — Verify reset OTP and issue a reset token.
 * POST /auth/forgot-password/verify-otp
 * Body: { email, otp }
 */
router.post("/forgot-password/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    const ip = getClientIp(req);

    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required." });

    const result = verifyOtp(`reset:${email}`, otp);
    if (!result.valid) return res.status(401).json({ error: result.reason });

    const resetToken = generateResetToken(email);
    res.json({ success: true, message: "OTP verified. You can now reset your password.", resetToken });
});

/**
 * Step 3 — Reset the password.
 * POST /auth/forgot-password/reset
 * Body: { resetToken, newPassword }
 */
router.post("/forgot-password/reset", async (req, res) => {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
        return res.status(400).json({ error: "Reset token and new password are required." });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const tokenResult = verifyResetToken(resetToken);
    if (!tokenResult.valid) return res.status(401).json({ error: tokenResult.reason });

    const email = tokenResult.email;

    // Try Firebase Admin SDK first (full OTP-based reset)
    try {
        if (admin) {
            const userRecord = await admin.auth().getUserByEmail(email);
            await admin.auth().updateUser(userRecord.uid, { password: newPassword });
            logSecurityEventServer(email, "password_reset", { method: "admin_sdk" }, "warning");
            return res.json({ success: true, message: "Password has been reset successfully." });
        }
    } catch (adminErr) {
        if (adminErr.code !== "MODULE_NOT_FOUND") {
            console.error("[Auth] Admin SDK password reset failed:", adminErr.message);
        }
    }

    // Fallback: send standard Firebase password reset link
    try {
        await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
            { requestType: "PASSWORD_RESET", email }
        );
        logSecurityEventServer(email, "password_reset", { method: "fallback_link" }, "warning");
        res.json({
            success: true,
            message: "A password reset link has been sent to your email.",
            fallback: true,
        });
    } catch (fallbackErr) {
        console.error("[Auth] Password reset fallback failed:", fallbackErr.message);
        res.status(500).json({ error: "Failed to reset password. Please try again." });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNT UNLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Unlock via email link (GET — clicked from the lock notification email).
 * GET /auth/account/unlock/:token
 */
router.get("/account/unlock/:token", (req, res) => {
    const result = verifyUnlockToken(req.params.token);

    const page = (title, color, icon, body) => `
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>HexaCare — ${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#020617;color:#e2e8f0;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}</style>
    </head><body>
    <div style="text-align:center;max-width:420px;background:#0f172a;padding:40px;border-radius:20px;border:1px solid #1e293b;">
        <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
        <h1 style="color:${color};font-size:22px;margin-bottom:12px;">${title}</h1>
        ${body}
    </div></body></html>`;

    if (!result.valid) {
        return res.status(400).send(
            page("Unlock Failed", "#ef4444", "❌", `<p style="color:#94a3b8;">${result.reason}</p><p style="margin-top:16px;color:#64748b;font-size:13px;">Please request a new unlock link or wait for the lock to expire automatically.</p>`)
        );
    }

    unlockAccount(result.email);
    res.send(
        page("Account Unlocked", "#10b981", "✅", `<p>Your account <strong style="color:#0ea5e9;">${result.email}</strong> has been successfully unlocked.</p><p style="margin-top:16px;color:#94a3b8;font-size:13px;">You can now return to HexaCare and log in.</p>`)
    );
});

/**
 * Request an unlock OTP (alternative to the email link).
 * POST /auth/account/request-unlock
 * Body: { email }
 */
router.post("/account/request-unlock", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    if (!checkOtpRateLimit(`unlock:${email}`, 2)) {
        return res.status(429).json({ error: "Too many requests. Please wait." });
    }

    // Only send if actually locked (don't reveal lock status to attackers)
    const lockStatus = checkLockStatus(email, "any");
    if (!lockStatus.locked) {
        return res.json({ success: true, message: "If your account is locked, an unlock OTP has been sent." });
    }

    const otp = generateOtp();
    storeOtp(`unlock:${email}`, otp, 60);

    try {
        await sendOtpEmail(email, otp, "unlock");
        res.json({ success: true, message: "Unlock OTP sent to your email.", expiresIn: 60 });
    } catch (err) {
        console.error("[Auth] Failed to send unlock OTP:", err.message);
        res.status(503).json({ error: "Failed to send OTP." });
    }
});

/**
 * Verify unlock OTP.
 * POST /auth/account/verify-unlock
 * Body: { email, otp }
 */
router.post("/account/verify-unlock", (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required." });

    const result = verifyOtp(`unlock:${email}`, otp);
    if (!result.valid) return res.status(401).json({ error: result.reason });

    unlockAccount(email);
    res.json({ success: true, message: "Account unlocked successfully. You can now login." });
});

module.exports = router;
