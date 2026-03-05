// src/firebase/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider, IS_DEV } from "./firebaseConfig";

/**
 * Helper: create or update the user profile document in Firestore.
 */
async function createOrUpdateUserProfile(user, profileData, authProvider) {
  const uid = user.uid;
  const userRef = doc(db, "users", uid);

  const now = serverTimestamp();

  const payload = {
    fullName: profileData.fullName,
    email: profileData.email,
    phoneNumber: profileData.phoneNumber,
    gender: profileData.gender,
    dateOfBirth: profileData.dateOfBirth,
    bloodGroup: profileData.bloodGroup || "",
    walletAddress: profileData.walletAddress,
    authProvider,
    profileCompleted:
      typeof profileData.profileCompleted === "boolean"
        ? profileData.profileCompleted
        : false,
    createdAt: profileData.createdAt || now,
    updatedAt: now,
    lastLoginAt: profileData.lastLoginAt || now,
  };

  await setDoc(userRef, payload, { merge: true });

  // Verification step
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error(
      "User profile verification failed: document does not exist after write."
    );
  }

  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.log("[Firestore] User profile written:", uid, snap.data());
  }

  return snap.data();
}

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

    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.log("[Auth] User created with email/password. UID:", user.uid);
    }

    // Set displayName for convenience
    await updateProfile(user, { displayName: fullName });

    const profile = await createOrUpdateUserProfile(
      user,
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

    return { user, profile };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Auth] registerWithEmailAndProfile error:", error);
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

    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.log("[Auth] User logged in with email/password. UID:", user.uid);
    }

    const userRef = doc(db, "users", user.uid);

    // Update lastLoginAt
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(async (err) => {
      // If doc doesn't exist, create a minimal one
      if (IS_DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          "[Firestore] updateDoc failed, attempting to create minimal profile:",
          err
        );
      }
      await setDoc(
        userRef,
        {
          email: user.email || email,
          fullName: user.displayName || "",
          authProvider: "password",
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    const snap = await getDoc(userRef);
    const data = snap.data() || {};
    const needsProfileCompletion = !data.profileCompleted;

    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.log("[Firestore] User profile on login:", user.uid, data);
    }

    return { user, profile: data, needsProfileCompletion };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Auth] loginWithEmail error:", error);
    throw new Error(error.message || "Login failed");
  }
}

/**
 * Google Sign-In flow.
 * Returns { user, profile, isNewOrIncomplete }
 */
export async function loginWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;

    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.log("[Auth] Google sign-in success. UID:", user.uid);
    }

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    const exists = snap.exists();
    const data = exists ? snap.data() : null;

    if (!exists || !data.profileCompleted) {
      // First time or incomplete profile
      if (!exists) {
        // Create a minimal stub so rules allow later updates
        await setDoc(
          userRef,
          {
            email: user.email || "",
            fullName: user.displayName || "",
            authProvider: "google",
            profileCompleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        user,
        profile: data || null,
        isNewOrIncomplete: true,
      };
    }

    // Existing and completed: update lastLoginAt
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.log("[Firestore] Existing Google user profile:", user.uid, data);
    }

    return {
      user,
      profile: data,
      isNewOrIncomplete: false,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Auth] loginWithGoogle error:", error);
    throw new Error(error.message || "Google sign-in failed");
  }
}

// ---------------------------------------------------------------------------
// Utility: timeout wrapper to prevent infinite loading if Firebase hangs
// ---------------------------------------------------------------------------
const withTimeout = (promise, ms = 10000, errorMessage = "Request timed out. Please check your network connection or try again later.") => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

// ---------------------------------------------------------------------------
// Convenience wrappers used by the existing UI components
// These map the more explicit service functions to simpler names.
// ---------------------------------------------------------------------------

/**
 * Wrapper used by the Register page:
 * registerUser(email, password, userData)
 */
export async function registerUser(email, password, userData) {
  const { user } = await withTimeout(registerWithEmailAndProfile({
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
  const { user } = await withTimeout(loginWithEmail(email, password));
  return user;
}

/**
 * Wrapper used by Login/Register:
 * signInWithGoogle()
 */
export async function signInWithGoogle() {
  return withTimeout(loginWithGoogle());
}

/**
 * Wrapper used by Login for password reset:
 * resetPassword(email)
 */
export async function resetPassword(email) {
  return withTimeout(sendPasswordReset(email));
}

/**
 * Wrapper used by CompleteProfile:
 * completeGoogleProfile(email, password, userData)
 */
export async function completeGoogleProfile(email, password, userData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user.");
  }
  const { profile } = await withTimeout(completeUserProfile({
    user,
    profileData: userData,
    passwordForLinking: password,
  }));
  return { user, profile };
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
export async function completeUserProfile({
  user,
  profileData,
  passwordForLinking,
}) {
  if (!user) {
    throw new Error("No authenticated user.");
  }

  try {
    const finalProfile = await createOrUpdateUserProfile(
      user,
      {
        ...profileData,
        profileCompleted: true,
      },
      profileData.authProvider || "google"
    );

    // Link email/password if requested (for Google users)
    if (passwordForLinking && user.email) {
      const cred = EmailAuthProvider.credential(user.email, passwordForLinking);
      await linkWithCredential(user, cred);
      if (IS_DEV) {
        // eslint-disable-next-line no-console
        console.log("[Auth] Email/password linked to Google account:", user.uid);
      }
    }

    return { user, profile: finalProfile };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Auth] completeUserProfile error:", error);
    throw new Error(error.message || "Failed to complete profile");
  }
}

/**
 * Password reset.
 */
export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Auth] sendPasswordReset error:", error);
    throw new Error(error.message || "Failed to send password reset email");
  }
}

/**
 * Get a user profile by uid.
 */
export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Subscribe to auth state changes.
 * Wrapper around onAuthStateChanged for React usage.
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}