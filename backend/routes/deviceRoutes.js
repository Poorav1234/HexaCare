// backend/routes/deviceRoutes.js
// API routes for the Gmail-style Trusted Device Approval system.
// All endpoints are prefixed with /auth/device (mounted in server.js).
// DOES NOT modify any existing routes, collections, or middleware.

const express = require("express");
const router = express.Router();
const admin = require("../firebaseAdmin");
const {
    approveDevice,
    denyDevice,
    checkApprovalStatus,
    getTrustedDevices,
    revokeDevice,
    revokeAllDevices,
    getUidFromEmail,
} = require("../services/deviceService");

// ── Helper: Verify Firebase ID token from Authorization header ──────────────
async function verifyAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    try {
        const idToken = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        return decoded;
    } catch (err) {
        return null;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// DEVICE APPROVAL (clicked from email — public, token-secured)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Approve a device via email link.
 * GET /auth/device/approve/:token
 */
router.get("/approve/:token", async (req, res) => {
    try {
        const result = await approveDevice(req.params.token);

        const page = (title, color, icon, body) => `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>HexaCare — ${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#020617;color:#e2e8f0;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
            .card{text-align:center;max-width:460px;background:#0f172a;padding:48px 40px;border-radius:20px;border:1px solid #1e293b;box-shadow:0 0 60px rgba(14,165,233,0.08)}
            .icon{font-size:56px;margin-bottom:20px}
            h1{color:${color};font-size:24px;margin-bottom:14px;font-weight:700}
            .subtitle{color:#94a3b8;font-size:14px;line-height:1.6}
            .info-box{background:#1e293b;padding:16px;border-radius:12px;margin:20px 0;text-align:left}
            .info-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#cbd5e1;border-bottom:1px solid #334155}
            .info-row:last-child{border-bottom:none}
            .info-label{color:#64748b;font-weight:600}
            .footer{color:#475569;font-size:11px;margin-top:24px;padding-top:16px;border-top:1px solid #334155}
        </style>
        </head><body>
        <div class="card">
            <div class="icon">${icon}</div>
            <h1>${title}</h1>
            ${body}
            <div class="footer">HexaCare Security System</div>
        </div></body></html>`;

        if (result.success) {
            return res.send(
                page(
                    "Device Approved ✓",
                    "#10b981",
                    "🛡️",
                    `<p class="subtitle">This device has been <strong style="color:#10b981">successfully approved</strong> and added to your trusted devices for <strong style="color:#0ea5e9">${result.email}</strong>.</p>
                     <p class="subtitle" style="margin-top:12px">You can now return to HexaCare to complete your login.</p>`
                )
            );
        } else {
            return res.status(400).send(
                page(
                    "Approval Failed",
                    "#ef4444",
                    "❌",
                    `<p class="subtitle">${result.reason}</p>
                     <p class="subtitle" style="margin-top:12px;color:#64748b;font-size:12px">Please try logging in again to receive a new approval request.</p>`
                )
            );
        }
    } catch (err) {
        console.error("[Device] Approve error:", err.message);
        res.status(500).send("Internal server error.");
    }
});

/**
 * Deny a device via email link.
 * GET /auth/device/deny/:token
 */
router.get("/deny/:token", async (req, res) => {
    try {
        const result = await denyDevice(req.params.token);

        const page = (title, color, icon, body) => `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>HexaCare — ${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#020617;color:#e2e8f0;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
            .card{text-align:center;max-width:460px;background:#0f172a;padding:48px 40px;border-radius:20px;border:1px solid #1e293b;box-shadow:0 0 60px rgba(239,68,68,0.08)}
            .icon{font-size:56px;margin-bottom:20px}
            h1{color:${color};font-size:24px;margin-bottom:14px;font-weight:700}
            .subtitle{color:#94a3b8;font-size:14px;line-height:1.6}
            .alert{background:#451a1a;border:1px solid #7f1d1d;padding:14px;border-radius:10px;margin:20px 0;font-size:13px;color:#fca5a5}
            .footer{color:#475569;font-size:11px;margin-top:24px;padding-top:16px;border-top:1px solid #334155}
        </style>
        </head><body>
        <div class="card">
            <div class="icon">${icon}</div>
            <h1>${title}</h1>
            ${body}
            <div class="footer">HexaCare Security System</div>
        </div></body></html>`;

        if (result.success) {
            return res.send(
                page(
                    "Access Denied",
                    "#f59e0b",
                    "🚫",
                    `<p class="subtitle">The login attempt for <strong style="color:#0ea5e9">${result.email}</strong> has been <strong style="color:#ef4444">blocked</strong>.</p>
                     <div class="alert">⚠️ If you did not initiate this login, your password may be compromised. Please change your password immediately.</div>`
                )
            );
        } else {
            return res.status(400).send(
                page(
                    "Action Failed",
                    "#ef4444",
                    "❌",
                    `<p class="subtitle">${result.reason}</p>`
                )
            );
        }
    } catch (err) {
        console.error("[Device] Deny error:", err.message);
        res.status(500).send("Internal server error.");
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// APPROVAL STATUS POLLING (called by frontend while waiting)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Check approval status.
 * POST /auth/device/status
 * Body: { email, approvalId }
 */
router.post("/status", async (req, res) => {
    const { email, approvalId } = req.body;

    if (!email || !approvalId) {
        return res.status(400).json({ error: "Email and approvalId are required." });
    }

    try {
        const uid = await getUidFromEmail(email);
        if (!uid) {
            return res.status(404).json({ error: "User not found." });
        }

        const result = await checkApprovalStatus(uid, approvalId);
        res.json(result);
    } catch (err) {
        console.error("[Device] Status check error:", err.message);
        res.status(500).json({ error: "Failed to check approval status." });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// TRUSTED DEVICE MANAGEMENT (requires authentication)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * List trusted devices.
 * GET /auth/device/trusted
 * Header: Authorization: Bearer <Firebase ID Token>
 */
router.get("/trusted", async (req, res) => {
    const user = await verifyAuthToken(req);
    if (!user) return res.status(401).json({ error: "Authentication required." });

    try {
        const devices = await getTrustedDevices(user.uid);
        res.json({ devices });
    } catch (err) {
        console.error("[Device] List trusted error:", err.message);
        res.status(500).json({ error: "Failed to fetch trusted devices." });
    }
});

/**
 * Revoke a specific trusted device.
 * DELETE /auth/device/trusted/:deviceId
 * Header: Authorization: Bearer <Firebase ID Token>
 */
router.delete("/trusted/:deviceId", async (req, res) => {
    const user = await verifyAuthToken(req);
    if (!user) return res.status(401).json({ error: "Authentication required." });

    try {
        await revokeDevice(user.uid, req.params.deviceId);
        res.json({ success: true, message: "Device revoked successfully." });
    } catch (err) {
        console.error("[Device] Revoke error:", err.message);
        res.status(500).json({ error: "Failed to revoke device." });
    }
});

/**
 * Revoke ALL trusted devices (logout from all).
 * POST /auth/device/revoke-all
 * Header: Authorization: Bearer <Firebase ID Token>
 */
router.post("/revoke-all", async (req, res) => {
    const user = await verifyAuthToken(req);
    if (!user) return res.status(401).json({ error: "Authentication required." });

    try {
        const result = await revokeAllDevices(user.uid);
        res.json({ success: true, message: `${result.devicesRevoked} device(s) revoked.` });
    } catch (err) {
        console.error("[Device] Revoke all error:", err.message);
        res.status(500).json({ error: "Failed to revoke devices." });
    }
});

module.exports = router;
