import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";

const fallbackConfig = {
    apiKey: "AIzaSyAnAeDSwJ0G-dQmxnRs7oS3V8b0BIp2R08",
    authDomain: "hexacare-mbs.firebaseapp.com",
    projectId: "hexacare-mbs",
    storageBucket: "hexacare-mbs.firebasestorage.app",
    messagingSenderId: "875066023824",
    appId: "1:875066023824:web:4161a7bd56630398b6dd15",
    databaseURL: "https://hexacare-mbs-default-rtdb.firebaseio.com",
};

const app = initializeApp(fallbackConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);

async function testRTDB() {
    console.log("Starting RTDB test...");
    try {
        const email = `testrtdb${Date.now()}@example.com`;
        console.log("Creating user...", email);
        const cred = await createUserWithEmailAndPassword(auth, email, "Pass123!");
        console.log("User created:", cred.user.uid);

        const userRef = ref(rtdb, `users/${cred.user.uid}`);
        console.log("Setting doc in RTDB...");
        await set(userRef, {
            email,
            fullName: "Test User RTDB",
            createdAt: Date.now()
        });
        console.log("Doc set successfully in RTDB.");

        console.log("Getting doc...");
        const snap = await get(userRef);
        console.log("Doc exists:", snap.exists());

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

testRTDB();
