const admin = require("../firebaseAdmin");

async function logSuspiciousEvent(req, blockedReason, payload) {
    if (!admin) return;
    try {
        const ip = req.ip || "unknown";
        const db = admin.firestore();
        await db.collection("activityLogs").add({
            userId: "",
            email: "system@security",
            action: "malicious_payload_blocked",
            metadata: {
                ip,
                country: req.headers["cf-ipcountry"] || "Unknown",
                rayId: req.headers["cf-ray"] || "Unknown",
                userAgent: req.headers["user-agent"] || "Unknown",
                endpoint: req.originalUrl,
                method: req.method,
                blockedReason,
                payloadSample: JSON.stringify(payload).substring(0, 100)
            },
            severity: "critical",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // silent fail
    }
}

// ─── 1. Security Headers Middleware ──────────────────────────────────────────
const securityHeaders = (req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Referrer-Policy", "no-referrer");
    
    // Content-Security-Policy (CSP) - Improved for external integrations
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://apis.google.com; frame-src 'self' https://accounts.google.com; form-action 'self'"
    );
    
    next();
};

// ─── 2. Input Validation & Sanitization Middleware ───────────────────────────
const validateAndSanitize = async (req, res, next) => {
    // Performance optimization: Only deep check mutating requests
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
        return next();
    }
    
    // Pattern to detect obvious XSS / injection tags
    const maliciousPattern = /<script\b[^>]*>|javascript:|onerror=|onload=|eval\(|<object|<embed|<link|<style|<iframe/i;
    // Pattern to detect deep NoSQL / JSON injection primitives
    const noSqlInjectionPattern = /\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex|\$where/i;

    const checkObject = async (obj, path = "") => {
        if (!obj) return false;
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "string") {
                // 1. Validate: Length limits (prevent overflow / ReDoS)
                if (value.length > 5000) {
                    await logSuspiciousEvent(req, "Payload overflow length limit", { 
                        key, level: "low", type: "Overflow" 
                    });
                    return "Invalid input format";
                }

                // URL Decode to catch encoded attack payloads
                let decodedValue = value;
                try { decodedValue = decodeURIComponent(value); } catch (e) {}

                // 2. Validate: XSS Malicious Code block
                if (maliciousPattern.test(decodedValue)) {
                    await logSuspiciousEvent(req, "XSS Payload Detected", { 
                        key, level: "high", type: "XSS" 
                    });
                    return "Suspicious request blocked";
                }

                // 3. Validate: NoSQL basic injection block & nested object key injection
                if (noSqlInjectionPattern.test(decodedValue) || key.startsWith("$")) {
                    await logSuspiciousEvent(req, "Injection Payload Detected", { 
                        key, level: "high", type: "Injection" 
                    });
                    return "Suspicious request blocked";
                }

                // 4. Specific Field Validations (Email & Password)
                const lowerKey = key.toLowerCase();
                if (lowerKey === "email" || lowerKey.endsWith("email")) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        return "Invalid input format";
                    }
                }
                
                if (lowerKey === "password" || lowerKey.endsWith("password")) {
                    if (value.length < 6) return "Invalid input format";
                }
                
                // NO MORE MUTATION: We strictly validate and block. We do NOT destructively alter raw input `<`.
            } else if (typeof value === "number") {
                if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
                    return "Invalid input format";
                }
            } else if (typeof value === "object" && value !== null) {
                const nestedError = await checkObject(value, `${path}.${key}`);
                if (nestedError) return nestedError;
            }
        }
        return false;
    };

    if (req.body && Object.keys(req.body).length > 0) {
        const error = await checkObject(req.body);
        if (error) return res.status(400).json({ error });
    }

    if (req.query && Object.keys(req.query).length > 0) {
        const error = await checkObject(req.query);
        if (error) return res.status(400).json({ error });
    }

    next();
};

module.exports = {
    securityHeaders,
    validateAndSanitize
};
