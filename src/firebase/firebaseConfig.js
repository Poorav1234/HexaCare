// src/firebase/firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fallback to the project's existing Firebase keys if .env is not set up yet.
// (Prevents blank screen due to undefined config values.)
const fallbackConfig = {
  apiKey: "AIzaSyAnAeDSwJ0G-dQmxnRs7oS3V8b0BIp2R08",
  authDomain: "hexacare-mbs.firebaseapp.com",
  projectId: "hexacare-mbs",
  storageBucket: "hexacare-mbs.firebasestorage.app",
  messagingSenderId: "875066023824",
  appId: "1:875066023824:web:4161a7bd56630398b6dd15",
};

const hasEnv =
  !!envConfig.apiKey &&
  !!envConfig.authDomain &&
  !!envConfig.projectId &&
  !!envConfig.appId;

const firebaseConfig = hasEnv ? envConfig : fallbackConfig;

// Ensure we only initialize once (Vite HMR safe)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

const IS_DEV =
  import.meta.env.MODE === "development" ||
  import.meta.env.DEV ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "development");

export { app, auth, db, googleProvider, IS_DEV };