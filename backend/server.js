const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

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

app.listen(5000, () => console.log("Server running on port 5000"));