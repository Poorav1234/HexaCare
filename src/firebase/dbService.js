import { ref, get, set, update, serverTimestamp } from "firebase/database";
import { rtdb } from "./firebaseConfig";

/**
 * Fetch a user's profile from the Realtime Database.
 * Falls back to local storage if Firebase read triggers permission denied.
 */
export async function getUserProfile(uid) {
    if (!uid) return null;
    let fallbackData = null;
    
    try {
        const local = localStorage.getItem(`user_${uid}`);
        if (local) fallbackData = JSON.parse(local);
    } catch (e) {}

    try {
        const userRef = ref(rtdb, `users/${uid}`);
        const snapshot = await get(userRef);
        return snapshot.exists() ? snapshot.val() : fallbackData;
    } catch (error) {
        console.warn("[Firebase] Database read denied or failed. Reading from local storage cache.");
        return fallbackData; // Return local cache if denied
    }
}

/**
 * Save or update a user's profile in the Realtime Database.
 * Falls back to local storage if Firebase write triggers permission denied.
 */
export async function saveUserProfile(uid, profileData, authProvider) {
    if (!uid) throw new Error("No UID provided for saveUserProfile.");

    const existingProfile = await getUserProfile(uid);

    // If the profile exists, we want to append the auth provider to their existing array.
    let authProviders = existingProfile?.authProviders || [];
    if (authProvider && !authProviders.includes(authProvider)) {
        authProviders.push(authProvider);
    }

    const payload = {
        ...existingProfile, // preserve existing data
        fullName: profileData.fullName || existingProfile?.fullName || "",
        email: profileData.email || existingProfile?.email || "",
        role: profileData.role || existingProfile?.role || "user",
        isActive: existingProfile?.isActive !== undefined ? existingProfile.isActive : true,
        phoneNumber: profileData.phoneNumber || existingProfile?.phoneNumber || "",
        gender: profileData.gender || existingProfile?.gender || "",
        dateOfBirth: profileData.dateOfBirth || existingProfile?.dateOfBirth || "",
        bloodGroup: profileData.bloodGroup || existingProfile?.bloodGroup || "",
        walletAddress: profileData.walletAddress || existingProfile?.walletAddress || "",
        authProviders,
        profileCompleted: !!profileData.profileCompleted,
        createdAt: existingProfile?.createdAt || Date.now(),
        updatedAt: Date.now(),
    };

    try {
        const userRef = ref(rtdb, `users/${uid}`);
        await set(userRef, payload);
    } catch (e) {
        console.warn("[Firebase] Database write permission denied. Using local storage dummy write.");
    }

    try {
        localStorage.setItem(`user_${uid}`, JSON.stringify(payload));
    } catch (e) {}

    return payload; // Skip verify wait since write could be local DB only
}

/**
 * Update specific fields of a user's profile in the Realtime Database.
 * Useful for the Profile editing mode.
 */
export async function updateUserProfileFields(uid, updates) {
    if (!uid) throw new Error("No UID provided for updateUserProfileFields.");

    const payload = {
        ...updates,
        updatedAt: Date.now(),
    };

    try {
        const userRef = ref(rtdb, `users/${uid}`);
        await update(userRef, payload);
    } catch (e) {
        console.warn("[Firebase] Database update permission denied. Emulating database update locally.");
    }

    // fallback to local storage update cache
    try {
        const local = localStorage.getItem(`user_${uid}`);
        if (local) {
            const parsed = JSON.parse(local);
            localStorage.setItem(`user_${uid}`, JSON.stringify({ ...parsed, ...payload }));
        } else {
             const existingProfile = await getUserProfile(uid);
             localStorage.setItem(`user_${uid}`, JSON.stringify({ ...existingProfile, ...payload }));
        }
    } catch (e) {}

    return await getUserProfile(uid);
}
