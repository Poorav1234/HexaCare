// backend/firebaseAdmin.js
// Optional Firebase Admin SDK initialization.
// Used for OTP-based password reset (updating user password server-side).
// If serviceAccountKey.json is not present, the server still runs but
// password reset will fall back to Firebase's standard email-link flow.

let admin = null;

try {
    const adminModule = require("firebase-admin");
    const serviceAccount = require("./serviceAccountKey.json");

    if (!adminModule.apps.length) {
        adminModule.initializeApp({
            credential: adminModule.credential.cert(serviceAccount),
        });
    }

    admin = adminModule;
    console.log("[Firebase Admin] ✓ Initialized — full password reset enabled.");
} catch (error) {
    console.warn("[Firebase Admin] ✗ Service account key not found — password reset will use fallback.");
    console.warn("[Firebase Admin]   To enable: place serviceAccountKey.json in backend/ directory.");
}

module.exports = admin;
