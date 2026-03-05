import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const fallbackConfig = {
    apiKey: "AIzaSyAnAeDSwJ0G-dQmxnRs7oS3V8b0BIp2R08",
    authDomain: "hexacare-mbs.firebaseapp.com",
    projectId: "hexacare-mbs",
    storageBucket: "hexacare-mbs.firebasestorage.app",
    messagingSenderId: "875066023824",
    appId: "1:875066023824:web:4161a7bd56630398b6dd15",
};

const app = initializeApp(fallbackConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAuth() {
    console.log("Starting test...");
    try {
        const email = `test${Date.now()}@example.com`;
        console.log("Creating user...", email);
        const cred = await createUserWithEmailAndPassword(auth, email, "Pass123!");
        console.log("User created:", cred.user.uid);

        const userRef = doc(db, "users", cred.user.uid);
        console.log("Setting doc...");
        await setDoc(userRef, {
            email,
            fullName: "Test User",
            createdAt: new Date()
        });
        console.log("Doc set successfully.");

        console.log("Getting doc...");
        const snap = await getDoc(userRef);
        console.log("Doc exists:", snap.exists());

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

testAuth();
