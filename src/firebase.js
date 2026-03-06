// Thin re-export wrapper so the whole app uses a single Firebase app instance.
// This prevents multiple initializeApp calls and keeps Auth/Firestore consistent.

import { app, auth, db, googleProvider, rtdb } from "./firebase/firebaseConfig";

export { app, auth, db, googleProvider, rtdb };