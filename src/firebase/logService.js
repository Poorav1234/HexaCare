// src/firebase/logService.js
// Activity logging service for the Admin Dashboard.
// Writes to Firestore "activityLogs" collection.
// Designed to be non-blocking — logging failures never break the main flow.

import { db } from "./firebaseConfig";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
} from "firebase/firestore";

// ─── Action Constants ────────────────────────────────────────────────────────
export const LOG_ACTIONS = {
    USER_LOGIN: "user_login",
    USER_REGISTER: "user_register",
    REPORT_SUBMITTED: "report_submitted",
    BLOCKCHAIN_STORED: "blockchain_stored",
    PREDICTION_RUN: "prediction_run",
    ADMIN_CREATED: "admin_created",
    ADMIN_ACTIVATED: "admin_activated",
    ADMIN_DEACTIVATED: "admin_deactivated",
    ROLE_CHANGED: "role_changed",
    PROFILE_UPDATED: "profile_updated",
    // ── Security Events (SOC Dashboard) ─────────────────────────────────────
    LOGIN_FAILED: "login_failed",
    ACCOUNT_LOCKED: "account_locked",
    OTP_REQUESTED: "otp_requested",
    PASSWORD_RESET: "password_reset",
    ADMIN_LOGIN: "admin_login",
    ADMIN_ACTION: "admin_action",
};

// ─── Severity Levels ─────────────────────────────────────────────────────────
export const LOG_SEVERITY = {
    INFO: "info",
    WARNING: "warning",
    CRITICAL: "critical",
};

/**
 * Log an activity event to Firestore.
 * This function is intentionally fire-and-forget — it will never throw.
 *
 * @param {object}  params
 * @param {string}  params.userId   - UID of the acting user
 * @param {string}  params.email    - Email of the acting user
 * @param {string}  params.action   - One of LOG_ACTIONS
 * @param {object}  [params.metadata] - Additional context (e.g. target UID)
 * @param {string}  [params.severity] - One of LOG_SEVERITY (default: info)
 */
export async function logActivity({ userId, email, action, metadata = {}, severity = LOG_SEVERITY.INFO }) {
    try {
        await Promise.race([
            addDoc(collection(db, "activityLogs"), {
                userId: userId || "",
                email: email || "",
                action,
                metadata,
                severity,
                timestamp: serverTimestamp(),
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Log timeout")), 5000)
            ),
        ]);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[LogService] Failed to log activity:", error.message);
    }
}

/**
 * Log a security event (convenience wrapper with severity).
 */
export async function logSecurityEvent({ userId, email, action, metadata = {} }) {
    const severity =
        action === LOG_ACTIONS.ACCOUNT_LOCKED ? LOG_SEVERITY.CRITICAL :
        action === LOG_ACTIONS.LOGIN_FAILED ? LOG_SEVERITY.WARNING :
        LOG_SEVERITY.INFO;

    return logActivity({ userId, email, action, metadata, severity });
}

/**
 * Fetch activity logs with optional filtering.
 *
 * @param {object}  [filters]
 * @param {string}  [filters.action]      - Filter by action type
 * @param {string}  [filters.userId]      - Filter by user ID
 * @param {number}  [filters.limitCount]  - Max results (default 200)
 * @returns {Promise<Array>}
 */
export async function getActivityLogs(filters = {}) {
    try {
        const constraints = [];

        if (filters.action) {
            constraints.push(where("action", "==", filters.action));
        }
        if (filters.userId) {
            constraints.push(where("userId", "==", filters.userId));
        }

        constraints.push(orderBy("timestamp", "desc"));
        constraints.push(limit(filters.limitCount || 200));

        const q = query(collection(db, "activityLogs"), ...constraints);
        const snapshot = await Promise.race([
            getDocs(q),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 8000)
            ),
        ]);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[LogService] Failed to fetch logs:", error);
        return [];
    }
}

/**
 * Fetch security-specific logs for the SOC dashboard.
 * Returns only security-related events.
 */
export async function getSecurityLogs(limitCount = 300) {
    try {
        const q = query(
            collection(db, "activityLogs"),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );
        const snapshot = await Promise.race([
            getDocs(q),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 8000)
            ),
        ]);

        const securityActions = new Set([
            LOG_ACTIONS.USER_LOGIN,
            LOG_ACTIONS.LOGIN_FAILED,
            LOG_ACTIONS.ACCOUNT_LOCKED,
            LOG_ACTIONS.OTP_REQUESTED,
            LOG_ACTIONS.PASSWORD_RESET,
            LOG_ACTIONS.ADMIN_LOGIN,
            LOG_ACTIONS.ADMIN_CREATED,
            LOG_ACTIONS.ADMIN_ACTIVATED,
            LOG_ACTIONS.ADMIN_DEACTIVATED,
            LOG_ACTIONS.ADMIN_ACTION,
        ]);

        return snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((log) => securityActions.has(log.action));
    } catch (error) {
        console.error("[LogService] Failed to fetch security logs:", error);
        return [];
    }
}
