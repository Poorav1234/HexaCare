// src/firebase/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  signOut,
} from "firebase/auth";
import { auth, googleProvider, IS_DEV } from "./firebaseConfig";
import { getUserProfile, saveUserProfile } from "./dbService";
import { logActivity, LOG_ACTIONS } from "./logService";

// Removed getDevEmail alias logic to ensure consistency with backend validation.

// ---------------------------------------------------------------------------
// Utility: timeout wrapper to prevent infinite loading if Firebase hangs
// Included: 1 retry max as requested.
// ---------------------------------------------------------------------------
const withTimeout = async (
  promiseFn,
  ms = 10000,
  errorMessage = "Request timed out. Please check your network connection or try again later.",
  retries = 1
) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("TIMEOUT_ERROR")), ms);
      });

      const result = await Promise.race([promiseFn(), timeoutPromise]).finally(() =>
        clearTimeout(timeoutId)
      );

      return result;
    } catch (error) {
      if (error.message === "TIMEOUT_ERROR") {
        if (IS_DEV) console.error(`[Network] Timeout on attempt ${attempt + 1}/${retries + 1}`);
        if (attempt === retries) {
          throw new Error(errorMessage);
        }
        // Wait a bit before retrying
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }
      throw error; // Not a timeout error, throw immediately
    }
  }
};

/**
 * Register user with email/password and full profile in one go.
 */
export async function registerWithEmailAndProfile(formData) {
  const {
    fullName,
    email,
    password,
    phoneNumber,
    gender,
    dateOfBirth,
    bloodGroup,
    walletAddress,
  } = formData;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    if (IS_DEV) console.log("[Auth] User created with email/password. UID:", user.uid);

    const profile = await saveUserProfile(
      user.uid,
      {
        fullName,
        email,
        phoneNumber,
        gender,
        dateOfBirth,
        bloodGroup,
        walletAddress,
        profileCompleted: true,
      },
      "password"
    );

    // Sign out to prevent auto-login
    await signOut(auth);

    // Log registration event
    logActivity({ userId: user.uid, email, action: LOG_ACTIONS.USER_REGISTER });

    return { user, profile };
  } catch (error) {
    if (IS_DEV) console.error("[Auth] registerWithEmailAndProfile error:", error);

    // Check if email already exists
    if (error.code === "auth/email-already-in-use") {
      throw new Error("This email is already in use. Try logging in, or use another email.");
    }

    throw new Error(error.message || "Registration failed");
  }
}

/**
 * Login with email/password.
 * Returns { user, profile, needsProfileCompletion }
 */
export async function loginWithEmail(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    if (IS_DEV) console.log("[Auth] User logged in with email/password. UID:", user.uid);

    let profile = await getUserProfile(user.uid);

    // If profile exists, quickly update timestamp
    if (profile) {
      profile = await saveUserProfile(user.uid, { ...profile }, "password");
    } else {
      // Create minimal profile if absolutely missing
      profile = await saveUserProfile(user.uid, { email: user.email, profileCompleted: false }, "password");
    }

    const needsProfileCompletion = !profile.profileCompleted;

    if (IS_DEV) console.log("[RTDB] User profile on login:", user.uid, profile);

    // Log the login event for admin activity tracking
    logActivity({ userId: user.uid, email: user.email, action: LOG_ACTIONS.USER_LOGIN });

    return { user, profile, needsProfileCompletion };
  } catch (error) {
    if (IS_DEV) console.error("[Auth] loginWithEmail error:", error);

    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      throw new Error("Invalid password or email.");
    }

    throw new Error(error.message || "Login failed");
  }
}

/**
 * Google Sign-In flow with credential linking logic.
 * Returns { user, profile, isNewOrIncomplete }
 */
export async function loginWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;

    if (IS_DEV) console.log("[Auth] Google sign-in success. UID:", user.uid);

    let profile = await getUserProfile(user.uid);
    let isNewOrIncomplete = false;

    if (!profile || !profile.profileCompleted) {
      // First time or incomplete profile
      if (!profile) {
        // Create a minimal stub
        profile = await saveUserProfile(user.uid, { email: user.email || "", fullName: user.displayName || "", profileCompleted: false }, "google");
      }
      isNewOrIncomplete = true;

      return {
        user,
        profile,
        isNewOrIncomplete,
      };
    }

    // Existing and completed: update timestamp
    profile = await saveUserProfile(user.uid, { ...profile }, "google");

    if (IS_DEV) console.log("[RTDB] Existing Google user profile:", user.uid, profile);

    return {
      user,
      profile,
      isNewOrIncomplete: false,
    };
  } catch (error) {
    if (IS_DEV) console.error("[Auth] loginWithGoogle error object:", error);

    // Advanced Linking Logic
    if (error.code === 'auth/account-exists-with-different-credential') {
      if (IS_DEV) console.log("[Auth] 'Account exists' caught. Attempting fetchSignInMethodsForEmail for", error.customData.email);

      try {
        const email = error.customData.email;
        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.includes("password")) {
          throw new Error(`An account already exists with ${email}. Please log in using your Password first, then link Google from your profile.`);
        }
        throw new Error(`Account exists with different credentials: ${methods.join(", ")}`);
      } catch (fetchErr) {
        throw new Error(error.message || fetchErr.message || "Account exists with different credential, linking unavailable.");
      }
    }

    throw new Error(error.message || "Google sign-in failed");
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers used by the existing UI components
// These map the more explicit service functions to simpler names.
// ---------------------------------------------------------------------------

/**
 * Wrapper used by the Register page:
 * registerUser(email, password, userData)
 */
export async function registerUser(email, password, userData) {
  const { user } = await withTimeout(() => registerWithEmailAndProfile({
    ...userData,
    email,
    password,
  }));
  return user;
}

/**
 * Wrapper used by the Login page:
 * loginUser(email, password)
 */
export async function loginUser(email, password) {
  const { user, needsProfileCompletion } = await withTimeout(() => loginWithEmail(email, password));
  if (needsProfileCompletion) {
    throw new Error("PROFILE_INCOMPLETE"); // Handled manually by our UI if needed
  }
  return user;
}

/**
 * Wrapper used by Login/Register:
 * signInWithGoogle()
 */
export async function signInWithGoogle() {
  // Bypassing withTimeout for Google Sign-In because the user might take
  // much longer than 10 seconds to interact with the popup window (2FA, etc).
  return loginWithGoogle();
}

/**
 * Wrapper used by Login for password reset:
 * resetPassword(email)
 */
export async function resetPassword(email) {
  return withTimeout(() => sendPasswordResetEmail(auth, email));
}

/**
 * Logout (used by Dashboard).
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Complete profile (used for Google and incomplete manual users).
 * Optionally link email/password credentials for Google accounts.
 */
export async function completeGoogleProfile(email, password, userData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user.");
  }
  const { profile } = await withTimeout(() => completeUserProfile({
    user,
    profileData: userData,
    passwordForLinking: password,
  }));
  return { user, profile };
}

export async function completeUserProfile({
  user,
  profileData,
  passwordForLinking,
}) {
  if (!user) {
    throw new Error("No authenticated user.");
  }

  try {
    const finalProfile = await saveUserProfile(
      user.uid,
      {
        ...profileData,
        profileCompleted: true,
      },
      profileData.authProvider || "google"
    );

    // Link email/password if requested (for Google users)
    if (passwordForLinking && user.email) {
      if (IS_DEV) console.log("[Auth] Attempting to link Password credential for:", user.email);
      // First ensure they don't already have password method mapped to prevent duplicates
      const methods = await fetchSignInMethodsForEmail(auth, user.email);
      if (!methods.includes('password')) {
        const cred = EmailAuthProvider.credential(user.email, passwordForLinking);
        await linkWithCredential(user, cred);
        if (IS_DEV) console.log("[Auth] Email/password successfully linked to Google account:", user.uid);
      } else {
        if (IS_DEV) console.log("[Auth] Password already linked, skipping linkWithCredential.");
      }
    }

    // Sign out to prevent auto-login as per requirements
    await signOut(auth);

    return { user, profile: finalProfile };
  } catch (error) {
    if (IS_DEV) console.error("[Auth] completeUserProfile error:", error);

    // Explicit Credential link error handling
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error("This password credential is already linked to another account.");
    }

    throw new Error(error.message || "Failed to complete profile");
  }
}

/**
 * Subscribe to auth state changes.
 * Wrapper around onAuthStateChanged for React usage.
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}