// backend/services/emailService.js
// Centralized email service for OTP delivery, lock notifications, and password reset.
// Uses the same SMTP config from .env as the existing admin email route.

const nodemailer = require("nodemailer");

let transporter = null;

function initTransporter() {
    const configured = process.env.SMTP_HOST && process.env.SMTP_USER;
    if (!configured) return null;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
    });
    return transporter;
}

function getTransporter() {
    if (!transporter) initTransporter();
    return transporter;
}

// ── Shared Styles ───────────────────────────────────────────────────────────
const wrapper = `font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;`;
const footer = `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #334155;"><p style="color:#475569;font-size:11px;margin:0;">This is an automated message from HexaCare.</p></div>`;

// ── OTP Email ───────────────────────────────────────────────────────────────
async function sendOtpEmail(to, otp, purpose = "login") {
    const t = getTransporter();
    if (!t) throw new Error("Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");

    const titles = {
        login: "Login Verification",
        reset: "Password Reset",
        unlock: "Account Unlock",
    };
    const title = titles[purpose] || "Verification";

    await t.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `HexaCare — ${title} OTP`,
        html: `
            <div style="${wrapper}">
                <h1 style="color:#0ea5e9;margin:0 0 8px;font-size:24px;">HexaCare</h1>
                <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">${title}</p>
                <p>Your one-time password is:</p>
                <div style="background:#1e293b;padding:20px;border-radius:12px;margin:16px 0;text-align:center;">
                    <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#0ea5e9;font-family:'Courier New',monospace;">${otp}</span>
                </div>
                <p style="color:#f59e0b;font-size:13px;">⏱️ This OTP expires in <strong>60 seconds</strong>. Do not share it with anyone.</p>
                <p style="color:#64748b;font-size:12px;margin-top:16px;">If you did not request this, please ignore this email.</p>
                ${footer}
            </div>
        `,
    });
}

// ── Account Lock Notification ───────────────────────────────────────────────
async function sendLockNotification(to, details = {}) {
    const t = getTransporter();
    if (!t) throw new Error("Email service not configured");

    const lockTime = new Date(details.lockedAt || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const ip = details.ip || "Unknown";
    const unlockUrl = details.unlockUrl || "";

    await t.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "HexaCare — Account Temporarily Locked",
        html: `
            <div style="${wrapper}">
                <h1 style="color:#ef4444;margin:0 0 8px;font-size:24px;">🔒 Account Locked</h1>
                <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Security Alert — HexaCare</p>
                <p>Your account has been <strong style="color:#ef4444;">temporarily disabled</strong> due to multiple failed login attempts.</p>
                <div style="background:#1e293b;padding:16px;border-radius:8px;margin:16px 0;">
                    <p style="margin:4px 0;font-size:14px;"><strong>Time of Lock:</strong> ${lockTime}</p>
                    <p style="margin:4px 0;font-size:14px;"><strong>IP Address:</strong> ${ip}</p>
                    <p style="margin:4px 0;font-size:14px;"><strong>Lock Duration:</strong> ${details.lockDurationMin || 15} minutes</p>
                </div>
                <p style="font-size:14px;margin:16px 0;">To regain access, you can:</p>
                <ul style="color:#cbd5e1;font-size:13px;padding-left:20px;">
                    <li>Wait for the lock to expire automatically</li>
                    <li>Use the unlock button below</li>
                </ul>
                ${unlockUrl ? `
                <div style="text-align:center;margin:24px 0;">
                    <a href="${unlockUrl}" style="background:#0ea5e9;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Unlock My Account</a>
                </div>` : ""}
                <p style="color:#f59e0b;font-size:13px;">⚠️ If this wasn't you, please secure your account immediately.</p>
                ${footer}
            </div>
        `,
    });
}

module.exports = { initTransporter, getTransporter, sendOtpEmail, sendLockNotification, sendDeviceApprovalEmail };

// ── New Device Approval Email ───────────────────────────────────────────────
async function sendDeviceApprovalEmail(to, details = {}) {
    const t = getTransporter();
    if (!t) throw new Error("Email service not configured");

    const { browser, os, ip, timestamp, approveUrl, denyUrl } = details;

    await t.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "HexaCare — New Device Login Attempt",
        html: `
            <div style="${wrapper}">
                <h1 style="color:#f59e0b;margin:0 0 8px;font-size:24px;">🔐 New Device Login</h1>
                <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Security Alert — HexaCare</p>
                <p>Someone is trying to log in to your account from a <strong style="color:#f59e0b;">new device</strong>.</p>

                <div style="background:#1e293b;padding:16px;border-radius:12px;margin:16px 0;">
                    <p style="margin:6px 0;font-size:14px;"><strong style="color:#64748b;">Browser:</strong> <span style="color:#e2e8f0;">${browser || "Unknown"}</span></p>
                    <p style="margin:6px 0;font-size:14px;"><strong style="color:#64748b;">Operating System:</strong> <span style="color:#e2e8f0;">${os || "Unknown"}</span></p>
                    <p style="margin:6px 0;font-size:14px;"><strong style="color:#64748b;">IP Address:</strong> <span style="color:#e2e8f0;">${ip || "Unknown"}</span></p>
                    <p style="margin:6px 0;font-size:14px;"><strong style="color:#64748b;">Time:</strong> <span style="color:#e2e8f0;">${timestamp || new Date().toLocaleString()}</span></p>
                </div>

                <p style="font-size:14px;margin:16px 0;color:#cbd5e1;">Was this you? Choose an action below:</p>

                <div style="text-align:center;margin:24px 0;">
                    ${approveUrl ? `<a href="${approveUrl}" style="background:#10b981;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;margin:6px;">✓ Approve Device</a>` : ""}
                    ${denyUrl ? `<a href="${denyUrl}" style="background:#ef4444;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;margin:6px;">✕ Deny Access</a>` : ""}
                </div>

                <p style="color:#f59e0b;font-size:13px;">⏱️ This link expires in <strong>10 minutes</strong>.</p>
                <p style="color:#ef4444;font-size:12px;margin-top:8px;">⚠️ If you did not attempt to log in, click <strong>Deny Access</strong> and change your password immediately.</p>
                ${footer}
            </div>
        `,
    });
}
