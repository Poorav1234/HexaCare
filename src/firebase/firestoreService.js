import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";

// Simulated blockchain transaction generator
const generateTxHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
};

export const saveReportToBlockchain = async (user, reportData) => {
    try {
        const txHash = generateTxHash();
        const payload = {
            ...reportData,
            uid: user.uid,
            fullName: user.displayName || user.profile?.fullName || "Anonymous",
            email: user.email,
            txHash: txHash,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "reports"), payload);
        return { success: true, txHash, id: docRef.id };
    } catch (error) {
        console.error("Error saving report:", error);
        throw error;
    }
};

export const getUserReports = async (uid) => {
    try {
        const q = query(
            collection(db, "reports"),
            where("uid", "==", uid),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching reports:", error);
        throw error;
    }
};

export const savePrediction = async (user, type, inputs, riskLevel, score) => {
    try {
        const payload = {
            uid: user.uid,
            type: type,
            inputs: inputs,
            riskLevel: riskLevel,
            score: score,
            createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, "predictions"), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving prediction:", error);
        throw error;
    }
};

export const getUserPredictions = async (uid) => {
    try {
        const q = query(
            collection(db, "predictions"),
            where("uid", "==", uid),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching predictions:", error);
        throw error;
    }
};
