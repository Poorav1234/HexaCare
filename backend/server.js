require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");
const Groq = require("groq-sdk");
const pdfParse = require("pdf-parse");

const app = express();
app.use(cors());

// Fetch Cloudflare IPv4 & IPv6 arrays seamlessly from config, enabling CI/CD agility.
const rawProxyIps = process.env.CLOUDFLARE_IPS || "loopback,linklocal,uniquelocal";
const trustedProxies = rawProxyIps.split(",").map(ip => ip.trim());

// Enable strict trust proxy against known WAF edges to natively verify real IPs and obliterate spoofing
app.set("trust proxy", trustedProxies);

app.use(express.json());

// ── Strict Security Middlewares ──────────────────────────────────────────────
const { securityHeaders, validateAndSanitize } = require("./middlewares/securityMiddleware");
app.use(securityHeaders);
app.use(validateAndSanitize);

const upload = multer({ dest: "uploads/" });

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

// ── Trusted Device Approval Routes ───────────────────────────────────────────
const deviceRoutes = require("./routes/deviceRoutes");
app.use("/auth/device", deviceRoutes);

const PINATA_API_KEY = "49775d0589707bce94f1";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/EfKrHvH52IvPVC3acuWFO";
const PRIVATE_KEY = "8a9f8bcd64cc9caa5f418c19d599c9a8d814cf5a149bb5dfdc60e16a6d38b777";
const CONTRACT_ADDRESS = "0xe8e112009bf378220FAeDBf8BDDe368f827d4cCA";
const PINATA_SECRET_API_KEY = "0cf2ed30cf8b6a0c354271043a9d67f69d5569806b5db6b689ff58bf45e076ba";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Rule-Based Medical Parameter Extractor & Classifier ──────────────────────
// Each rule: name, regex, classify fn, unit, normalRange string, physiological min/max.
// Values outside min/max OR <= 0 are rejected immediately (anti-hallucination).

const MEDICAL_RULES = [
    {
        name: "Fasting Blood Sugar",
        regex: /(?:fasting\s*(?:blood\s*)?(?:sugar|glucose)|fbs|ppbs|fasting\s*glucose|f\.?\s*blood\s*sugar)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v < 100 ? "Normal" : v < 126 ? "High" : "High",
        unit: "mg/dL", normalRange: "70–99 mg/dL", min: 30, max: 700
    },
    {
        name: "Glucose",
        regex: /(?:^|[\s,;])(?:glucose|blood\s*sugar|bsl|rbs|sugar)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:mg\/dL|mg\/dl|mg%)?/im,
        classify: v => v < 70 ? "Low" : v <= 140 ? "Normal" : "High",
        unit: "mg/dL", normalRange: "70–140 mg/dL", min: 30, max: 700
    },
    {
        name: "HbA1c",
        regex: /(?:hba1c|hb\s*a1c|glycat(?:ed|ated)\s*(?:haemoglobin|hemoglobin)|a1c|glyco?haemoglobin)\s*[:\-\s]?\s*(\d+\.?\d*)\s*%?/i,
        classify: v => v < 5.7 ? "Normal" : v < 6.5 ? "High" : "High",
        unit: "%", normalRange: "< 5.7%", min: 3, max: 20
    },
    {
        name: "Total Cholesterol",
        regex: /(?:total\s*cholesterol|cholesterol\s*total|t\.?\s*chol(?:esterol)?)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v < 200 ? "Normal" : v < 240 ? "High" : "High",
        unit: "mg/dL", normalRange: "< 200 mg/dL", min: 50, max: 600
    },
    {
        name: "Triglycerides",
        regex: /(?:triglycerides?|tg|serum\s*triglycerides?)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v < 150 ? "Normal" : v < 200 ? "High" : "High",
        unit: "mg/dL", normalRange: "< 150 mg/dL", min: 20, max: 5000
    },
    {
        name: "HDL Cholesterol",
        regex: /(?:hdl[\s\-]*(?:cholesterol|chol)?|high\s*density\s*lipoprotein)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 40 ? "Normal" : "Low",
        unit: "mg/dL", normalRange: "> 40 mg/dL", min: 10, max: 150
    },
    {
        name: "LDL Cholesterol",
        regex: /(?:ldl[\s\-]*(?:cholesterol|chol)?|low\s*density\s*lipoprotein)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v < 100 ? "Normal" : v < 160 ? "High" : "High",
        unit: "mg/dL", normalRange: "< 100 mg/dL", min: 20, max: 400
    },
    {
        name: "Blood Pressure",
        regex: /(?:bp|blood\s*pressure|b\.?\s*p\.?)\s*[:\-\s]?\s*(\d{2,3})\s*\/\s*\d{2,3}\s*(?:mmHg)?/i,
        classify: v => v <= 120 ? "Normal" : v <= 140 ? "High" : "High",
        unit: "mmHg (Systolic)", normalRange: "≤ 120 mmHg (Systolic)", min: 60, max: 250
    },
    {
        name: "Heart Rate",
        regex: /(?:heart\s*rate|pulse\s*(?:rate)?)\s*[:\-\s]?\s*(\d+)\s*(?:bpm|beats?\/min)/i,
        classify: v => v < 60 ? "Low" : v <= 100 ? "Normal" : "High",
        unit: "bpm", normalRange: "60–100 bpm", min: 30, max: 250
    },
    {
        name: "Haemoglobin",
        regex: /(?:h(?:a?e)?moglobin|hb|hgb)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:g\/dL|g\/dl|gm\/dl|g%)/i,
        classify: v => v < 12 ? "Low" : v <= 17.5 ? "Normal" : "High",
        unit: "g/dL", normalRange: "12–17.5 g/dL", min: 3, max: 25
    },
    {
        name: "Platelet Count",
        regex: /(?:platelet(?:\s*count)?|plt|thrombocytes?)\s*[:\-\s]?\s*(\d+(?:[,\.]\d+)?)\s*(?:lakh|×10[³3]|\/µL|\/uL|lakhs?)?/i,
        classify: v => v < 150 ? "Low" : v <= 400 ? "Normal" : "High",
        unit: "×10³/µL", normalRange: "150–400 ×10³/µL", min: 10, max: 1500
    },
    {
        name: "Vitamin D",
        regex: /(?:vitamin\s*d(?:\s*3)?|vit\.?\s*d(?:\s*3)?|25[\s\-]*o(?:h|hydroxy)[\s\-]*(?:vitamin\s*)?d(?:\s*3)?|calcidiol)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v < 20 ? "Low" : v <= 50 ? "Normal" : "High",
        unit: "ng/mL", normalRange: "20–50 ng/mL", min: 1, max: 200
    },
    {
        name: "Vitamin B12",
        regex: /(?:vitamin\s*b[\s\-]*12|vit\.?\s*b[\s\-]*12|b[\s\-]*12|cobalamin|cyanocobalamin)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v < 200 ? "Low" : v <= 900 ? "Normal" : "High",
        unit: "pg/mL", normalRange: "200–900 pg/mL", min: 50, max: 5000
    },
    {
        name: "Homocysteine",
        regex: /(?:homocysteine?|hcy)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v <= 15 ? "Normal" : "High",
        unit: "µmol/L", normalRange: "< 15 µmol/L", min: 1, max: 100
    },
    {
        name: "IgE (Total)",
        regex: /(?:(?:total\s*)?ige|immunoglobulin\s*e)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v <= 100 ? "Normal" : "High",
        unit: "IU/mL", normalRange: "< 100 IU/mL", min: 1, max: 10000
    },
    {
        name: "Creatinine",
        regex: /(?:s(?:erum)?\s*creatinine|creatinine)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:mg\/dL|mg\/dl)?/i,
        classify: v => v >= 0.6 && v <= 1.2 ? "Normal" : v < 0.6 ? "Low" : "High",
        unit: "mg/dL", normalRange: "0.6–1.2 mg/dL", min: 0.2, max: 20
    },
    {
        name: "Urea / BUN",
        regex: /(?:(?:blood\s*)?urea(?:\s*nitrogen)?|bun|s\.?\s*urea)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:mg\/dL|mg\/dl)?/i,
        classify: v => v <= 45 ? "Normal" : "High",
        unit: "mg/dL", normalRange: "7–45 mg/dL", min: 5, max: 300
    },
    {
        name: "Uric Acid",
        regex: /(?:uric\s*acid|s\.?\s*uric\s*acid|serum\s*uric\s*acid)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v <= 7 ? "Normal" : "High",
        unit: "mg/dL", normalRange: "2.4–7.0 mg/dL", min: 1, max: 20
    },
    {
        name: "TSH",
        regex: /(?:tsh|thyroid\s*stimulating\s*hormone|thyrotropin)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 0.4 && v <= 4 ? "Normal" : v < 0.4 ? "Low" : "High",
        unit: "µIU/mL", normalRange: "0.4–4.0 µIU/mL", min: 0.001, max: 100
    },
    {
        name: "T3",
        regex: /(?:t[\s\-]?3(?:\s*total)?|tri[\s\-]?iodothyronine|total\s*t3)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 80 && v <= 200 ? "Normal" : v < 80 ? "Low" : "High",
        unit: "ng/dL", normalRange: "80–200 ng/dL", min: 10, max: 500
    },
    {
        name: "T4",
        regex: /(?:t[\s\-]?4(?:\s*total)?|thyroxine|total\s*t4)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 4.5 && v <= 12 ? "Normal" : v < 4.5 ? "Low" : "High",
        unit: "µg/dL", normalRange: "4.5–12.0 µg/dL", min: 0.5, max: 30
    },
    {
        name: "Ferritin",
        regex: /(?:s(?:erum)?\s*ferritin|ferritin)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 12 && v <= 300 ? "Normal" : v < 12 ? "Low" : "High",
        unit: "ng/mL", normalRange: "12–300 ng/mL", min: 1, max: 5000
    },
    {
        name: "Iron",
        regex: /(?:serum\s*iron|s\.?\s*iron|iron(?!\s*(?:binding|saturation)))\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 60 && v <= 170 ? "Normal" : v < 60 ? "Low" : "High",
        unit: "µg/dL", normalRange: "60–170 µg/dL", min: 10, max: 500
    },
    {
        name: "Sodium",
        regex: /(?:s(?:erum)?\s*sodium|sodium|na\+?)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:mEq\/L|mmol\/L)?/i,
        classify: v => v >= 136 && v <= 145 ? "Normal" : v < 136 ? "Low" : "High",
        unit: "mEq/L", normalRange: "136–145 mEq/L", min: 100, max: 180
    },
    {
        name: "Potassium",
        regex: /(?:s(?:erum)?\s*potassium|potassium|k\+?)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:mEq\/L|mmol\/L)?/i,
        classify: v => v >= 3.5 && v <= 5.1 ? "Normal" : v < 3.5 ? "Low" : "High",
        unit: "mEq/L", normalRange: "3.5–5.1 mEq/L", min: 1, max: 10
    },
    {
        name: "Calcium",
        regex: /(?:s(?:erum)?\s*calcium|calcium|ca(?:\+\+|\2\+)?)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:mg\/dL)?/i,
        classify: v => v >= 8.5 && v <= 10.5 ? "Normal" : v < 8.5 ? "Low" : "High",
        unit: "mg/dL", normalRange: "8.5–10.5 mg/dL", min: 4, max: 20
    },
    {
        name: "ALT (SGPT)",
        regex: /(?:alt|sgpt|alanine\s*(?:amino)?transaminase|alanine\s*aminotransferase)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:U\/L|IU\/L)?/i,
        classify: v => v <= 56 ? "Normal" : "High",
        unit: "U/L", normalRange: "7–56 U/L", min: 1, max: 5000
    },
    {
        name: "AST (SGOT)",
        regex: /(?:ast|sgot|aspartate\s*(?:amino)?transaminase|aspartate\s*aminotransferase)\s*[:\-\s]?\s*(\d+\.?\d*)\s*(?:U\/L|IU\/L)?/i,
        classify: v => v <= 40 ? "Normal" : "High",
        unit: "U/L", normalRange: "10–40 U/L", min: 1, max: 5000
    },
    {
        name: "Bilirubin (Total)",
        regex: /(?:(?:total|t\.?)\s*bilirubin|bilirubin\s*(?:total|t\.?))\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v <= 1.2 ? "Normal" : "High",
        unit: "mg/dL", normalRange: "0.1–1.2 mg/dL", min: 0.1, max: 30
    },
    {
        name: "Alkaline Phosphatase",
        regex: /(?:alkaline\s*phosphatase|alp|alk\.?\s*phos?(?:phatase)?)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v <= 147 ? "Normal" : "High",
        unit: "U/L", normalRange: "44–147 U/L", min: 10, max: 5000
    },
    {
        name: "eGFR",
        regex: /(?:e?gfr|glomerular\s*filtration\s*rate)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 60 ? "Normal" : "Low",
        unit: "mL/min/1.73m²", normalRange: "≥ 60 mL/min/1.73m²", min: 1, max: 200
    },
    {
        name: "WBC Count",
        regex: /(?:wbc|white\s*blood\s*(?:cell|corpuscle)\s*count|total\s*(?:leukocyte|wbc)\s*count|tlc)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 4 && v <= 11 ? "Normal" : v < 4 ? "Low" : "High",
        unit: "×10³/µL", normalRange: "4–11 ×10³/µL", min: 0.5, max: 100
    },
    {
        name: "RBC Count",
        regex: /(?:rbc|red\s*blood\s*(?:cell|corpuscle)\s*count)\s*[:\-\s]?\s*(\d+\.?\d*)/i,
        classify: v => v >= 4.2 && v <= 6 ? "Normal" : v < 4.2 ? "Low" : "High",
        unit: "×10⁶/µL", normalRange: "4.2–6.0 ×10⁶/µL", min: 1, max: 10
    },
];

function extractAndClassifyParameters(text) {
    const results = [];
    const seen = new Set();
    const textNormalized = text.replace(/[ \t]+/g, " ");

    for (const rule of MEDICAL_RULES) {
        const match = textNormalized.match(rule.regex);
        if (!match) continue;

        const rawVal = match[1].replace(/,/g, "");
        const value = parseFloat(rawVal);

        // Strict validation: reject zero, negative, or out-of-physiological-range values
        if (isNaN(value) || value <= 0) {
            console.log(`[Extractor] Skip ${rule.name}: value=${value} (invalid/zero)`);
            continue;
        }
        if (value < rule.min || value > rule.max) {
            console.log(`[Extractor] Skip ${rule.name}: value=${value} outside [${rule.min}–${rule.max}]`);
            continue;
        }

        if (seen.has(rule.name)) continue;
        seen.add(rule.name);

        const status = rule.classify(value);
        results.push({
            name: rule.name,
            value: `${rawVal} ${rule.unit}`,
            numericValue: value,
            status,
            normalRange: rule.normalRange
        });
    }
    return results;
}

app.post("/upload", upload.single("file"), async (req, res) => {
    // 1. FORMAT VALIDATION
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. ONLY PDF format reports are allowed." });
    }
    if (req.file.mimetype !== "application/pdf") {
        fs.unlink(req.file.path, () => { });
        return res.status(400).json({ error: "⚠️ Invalid format. ONLY PDF format reports are allowed." });
    }

    try {
        const fileBuffer = fs.readFileSync(req.file.path);

        // 2. EXTRACT PDF TEXT
        let rawPdfText = "";
        try {
            const pdfData = await pdfParse(fileBuffer);
            if (pdfData && pdfData.text) rawPdfText = pdfData.text;
        } catch (pdfErr) {
            console.error("[PDF] Parse Error:", pdfErr);
            fs.unlink(req.file.path, () => { });
            return res.status(400).json({ error: "Unable to parse the uploaded PDF document." });
        }

        const fullText = rawPdfText + " " + (req.body.notes || "");

        // DEBUG: Log first 3000 chars of raw extracted text to help diagnose extraction issues
        console.log("[PDF Raw Text Sample]:\n" + fullText.slice(0, 3000));

        // 3. DOCUMENT VALIDATION
        const medicalKeywords = [
            "glucose", "cholesterol", "triglycerides", "hdl", "ldl", "hba1c",
            "blood pressure", "mg/dl", "mmol/l", "bpm", "haemoglobin", "hemoglobin",
            "platelet", "diagnosis", "vitamin", "thyroid", "ferritin", "sgot", "sgpt",
            "alt", "ast", "creatinine", "urea", "sodium", "potassium", "bilirubin",
            "wbc", "rbc", "tlc", "alp", "gfr", "t3", "t4", "tsh", "uric", "ige"
        ];
        const lowerFull = fullText.toLowerCase();
        if (!medicalKeywords.some(k => lowerFull.includes(k))) {
            fs.unlink(req.file.path, () => { });
            return res.status(400).json({ error: "⚠️ This document does not appear to be a medical report." });
        }

        // 4. RULE-BASED EXTRACTION & CLASSIFICATION
        let extractedParams = extractAndClassifyParameters(fullText);

        console.log(`[Analysis] Rule-based extracted ${extractedParams.length} parameters:`);
        extractedParams.forEach(p => console.log(`  ${p.name}: ${p.value} (${p.status}) | range: ${p.normalRange}`));

        // FALLBACK BROAD SCAN — catches parameters the strict rules missed in garbled PDFs
        // Looks for patterns like: "SomeName  141  mg/dL" or "Some Test: 7.1 %"
        if (extractedParams.length < 5) {
            console.log("[Extractor] Running broad fallback scan...");
            const seenNames = new Set(extractedParams.map(p => p.name.toLowerCase()));

            // Broad pattern: any word(s) followed by a number followed by an optional unit
            const broadRegex = /([A-Za-z][A-Za-z0-9\s\(\)\/\.\-]{2,40?})\s*[:\-]?\s*(\d+\.?\d*)\s*(mg\/dL|mg\/dl|g\/dL|g\/dl|%|ng\/mL|pg\/mL|µmol\/L|mmol\/L|mEq\/L|U\/L|IU\/L|µIU\/mL|bpm|mmHg|\/µL|×10³\/µL|×10⁶\/µL|ng\/mL|IU\/mL)/gi;
            const textNorm = fullText.replace(/[ \t]+/g, " ");
            let broadMatch;
            while ((broadMatch = broadRegex.exec(textNorm)) !== null) {
                const rawName = broadMatch[1].trim().replace(/[\-:]+$/, "").trim();
                const rawVal  = broadMatch[2];
                const unit    = broadMatch[3];
                const value   = parseFloat(rawVal);

                if (!rawName || rawName.length < 2 || isNaN(value) || value <= 0) continue;
                // Skip if name contains only numbers or is too generic
                if (/^\d+$/.test(rawName) || /^(page|ref|date|no|sr)$/i.test(rawName)) continue;

                const nameLower = rawName.toLowerCase();
                // Skip if already found by specific rules
                if ([...seenNames].some(s => nameLower.includes(s) || s.includes(nameLower.split(" ")[0]))) continue;

                seenNames.add(nameLower);
                // Best-effort status based on unit context
                extractedParams.push({
                    name: rawName,
                    value: `${rawVal} ${unit}`,
                    numericValue: value,
                    status: "See Report",
                    normalRange: "—"
                });
            }
            console.log(`[Extractor] After fallback: ${extractedParams.length} total parameters`);
        }

        if (extractedParams.length < 1) {
            fs.unlink(req.file.path, () => { });
            return res.status(400).json({
                error: "⚠️ Could not extract any medical values from this report. The PDF may use unsupported fonts or be a scanned image. Please try a text-based PDF."
            });
        }

        // 5. BUILD STRUCTURED REPORT WITH RANGES FOR AI
        const abnormalParams = extractedParams.filter(p => p.status !== "Normal" && p.status !== "See Report");
        const normalParams   = extractedParams.filter(p => p.status === "Normal");
        const hasAbnormal    = abnormalParams.length > 0;

        // Format: "Name: Value (Status, Normal Range: range)"
        const formatParam = p => `${p.name}: ${p.value} (${p.status}, Normal Range: ${p.normalRange})`;
        const allFormatted = extractedParams.map(formatParam).join("\n");

        // 6. AI EXPLANATION — explains ENTIRE report, not just issues
        const prompt = `You are a friendly, caring medical report assistant explaining health results to someone with no medical knowledge.

ABSOLUTE RULES — follow these exactly:
- Analyze ONLY the parameters in STRUCTURED REPORT DATA below
- Do NOT invent values, add parameters, or skip any parameter
- ALL ${extractedParams.length} parameters MUST appear in the Key Findings table
- Explain the ENTIRE report — both normal and abnormal values
- Risks and Advice must cover the WHOLE report picture, not just abnormal values
- ${hasAbnormal
    ? `⚠️ ${abnormalParams.length} value(s) are abnormal — the Summary MUST clearly mention this`
    : "✅ All values appear normal — the Summary should reflect this positively"}
- Use VERY simple, friendly English — like explaining to a friend who knows nothing about medicine
- Never say "overall everything is fine" if any value is High or Low

---

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

### 1. Summary
Write 2–3 simple sentences summarizing the ENTIRE report.
Clearly say if attention is needed for any values.

---

### 2. Key Findings

Output a markdown table with ALL ${extractedParams.length} parameters:

| Parameter | Your Value | Normal Range | Status |
|-----------|------------|--------------|--------|

Rules:
- Add ONE row for EVERY parameter listed in STRUCTURED REPORT DATA
- Do NOT skip any parameter — include all ${extractedParams.length} rows
- Status must be: ✅ Normal | ⚠️ High | ⚠️ Low | ℹ️ See Report
- No text outside the table in this section

---

### 3. Explanation
Write 3–5 sentences explaining what the OVERALL results mean for this person.
Cover BOTH normal and abnormal findings.
Use very simple language — no medical jargon.

---

### 4. Risks
${hasAbnormal
    ? `Explain the health risks for the ENTIRE report:\n- For each ABNORMAL value: explain the possible risk in a calm, simple way ("This may increase the chance of...")\n- For NORMAL values: briefly note they look healthy\n- Give an overall risk picture at the end`
    : "All values look healthy — briefly state there are no major health risks based on this report, and encourage maintaining this with a healthy lifestyle."}

---

### 5. Advice
Give 4–6 practical daily-life tips based on the ENTIRE report.
- Address both the abnormal AND the normal values
- Each tip should be one short, clear sentence
- Cover areas like: diet, exercise, supplements, doctor visits, lifestyle

---

End with this exact line:
"This is AI-generated and not a medical diagnosis. Please consult a doctor."

---

STRUCTURED REPORT DATA (explain ALL of these — ${extractedParams.length} total parameters):
${allFormatted}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
        });

        const aiOutput = chatCompletion.choices[0]?.message?.content || "";
        const lowerOut = aiOutput.toLowerCase();

        // 7. BASIC SANITY CHECK
        if (lowerOut.includes("no valid medical data") || lowerOut.includes("no medical data available")) {
            fs.unlink(req.file.path, () => { });
            return res.status(400).json({ error: "⚠️ No valid medical data detected. Report rejected." });
        }

        if (hasAbnormal && (lowerOut.includes("all values are normal") || lowerOut.includes("overall everything is okay"))) {
            console.warn("[AI] Gave misleading positive summary — logged.");
        }

        const missingParams = extractedParams.filter(p => !lowerOut.includes(p.name.toLowerCase().split(" ")[0]));
        if (missingParams.length > 0) {
            console.warn("[AI] May have skipped:", missingParams.map(p => p.name));
        }

        // 8. UPLOAD TO PINATA
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        const formData = new FormData();
        formData.append("file", blob, req.file.originalname);

        const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_API_KEY,
            },
            body: formData,
        });

        fs.unlink(req.file.path, () => { });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(502).json({ error: `Pinata error: ${response.status} – ${errText}` });
        }

        const data = await response.json();
        const cid = data.IpfsHash;
        console.log("[Pinata] Pinned. CID:", cid);

        res.json({ cid, summary: aiOutput, structuredParams: extractedParams });

    } catch (err) {
        console.error("[Upload] Error:", err.message);
        if (req.file && req.file.path) fs.unlink(req.file.path, () => { });
        res.status(500).json({ error: err.message || "Upload to IPFS failed" });
    }
});

// ── Admin Email Service ──────────────────────────────────────────────────────
const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER;
let transporter = null;
if (smtpConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
    });
}

app.post("/admin/send-credentials", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Missing required fields: name, email, password" });
    }
    if (!transporter) {
        return res.status(503).json({
            error: "Email service not configured.",
            hint: "Credentials were NOT emailed. Share them manually."
        });
    }
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: "HexaCare — Your Admin Account Has Been Created",
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px;">
                    <h1 style="color: #0ea5e9; margin: 0 0 8px;">HexaCare</h1>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Admin Account Created</p>
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>Your admin account has been created. Here are your credentials:</p>
                    <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Password:</strong> ${password}</p>
                    </div>
                    <p style="color: #f59e0b; font-size: 13px;">⚠️ Please change your password after your first login.</p>
                    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">This is an automated message from HexaCare.</p>
                </div>
            `,
        });
        res.json({ success: true, message: "Credentials emailed successfully." });
    } catch (err) {
        console.error("[Email] Failed to send:", err.message);
        res.status(500).json({ error: "Failed to send email: " + err.message });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));