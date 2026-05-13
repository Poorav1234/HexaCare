// backend/services/deviceService.js
// Gmail-style Trusted Device Approval Service.
// Manages the isolated `userSecurity` Firestore collection.
// DOES NOT touch existing users, activityLogs, or any other collection.

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const admin = require("../firebaseAdmin");
const { JWT_SECRET } = require("./securityService");

// ── Configuration ────────────────────────────────────────────────────────────
const APPROVAL_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const APPROVAL_TOKEN_JWT_EXPIRY = "10m";
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_TRUSTED_DEVICES = 10;

// In-memory token consumption tracker (prevents replay attacks)
const consumedTokens = new Set();

// Cleanup consumed tokens every 15 minutes
setInterval(() => {
    consumedTokens.clear();
}, 15 * 60 * 1000);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a secure device fingerprint hash from request headers.
 * Uses User-Agent + Accept-Language + Accept-Encoding to create
 * a stable, non-hardware-based identifier.
 */
function generateDeviceFingerprint(req) {
    const components = [
        req.headers["user-agent"] || "unknown",
        req.headers["accept-language"] || "unknown",
        req.headers["accept-encoding"] || "unknown",
        req.headers["sec-ch-ua-platform"] || "",
        req.headers["sec-ch-ua"] || "",
    ].join("|");

    return crypto.createHash("sha256").update(components).digest("hex");
}

/**
 * Parse browser and OS from User-Agent string.
 */
function parseDeviceInfo(req) {
    const ua = req.headers["user-agent"] || "Unknown";
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

    // Basic UA parsing
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Browser detection
    if (ua.includes("Edg/")) browser = "Microsoft Edge";
    else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) browser = "Google Chrome";
    else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";
    else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

    // OS detection
    if (ua.includes("Windows NT 10")) os = "Windows 10/11";
    else if (ua.includes("Windows NT")) os = "Windows";
    else if (ua.includes("Mac OS X")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return {
        browser,
        os,
        ip,
        userAgent: ua.substring(0, 200), // Truncate for safety
    };
}

/**
 * Get Firestore reference for userSecurity collection.
 */
function getSecurityDb() {
    if (!admin) throw new Error("Firebase Admin not initialized.");
    return admin.firestore();
}

// ── Core Device Trust Functions ─────────────────────────────────────────────

/**
 * Check if a device is trusted for a given user.
 * @param {string} uid - Firebase user UID
 * @param {object} req - Express request object
 * @returns {{ trusted: boolean, deviceId?: string, deviceInfo: object, fingerprintHash: string }}
 */
async function checkDeviceTrust(uid, req) {
    const fingerprintHash = generateDeviceFingerprint(req);
    const deviceInfo = parseDeviceInfo(req);

    const db = getSecurityDb();
    const trustedDevicesRef = db
        .collection("userSecurity")
        .doc(uid)
        .collection("trustedDevices");

    const snapshot = await trustedDevicesRef
        .where("fingerprintHash", "==", fingerprintHash)
        .where("trusted", "==", true)
        .limit(1)
        .get();

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        // Update last login timestamp
        await doc.ref.update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            ip: deviceInfo.ip,
        });

        return {
            trusted: true,
            deviceId: doc.id,
            deviceInfo,
            fingerprintHash,
        };
    }

    return {
        trusted: false,
        deviceInfo,
        fingerprintHash,
    };
}

/**
 * Create a pending device approval request.
 * @returns {{ approvalId: string, approveToken: string, denyToken: string }}
 */
async function createPendingApproval(uid, email, req) {
    const fingerprintHash = generateDeviceFingerprint(req);
    const deviceInfo = parseDeviceInfo(req);
    const db = getSecurityDb();

    // Generate cryptographically secure single-use tokens
    const approvalNonce = crypto.randomBytes(32).toString("hex");
    const denyNonce = crypto.randomBytes(32).toString("hex");

    const approveToken = jwt.sign(
        {
            uid,
            email,
            purpose: "device_approve",
            nonce: approvalNonce,
            fingerprintHash,
        },
        JWT_SECRET,
        { expiresIn: APPROVAL_TOKEN_JWT_EXPIRY }
    );

    const denyToken = jwt.sign(
        {
            uid,
            email,
            purpose: "device_deny",
            nonce: denyNonce,
            fingerprintHash,
        },
        JWT_SECRET,
        { expiresIn: APPROVAL_TOKEN_JWT_EXPIRY }
    );

    // Store in Firestore: userSecurity/{uid}/pendingApprovals/{approvalId}
    const approvalRef = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("pendingApprovals")
        .add({
            approveTokenHash: crypto.createHash("sha256").update(approvalNonce).digest("hex"),
            denyTokenHash: crypto.createHash("sha256").update(denyNonce).digest("hex"),
            email,
            deviceInfo: {
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                ip: deviceInfo.ip,
                userAgent: deviceInfo.userAgent,
            },
            fingerprintHash,
            status: "pending", // pending | approved | denied | expired
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + APPROVAL_TOKEN_EXPIRY_MS),
        });

    // Ensure parent document exists
    await db.collection("userSecurity").doc(uid).set(
        { lastUpdated: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
    );

    return {
        approvalId: approvalRef.id,
        approveToken,
        denyToken,
        deviceInfo,
    };
}

/**
 * Process a device approval (user clicked "Approve" in email).
 */
async function approveDevice(token) {
    // Verify JWT
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return { success: false, reason: "Approval link has expired." };
        }
        return { success: false, reason: "Invalid approval token." };
    }

    if (decoded.purpose !== "device_approve") {
        return { success: false, reason: "Invalid token purpose." };
    }

    // Check for replay attack
    if (consumedTokens.has(decoded.nonce)) {
        return { success: false, reason: "This approval link has already been used." };
    }

    const { uid, email, fingerprintHash, nonce } = decoded;
    const db = getSecurityDb();

    // Find the matching pending approval
    const pendingRef = db
        .collection("userSecurity")
        .doc(uid)
        .collection("pendingApprovals");

    const nonceHash = crypto.createHash("sha256").update(nonce).digest("hex");
    const snapshot = await pendingRef
        .where("approveTokenHash", "==", nonceHash)
        .where("status", "==", "pending")
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { success: false, reason: "No matching pending approval found. It may have expired or already been processed." };
    }

    const approvalDoc = snapshot.docs[0];
    const approvalData = approvalDoc.data();

    // Check expiry
    const expiresAt = approvalData.expiresAt?.toDate ? approvalData.expiresAt.toDate() : new Date(approvalData.expiresAt);
    if (new Date() > expiresAt) {
        await approvalDoc.ref.update({ status: "expired" });
        return { success: false, reason: "Approval link has expired." };
    }

    // Mark token as consumed (replay prevention)
    consumedTokens.add(nonce);

    // Mark approval as approved
    await approvalDoc.ref.update({
        status: "approved",
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Check trusted device count limit
    const trustedSnap = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("trustedDevices")
        .get();

    if (trustedSnap.size >= MAX_TRUSTED_DEVICES) {
        // Remove oldest trusted device
        const oldest = trustedSnap.docs
            .sort((a, b) => {
                const aTime = a.data().lastLogin?.toDate?.() || new Date(0);
                const bTime = b.data().lastLogin?.toDate?.() || new Date(0);
                return aTime - bTime;
            })[0];
        if (oldest) await oldest.ref.delete();
    }

    // Add device to trusted devices
    await db
        .collection("userSecurity")
        .doc(uid)
        .collection("trustedDevices")
        .add({
            trusted: true,
            browser: approvalData.deviceInfo?.browser || "Unknown",
            os: approvalData.deviceInfo?.os || "Unknown",
            ip: approvalData.deviceInfo?.ip || "unknown",
            fingerprintHash,
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            approvalMethod: "email_link",
        });

    // Log security event
    await logDeviceSecurityEvent(uid, email, "device_approved", {
        browser: approvalData.deviceInfo?.browser,
        os: approvalData.deviceInfo?.os,
        ip: approvalData.deviceInfo?.ip,
    });

    return { success: true, email };
}

/**
 * Process a device denial (user clicked "Deny" in email).
 */
async function denyDevice(token) {
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return { success: false, reason: "Denial link has expired." };
        }
        return { success: false, reason: "Invalid denial token." };
    }

    if (decoded.purpose !== "device_deny") {
        return { success: false, reason: "Invalid token purpose." };
    }

    if (consumedTokens.has(decoded.nonce)) {
        return { success: false, reason: "This link has already been used." };
    }

    const { uid, email, nonce } = decoded;
    const db = getSecurityDb();

    const nonceHash = crypto.createHash("sha256").update(nonce).digest("hex");
    const snapshot = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("pendingApprovals")
        .where("denyTokenHash", "==", nonceHash)
        .where("status", "==", "pending")
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { success: false, reason: "No matching pending request found." };
    }

    // Mark as consumed
    consumedTokens.add(nonce);

    // Update status to denied
    const doc = snapshot.docs[0];
    await doc.ref.update({
        status: "denied",
        deniedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log suspicious activity
    await logDeviceSecurityEvent(uid, email, "device_denied", {
        browser: doc.data().deviceInfo?.browser,
        os: doc.data().deviceInfo?.os,
        ip: doc.data().deviceInfo?.ip,
        severity: "warning",
    });

    return { success: true, email };
}

/**
 * Check the status of a pending device approval.
 */
async function checkApprovalStatus(uid, approvalId) {
    const db = getSecurityDb();

    const doc = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("pendingApprovals")
        .doc(approvalId)
        .get();

    if (!doc.exists) {
        return { status: "not_found" };
    }

    const data = doc.data();

    // Check expiry
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (data.status === "pending" && new Date() > expiresAt) {
        await doc.ref.update({ status: "expired" });
        return { status: "expired" };
    }

    return { status: data.status };
}

/**
 * Get all trusted devices for a user.
 */
async function getTrustedDevices(uid) {
    const db = getSecurityDb();

    const snapshot = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("trustedDevices")
        .where("trusted", "==", true)
        .orderBy("lastLogin", "desc")
        .get();

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        approvedAt: doc.data().approvedAt?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || null,
        lastLogin: doc.data().lastLogin?.toDate?.() || null,
    }));
}

/**
 * Revoke a specific trusted device.
 */
async function revokeDevice(uid, deviceId) {
    const db = getSecurityDb();

    await db
        .collection("userSecurity")
        .doc(uid)
        .collection("trustedDevices")
        .doc(deviceId)
        .update({ trusted: false, revokedAt: admin.firestore.FieldValue.serverTimestamp() });

    return { success: true };
}

/**
 * Revoke ALL trusted devices for a user (logout from all devices).
 */
async function revokeAllDevices(uid) {
    const db = getSecurityDb();

    const snapshot = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("trustedDevices")
        .where("trusted", "==", true)
        .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
            trusted: false,
            revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

    // Also revoke all active sessions
    const sessionsSnap = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("activeSessions")
        .get();

    sessionsSnap.docs.forEach((doc) => {
        batch.update(doc.ref, {
            active: false,
            revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

    await batch.commit();
    return { success: true, devicesRevoked: snapshot.size };
}

/**
 * Create an active session entry.
 */
async function createSession(uid, req) {
    const db = getSecurityDb();
    const deviceInfo = parseDeviceInfo(req);
    const fingerprintHash = generateDeviceFingerprint(req);

    // Check for duplicate sessions with same fingerprint
    const existing = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("activeSessions")
        .where("fingerprintHash", "==", fingerprintHash)
        .where("active", "==", true)
        .limit(1)
        .get();

    if (!existing.empty) {
        // Update existing session instead of creating duplicate
        await existing.docs[0].ref.update({
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            ip: deviceInfo.ip,
        });
        return { sessionId: existing.docs[0].id };
    }

    const sessionRef = await db
        .collection("userSecurity")
        .doc(uid)
        .collection("activeSessions")
        .add({
            fingerprintHash,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            ip: deviceInfo.ip,
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
        });

    return { sessionId: sessionRef.id };
}

/**
 * Log a device security event (separate from existing activityLogs).
 */
async function logDeviceSecurityEvent(uid, email, action, metadata = {}) {
    if (!admin) return;
    try {
        const db = getSecurityDb();
        await db
            .collection("userSecurity")
            .doc(uid)
            .collection("securityEvents")
            .add({
                action,
                email: email || "unknown",
                metadata,
                severity: metadata.severity || "info",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
    } catch (err) {
        console.warn("[DeviceService] Failed to log security event:", err.message);
    }
}

/**
 * Resolve a UID from an email using Firebase Admin Auth.
 */
async function getUidFromEmail(email) {
    if (!admin) return null;
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        return userRecord.uid;
    } catch (err) {
        return null;
    }
}

module.exports = {
    generateDeviceFingerprint,
    parseDeviceInfo,
    checkDeviceTrust,
    createPendingApproval,
    approveDevice,
    denyDevice,
    checkApprovalStatus,
    getTrustedDevices,
    revokeDevice,
    revokeAllDevices,
    createSession,
    logDeviceSecurityEvent,
    getUidFromEmail,
};
