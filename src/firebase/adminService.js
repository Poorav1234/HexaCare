// src/firebase/adminService.js
// Admin module service — handles RBAC, admin CRUD, and system statistics.
// Uses a secondary Firebase app instance for creating admin users without
// affecting the current (super admin) session.

import { initializeApp, deleteApp } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut as fbSignOut,
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import {
    collection,
    getDocs,
    getCountFromServer,
    doc,
    setDoc,
} from "firebase/firestore";
import { rtdb, db } from "./firebaseConfig";
import { logActivity, LOG_ACTIONS } from "./logService";

// ─── Firebase Config (needed for secondary app) ─────────────────────────────
const firebaseConfig = {
    apiKey:
        import.meta.env.VITE_FIREBASE_API_KEY ||
        "AIzaSyAnAeDSwJ0G-dQmxnRs7oS3V8b0BIp2R08",
    authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
        "hexacare-mbs.firebaseapp.com",
    projectId:
        import.meta.env.VITE_FIREBASE_PROJECT_ID || "hexacare-mbs",
    storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
        "hexacare-mbs.firebasestorage.app",
    messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "875066023824",
    appId:
        import.meta.env.VITE_FIREBASE_APP_ID ||
        "1:875066023824:web:4161a7bd56630398b6dd15",
    databaseURL: "https://hexacare-mbs-default-rtdb.firebaseio.com",
};

// ─── Super Admin Designation ─────────────────────────────────────────────────
// Set VITE_SUPER_ADMIN_EMAIL in your .env to designate the super admin.
// Example: VITE_SUPER_ADMIN_EMAIL=admin@hexacare.com
const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "";

export function isDesignatedSuperAdmin(email) {
    return (
        !!SUPER_ADMIN_EMAIL &&
        email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
}

// ─── Role Helpers ────────────────────────────────────────────────────────────

/**
 * Read a user's role from RTDB. Returns "user" if not set.
 */
export async function getUserRole(uid) {
    try {
        const snapshot = await get(ref(rtdb, `users/${uid}/role`));
        return snapshot.exists() ? snapshot.val() : "user";
    } catch {
        return "user";
    }
}

/**
 * Read a user's isActive flag from RTDB. Returns true if not set.
 */
export async function getUserActiveStatus(uid) {
    try {
        const snapshot = await get(ref(rtdb, `users/${uid}/isActive`));
        return snapshot.exists() ? snapshot.val() : true;
    } catch {
        return true;
    }
}

/**
 * Persist a role to both RTDB and the Firestore `admins` collection
 * (the latter is used by Firestore security rules).
 */
export async function setUserRole(uid, role, performedByUid = null) {
    try {
        await update(ref(rtdb, `users/${uid}`), {
            role,
            updatedAt: Date.now(),
        });

        if (role === "admin" || role === "super_admin") {
            const userSnap = await get(ref(rtdb, `users/${uid}`));
            const userData = userSnap.exists() ? userSnap.val() : {};

            await setDoc(
                doc(db, "admins", uid),
                {
                    role,
                    isActive: userData.isActive !== false,
                    email: userData.email || "",
                    fullName: userData.fullName || "",
                    updatedAt: Date.now(),
                },
                { merge: true }
            );
        }

        if (performedByUid) {
            await logActivity({
                userId: performedByUid,
                email: "",
                action: LOG_ACTIONS.ROLE_CHANGED,
                metadata: { targetUid: uid, newRole: role },
            });
        }
    } catch (error) {
        console.error("[Admin] Failed to set user role:", error);
        throw error;
    }
}

/**
 * Called once per login from App.jsx for the designated super admin email.
 * If the user's role isn't already super_admin, it sets it.
 */
export async function initializeSuperAdmin(uid, email) {
    if (!isDesignatedSuperAdmin(email)) return false;

    const currentRole = await getUserRole(uid);
    if (currentRole === "super_admin") return true;

    await setUserRole(uid, "super_admin");
    // eslint-disable-next-line no-console
    console.log("[Admin] Super admin role initialized for:", email);
    return true;
}

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new admin user via a secondary Firebase App instance.
 * This prevents the currently logged-in super admin from being signed out.
 *
 * @param {object}  data
 * @param {string}  data.name
 * @param {string}  data.email
 * @param {string}  data.password
 * @param {string}  data.createdByUid    — UID of the super admin
 * @param {string}  data.createdByEmail  — Email of the super admin
 * @returns {Promise<{uid: string, email: string, name: string}>}
 */
export async function createAdminUser({
    name,
    email,
    password,
    createdByUid,
    createdByEmail,
}) {
    let secondaryApp;

    try {
        secondaryApp = initializeApp(
            firebaseConfig,
            `AdminCreator_${Date.now()}`
        );
        const secondaryAuth = getAuth(secondaryApp);

        const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            email,
            password
        );
        const newUid = cred.user.uid;

        // Write full profile to RTDB
        await set(ref(rtdb, `users/${newUid}`), {
            fullName: name,
            email,
            role: "admin",
            isActive: true,
            profileCompleted: true,
            phoneNumber: "",
            gender: "",
            dateOfBirth: "",
            bloodGroup: "",
            walletAddress: "",
            authProviders: ["password"],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: createdByUid,
        });

        // Mirror into Firestore admins collection
        await setDoc(doc(db, "admins", newUid), {
            role: "admin",
            isActive: true,
            email,
            fullName: name,
            createdAt: Date.now(),
            createdBy: createdByUid,
        });

        await fbSignOut(secondaryAuth);
        await deleteApp(secondaryApp);
        secondaryApp = null;

        // Log the creation
        await logActivity({
            userId: createdByUid,
            email: createdByEmail,
            action: LOG_ACTIONS.ADMIN_CREATED,
            metadata: {
                newAdminUid: newUid,
                newAdminEmail: email,
                newAdminName: name,
            },
        });

        // Attempt to send credentials via the backend email service
        try {
            await sendAdminCredentials({ name, email, password });
        } catch {
            // Non-fatal — credentials will be displayed in UI instead
            console.warn("[Admin] Email service unavailable — credentials not sent.");
        }

        return { uid: newUid, email, name };
    } catch (error) {
        if (secondaryApp) {
            try {
                // If the user was created in Auth but a later step failed,
                // delete the orphaned Auth user so re-creation is possible.
                const secondaryAuth = getAuth(secondaryApp);
                if (secondaryAuth.currentUser) {
                    await secondaryAuth.currentUser.delete();
                }
            } catch {
                /* best-effort cleanup */
            }
            try {
                await deleteApp(secondaryApp);
            } catch {
                /* noop */
            }
        }

        console.error("[Admin] CREATE FAILED — code:", error.code, "| message:", error.message);

        if (error.code === "auth/email-already-in-use") {
            throw new Error("An account with this email already exists.");
        }
        throw new Error(error.message || "Failed to create admin user.");
    }
}

/**
 * Send admin credentials via the backend email service.
 */
async function sendAdminCredentials({ name, email, password }) {
    const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

    const res = await fetch(`${backendUrl}/admin/send-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send email");
    }
}

/**
 * Fetch every user whose RTDB role is admin or super_admin.
 */
export async function getAllAdmins() {
    try {
        const usersSnapshot = await get(ref(rtdb, "users"));
        if (!usersSnapshot.exists()) return [];

        const users = usersSnapshot.val();
        const admins = [];

        for (const [uid, userData] of Object.entries(users)) {
            if (
                userData.role === "admin" ||
                userData.role === "super_admin"
            ) {
                admins.push({ uid, ...userData });
            }
        }

        return admins.sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );
    } catch (error) {
        console.error("[Admin] Failed to fetch admins:", error);
        return [];
    }
}

/**
 * Toggle an admin's isActive flag in both RTDB and Firestore.
 */
export async function toggleAdminStatus(
    uid,
    isActive,
    performedByUid,
    performedByEmail
) {
    try {
        await update(ref(rtdb, `users/${uid}`), {
            isActive,
            updatedAt: Date.now(),
        });

        await setDoc(
            doc(db, "admins", uid),
            { isActive, updatedAt: Date.now() },
            { merge: true }
        );

        await logActivity({
            userId: performedByUid,
            email: performedByEmail,
            action: isActive
                ? LOG_ACTIONS.ADMIN_ACTIVATED
                : LOG_ACTIONS.ADMIN_DEACTIVATED,
            metadata: { targetUid: uid },
        });
    } catch (error) {
        console.error("[Admin] Failed to toggle admin status:", error);
        throw new Error("Failed to update admin status.");
    }
}

// ─── All Users (Admin View) ──────────────────────────────────────────────────

/**
 * Fetch every user from RTDB with full profile data (for admin user list).
 */
export async function getAllUsers() {
    try {
        const usersSnapshot = await get(ref(rtdb, "users"));
        if (!usersSnapshot.exists()) return [];

        const users = Object.entries(usersSnapshot.val()).map(([uid, data]) => ({
            uid,
            ...data,
        }));

        return users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error("[Admin] Failed to fetch all users:", error);
        return [];
    }
}

// ─── All Reports (Admin View) ────────────────────────────────────────────────

/**
 * Fetch all reports from Firestore for the admin reports list.
 */
export async function getAllReportsAdmin() {
    try {
        const snapshot = await getDocs(collection(db, "reports"));
        return snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
    } catch (error) {
        console.error("[Admin] Failed to fetch reports:", error);
        return [];
    }
}

// ─── System Statistics ───────────────────────────────────────────────────────

/**
 * Gather system-wide statistics for the admin dashboard.
 * Returns only metadata (counts) — no sensitive data is exposed.
 */
export async function getSystemStats() {
    const stats = {
        totalUsers: 0,
        activeUsers: 0,
        recentlyActive: 0,
        adminCount: 0,
        reportsCount: 0,
        predictionsCount: 0,
        logsCount: 0,
    };

    try {
        // ── Users from RTDB ──────────────────────────────────────────────
        const usersSnap = await get(ref(rtdb, "users"));
        if (usersSnap.exists()) {
            const users = Object.entries(usersSnap.val());
            stats.totalUsers = users.length;
            stats.activeUsers = users.filter(
                ([, u]) => u.isActive !== false
            ).length;
            stats.adminCount = users.filter(
                ([, u]) =>
                    u.role === "admin" || u.role === "super_admin"
            ).length;

            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            stats.recentlyActive = users.filter(
                ([, u]) => (u.updatedAt || u.createdAt || 0) > sevenDaysAgo
            ).length;
        }

        // ── Firestore Counts ─────────────────────────────────────────────
        stats.reportsCount = await safeCount("reports");
        stats.predictionsCount = await safeCount("predictions");
        stats.logsCount = await safeCount("activityLogs");
    } catch (error) {
        console.error("[Admin] Failed to get system stats:", error);
    }

    return stats;
}

// ─── Analytics Aggregation (Admin Charts) ────────────────────────────────

/**
 * Get aggregated model/prediction type usage distribution.
 * Returns only type counts — no user-specific data.
 */
export async function getModelUsageAnalytics() {
    try {
        const snapshot = await getDocs(collection(db, "predictions"));
        const typeCounts = {};
        snapshot.docs.forEach((d) => {
            const type = d.data().type || "Unknown";
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const entries = Object.entries(typeCounts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);

        const mostUsed = entries.length > 0 ? entries[0] : null;
        const leastUsed = entries.length > 0 ? entries[entries.length - 1] : null;

        return { distribution: entries, mostUsed, leastUsed, total: snapshot.size };
    } catch (error) {
        console.error("[Admin] Failed to get model usage:", error);
        return { distribution: [], mostUsed: null, leastUsed: null, total: 0 };
    }
}

/**
 * Get system activity over time (last N days).
 * Aggregates daily counts of logins, report submissions, and predictions.
 * Returns only counts per day — no user identifiers.
 */
export async function getActivityTimeline(days = 30) {
    try {
        const logsSnapshot = await getDocs(collection(db, "activityLogs"));
        const now = Date.now();
        const cutoff = now - days * 24 * 60 * 60 * 1000;

        const timeline = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            timeline.push({
                date: d.toISOString().slice(0, 10),
                dateLabel: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                logins: 0,
                reports: 0,
                predictions: 0,
                failures: 0,
            });
        }

        const dateMap = {};
        timeline.forEach((t, i) => (dateMap[t.date] = i));

        logsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const ts = data.timestamp?.toDate
                ? data.timestamp.toDate().getTime()
                : data.timestamp?.seconds
                ? data.timestamp.seconds * 1000
                : 0;

            if (ts < cutoff) return;

            const dateStr = new Date(ts).toISOString().slice(0, 10);
            const idx = dateMap[dateStr];
            if (idx === undefined) return;

            switch (data.action) {
                case "user_login":
                case "admin_login":
                    timeline[idx].logins++;
                    break;
                case "report_submitted":
                    timeline[idx].reports++;
                    break;
                case "prediction_run":
                    timeline[idx].predictions++;
                    break;
                case "login_failed":
                    timeline[idx].failures++;
                    break;
            }
        });

        return timeline;
    } catch (error) {
        console.error("[Admin] Failed to get activity timeline:", error);
        return [];
    }
}

/**
 * Get anonymized user statistics for the admin users page.
 * Returns only aggregated data — no personal information.
 */
export async function getAnonymizedUserStats() {
    try {
        const usersSnap = await get(ref(rtdb, "users"));
        if (!usersSnap.exists()) {
            return {
                total: 0, active: 0, inactive: 0, admins: 0,
                regularUsers: 0, recentRegistrations: 0,
                registrationsByMonth: [], roleDistribution: [],
            };
        }

        const users = Object.entries(usersSnap.val());
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        const active = users.filter(([, u]) => u.isActive !== false).length;
        const inactive = users.length - active;
        const admins = users.filter(([, u]) => u.role === "admin" || u.role === "super_admin").length;
        const regularUsers = users.length - admins;
        const recentRegistrations = users.filter(([, u]) => (u.createdAt || 0) > thirtyDaysAgo).length;

        const registrationsByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
            const count = users.filter(([, u]) => {
                const ct = u.createdAt || 0;
                return ct >= monthStart && ct <= monthEnd;
            }).length;
            registrationsByMonth.push({
                label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
                value: count,
            });
        }

        return {
            total: users.length, active, inactive, admins, regularUsers,
            recentRegistrations, registrationsByMonth,
            roleDistribution: [
                { label: "Users", value: regularUsers },
                { label: "Admins", value: admins },
            ],
        };
    } catch (error) {
        console.error("[Admin] Failed to get anonymized user stats:", error);
        return {
            total: 0, active: 0, inactive: 0, admins: 0,
            regularUsers: 0, recentRegistrations: 0,
            registrationsByMonth: [], roleDistribution: [],
        };
    }
}

/**
 * Get report metadata only — no content or user linkage.
 * Returns report ID, timestamp, type/status only.
 */
export async function getReportMetadataOnly() {
    try {
        const snapshot = await getDocs(collection(db, "reports"));
        return snapshot.docs
            .map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    reportType: data.reportType || "General",
                    txHash: data.txHash || null,
                    hasIPFS: !!data.fileUrl,
                    createdAt: data.createdAt,
                    status: data.txHash ? "On-Chain" : "Pending",
                };
            })
            .sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
    } catch (error) {
        console.error("[Admin] Failed to fetch report metadata:", error);
        return [];
    }
}

/**
 * Safely count documents in a Firestore collection.
 * Falls back to getDocs().size if getCountFromServer is unavailable.
 */
async function safeCount(collectionName) {
    try {
        const snap = await getCountFromServer(
            collection(db, collectionName)
        );
        return snap.data().count;
    } catch {
        try {
            const snap = await getDocs(collection(db, collectionName));
            return snap.size;
        } catch {
            return 0;
        }
    }
}

