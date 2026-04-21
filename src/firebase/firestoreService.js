import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { logActivity, LOG_ACTIONS } from "./logService";

// Simulated blockchain transaction generator
const generateTxHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
};

export const saveReportToBlockchain = async (user, reportData, realTxHash = null) => {
    try {
        const txHash = realTxHash || generateTxHash();
        const payload = {
            ...reportData,
            uid: user.uid,
            fullName: user.displayName || user.profile?.fullName || "Anonymous",
            email: user.email,
            txHash: txHash,
            createdAt: serverTimestamp()
        };

        try {
            const docRef = await Promise.race([
                addDoc(collection(db, "reports"), payload),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
            ]);
            logActivity({ userId: user.uid, email: user.email, action: LOG_ACTIONS.REPORT_SUBMITTED, metadata: { reportId: docRef.id } });
            return { success: true, txHash, id: docRef.id };
        } catch (error) {
            console.warn("[Firebase] Firestore write denied. Emulating locally.");
            const safePayload = { ...payload, createdAt: Date.now() };
            const local = JSON.parse(localStorage.getItem('reports') || "[]");
            const newDoc = { id: `local_${Date.now()}`, ...safePayload };
            local.push(newDoc);
            localStorage.setItem('reports', JSON.stringify(local));
            return { success: true, txHash, id: newDoc.id };
        }
    } catch (error) {
        console.error("Error saving report:", error);
        throw error;
    }
};

export const getUserReports = async (uid) => {
    let firebaseReports = [];
    try {
        const q = query(
            collection(db, "reports"),
            where("uid", "==", uid),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await Promise.race([
            getDocs(q),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
        ]);
        firebaseReports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn("[Firebase] Firestore read denied or timed out. Relying on local cache.");
    }
    
    // Always merge with local cache to prevent data erasure for offline entries
    const local = JSON.parse(localStorage.getItem('reports') || "[]").filter(r => r.uid === uid);
    const allReportsMap = new Map();
    
    [...local, ...firebaseReports].forEach(r => allReportsMap.set(r.id, r));
    
    return Array.from(allReportsMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt;
        return timeB - timeA;
    });
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
        const docRef = await Promise.race([
            addDoc(collection(db, "predictions"), payload),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
        ]);
        logActivity({ userId: user.uid, email: user.email, action: LOG_ACTIONS.PREDICTION_RUN, metadata: { type, riskLevel } });
        return { success: true, id: docRef.id };
    } catch (error) {
         console.warn("[Firebase] Firestore write denied. Emulating locally.");
         const safePayload = { ...payload, createdAt: Date.now() };
         const local = JSON.parse(localStorage.getItem('predictions') || "[]");
         const newDoc = { id: `local_${Date.now()}`, ...safePayload };
         local.push(newDoc);
         localStorage.setItem('predictions', JSON.stringify(local));
         return { success: true, id: newDoc.id };
    }
};

export const getUserPredictions = async (uid) => {
    let firebasePredictions = [];
    try {
        const q = query(
            collection(db, "predictions"),
            where("uid", "==", uid),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await Promise.race([
            getDocs(q),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
        ]);
        firebasePredictions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn("[Firebase] Firestore read denied or timed out. Relying on local predictions.");
    }

    const local = JSON.parse(localStorage.getItem('predictions') || "[]").filter(r => r.uid === uid);
    const allPredictionsMap = new Map();
    
    [...local, ...firebasePredictions].forEach(r => allPredictionsMap.set(r.id, r));
    
    return Array.from(allPredictionsMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt;
        return timeB - timeA;
    });
};
