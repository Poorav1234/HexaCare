require("dotenv").config();
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });

// ── Auth Security Routes ─────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

// 🔑 Add your keys
const PINATA_API_KEY = "49775d0589707bce94f1";


const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/EfKrHvH52IvPVC3acuWFO";
const PRIVATE_KEY = "8a9f8bcd64cc9caa5f418c19d599c9a8d814cf5a149bb5dfdc60e16a6d38b777";
const CONTRACT_ADDRESS = "0xe8e112009bf378220FAeDBf8BDDe368f827d4cCA";
const PINATA_SECRET_API_KEY = "0cf2ed30cf8b6a0c354271043a9d67f69d5569806b5db6b689ff58bf45e076ba";

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const data = new FormData();
        data.append("file", fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            data,
            {
                headers: {
                    ...data.getHeaders(),
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_API_KEY
                }
            }
        );

        const cid = response.data.IpfsHash;

        res.json({ cid });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Admin Email Service ──────────────────────────────────────────────────────
// Configure these environment variables for email sending:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER;

let transporter = null;
if (smtpConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

app.post("/admin/send-credentials", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Missing required fields: name, email, password" });
    }

    if (!transporter) {
        return res.status(503).json({
            error: "Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.",
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