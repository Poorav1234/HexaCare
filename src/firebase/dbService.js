import { ref, get, set, update, serverTimestamp } from "firebase/database";
import { rtdb } from "./firebaseConfig";

/**
 * Fetch a user's profile from the Realtime Database.
 */
export async function getUserProfile(uid) {
    if (!uid) return null;
    const userRef = ref(rtdb, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Save or update a user's profile in the Realtime Database.
 * This is used during registration or complete profile flows.
 */
export async function saveUserProfile(uid, profileData, authProvider) {
    if (!uid) throw new Error("No UID provided for saveUserProfile.");

    const userRef = ref(rtdb, `users/${uid}`);
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
        phoneNumber: profileData.phoneNumber || existingProfile?.phoneNumber || "",
        gender: profileData.gender || existingProfile?.gender || "",
        dateOfBirth: profileData.dateOfBirth || existingProfile?.dateOfBirth || "",
        bloodGroup: profileData.bloodGroup || existingProfile?.bloodGroup || "",
        walletAddress: profileData.walletAddress || existingProfile?.walletAddress || "",
        authProviders,
        profileCompleted: !!profileData.profileCompleted,
        createdAt: existingProfile?.createdAt || Date.now(), // Fallback Date.now() if serverTimestamp fails
        updatedAt: Date.now(), // Fallback Date.now() if serverTimestamp fails
    };

    await set(userRef, payload);

    // Re-verify the write 
    const newProfile = await getUserProfile(uid);
    if (!newProfile) {
        throw new Error("Failed to write to Realtime Database: verify write failed.");
    }
    return newProfile;
}

/**
 * Update specific fields of a user's profile in the Realtime Database.
 * Useful for the Profile editing mode.
 */
export async function updateUserProfileFields(uid, updates) {
    if (!uid) throw new Error("No UID provided for updateUserProfileFields.");

    const userRef = ref(rtdb, `users/${uid}`);
    const payload = {
        ...updates,
        updatedAt: Date.now(),
    };

    await update(userRef, payload);
    return await getUserProfile(uid);
}
