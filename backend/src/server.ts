import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { publicEncrypt, randomBytes, createCipheriv } from 'crypto';
import { createOnChainArchive } from "./suiClient";
import puppeteer from "puppeteer";
import JSZip from "jszip";
import OpenAI from "openai";

dotenv.config();

const PORT = process.env.PORT || 4000;

// --- Env ---
const SUI_PACKAGE_ID = process.env.SUI_PACKAGE_ID;
const SUI_REGISTRY_ID = process.env.SUI_REGISTRY_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!SUI_PACKAGE_ID || !SUI_REGISTRY_ID) {
  console.warn("[WARN] SUI_PACKAGE_ID or SUI_REGISTRY_ID missing. On-chain writes will fail.");
}

if (!GROQ_API_KEY) {
  console.warn("[WARN] GROQ_API_KEY missing. AI analysis will be disabled.");
}

// --- Resilient Walrus Upload with Multi-Publisher Fallback ---
/**
 * Uploads data to Walrus decentralized storage with automatic failover.
 * Tries multiple public publishers until successful to ensure high availability.
 */
async function uploadToWalrusDirectly(fileBuffer: Buffer): Promise<{ blobId: string, status: string }> {
  
  const PUBLISHERS = [
    "https://publisher.walrus-testnet.walrus.space",
    "https://walrus-testnet-publisher.stakely.io",
    "https://walrus-testnet-publisher.nodes.guru",
    "https://testnet-walrus-publisher.staketab.org"
  ];

  let lastError: any = null;

  for (const baseUrl of PUBLISHERS) {
    const url = `${baseUrl}/v1/blobs?epochs=5`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        body: new Uint8Array(fileBuffer),
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();

      // Extract blob ID from response
      let blobId: string;
      if (data.newlyCreated) {
        blobId = data.newlyCreated.blobObject.blobId;
      } else if (data.alreadyCertified) {
        blobId = data.alreadyCertified.blobId;
      } else {
        throw new Error("Invalid response structure from Walrus");
      }

      console.log(`[WALRUS] ✅ ${baseUrl.split('//')[1].split('.')[0]}`);
      return { blobId, status: "active" };

    } catch (err: any) {
      lastError = err;
      continue; // Try next publisher
    }
  }

  throw new Error(`All Walrus publishers failed. Last error: ${lastError?.message}`);
}

// --- [NEW] Seal Buffer with Hybrid Encryption ---
/**
 * Implements hybrid encryption for whistleblower protection:
 * 1. Generate ephemeral AES-256 key for fast bulk encryption
 * 2. Encrypt content with AES-256-GCM (authenticated encryption)
 * 3. Encrypt AES key with recipient's RSA public key
 * 4. Pack all components: [IV + AuthTag + KeyLength + EncryptedKey + EncryptedContent]
 * 
 * Security: Only the holder of the matching RSA private key can decrypt.
 * Performance: AES for speed, RSA for secure key exchange.
 */
function sealBuffer(buffer: Buffer, publicKeyPem: string): Buffer {
  // Generate cryptographically secure random keys
  const aesKey = randomBytes(32); // 256-bit AES key
  const iv = randomBytes(16);     // 128-bit initialization vector

  // Encrypt content using AES-256-GCM (provides both confidentiality and authenticity)
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const encryptedContent = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // GCM authentication tag prevents tampering

  // Encrypt the AES key using recipient's RSA public key (OAEP padding for security)
  const formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`;
  
  const encryptedAesKey = publicEncrypt(
    {
      key: formattedKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );

  // Pack encrypted data in structured format for decryption
  // Format: [IV (16 bytes)] + [AuthTag (16 bytes)] + [KeyLength (2 bytes)] + [EncryptedKey (variable)] + [EncryptedContent (variable)]
  const keyLengthBuf = Buffer.alloc(2);
  keyLengthBuf.writeUInt16BE(encryptedAesKey.length);

  return Buffer.concat([
    iv, 
    authTag, 
    keyLengthBuf, 
    encryptedAesKey, 
    encryptedContent
  ]);
}

// --- Express App ---
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "archivechain-backend" });
});

app.post("/api/archive", async (req, res) => {
  const { url, title, recipientPublicKey } = req.body as { url?: string; title?: string; recipientPublicKey?: string; };

  if (!url || !title) {
    return res.status(400).json({ ok: false, error: "Missing required fields: url, title" });
  }

  try {
    console.log(`\n[ARCHIVE] ${url} ${recipientPublicKey ? '🔒 SEALED' : '📢 PUBLIC'}`);
    
    // 1. CAPTURE: Use headless browser to capture full page state
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto(url, { waitUntil: "networkidle2" });
    const htmlContent = await page.content();
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await browser.close();

    // 2. ZIP: Package HTML and screenshot for immutable storage
    const zip = new JSZip();
    zip.file("index.html", htmlContent);
    zip.file("screenshot.png", screenshotBuffer);
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // 3. SEAL: Apply hybrid encryption if recipient specified (Whistleblower Mode)
    let finalBuffer = zipBuffer;
    let isEncrypted = false;

    if (recipientPublicKey) {
      try {
        finalBuffer = sealBuffer(zipBuffer, recipientPublicKey);
        isEncrypted = true;
        console.log("[ENCRYPT] ✅ Archive sealed with hybrid encryption");
      } catch (e: any) {
        console.error("[ENCRYPT] ❌ Failed:", e.message);
        return res.status(500).json({ok: false, error: `Encryption failed: ${e.message}`});
      }
    }

    // 4. HASH: Generate SHA-256 for blockchain proof (of encrypted or plain data)
    const contentHashHex = crypto.createHash("sha256").update(finalBuffer).digest("hex");

    // 5. UPLOAD: Store on decentralized Walrus network with multi-publisher fallback
    const { blobId } = await uploadToWalrusDirectly(finalBuffer);
    
    const walrusBlobId = blobId;
    const tuskyFileId = "direct-upload"; 

    // 6. WRITE TO SUI (Mark sealed archives with 🔒 prefix)
    let suiDigest: string | null = null;
    let suiArchiveId: string | null = null;
    const finalTitle = isEncrypted ? `🔒 ${title}` : title;

    if (SUI_PACKAGE_ID && SUI_REGISTRY_ID) {
      console.log("Creating on-chain archive on Sui...");
      const suiResult = await createOnChainArchive({
        url,
        walrusBlobId,
        tuskyFileId,
        contentHashHex,
        title: finalTitle,
      });
      suiDigest = suiResult.digest;
      suiArchiveId = suiResult.archiveId ?? null;
      console.log(`✅ Sui tx success. Digest=${suiDigest}, ArchiveID=${suiArchiveId}`);
    }

    // 7. RESPONSE
    return res.json({
      ok: true,
      url,
      title: finalTitle,
      tuskyFileId,
      walrusBlobId,
      mimeType: "application/zip",
      size: finalBuffer.length,
      status: "active",
      contentHashHex,
      suiTxDigest: suiDigest,
      suiArchiveId,
      isEncrypted,
    });

  } catch (err: any) {
    console.error("Archive error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "Unknown error",
    });
  }
});

// --- AI Truth Analyst (Powered by Groq) ---
const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1", // Groq API Endpoint
});

// Test the connection on startup
(async () => {
  try {
    console.log("Testing Groq API connection...");
    const testCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10
    });
    console.log("✅ Groq API connection successful!");
  } catch (err: any) {
    console.error("❌ Groq API connection failed:", err?.message);
    console.error("Error details:", { status: err?.status, type: err?.type });
  }
})();

app.post("/api/analyze", async (req, res) => {
  const { text1, text2 } = req.body;

  if (!text1 || !text2) {
    return res.status(400).json({ ok: false, error: "Missing text content" });
  }

  try {
    console.log("----- /api/analyze called -----");
    console.log("Sending diff to Groq...");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert investigative journalist and data forensic analyst. 
          Your job is to analyze the difference between two versions of a web page and expose censorship or spin.
          
          Analyze the changes and return a valid JSON object with this structure:
          {
            "category": "Censorship" | "Correction" | "Update" | "Unknown",
            "summary": "A one-sentence punchy headline about what changed.",
            "details": "A 2-3 sentence explanation of the specific facts that were removed, added, or softened.",
            "impactScore": number (0-10, where 10 is critical facts hidden)
          }`
        },
        {
          role: "user",
          content: `VERSION 1 (Original):\n${text1.substring(0, 10000)}\n\nVERSION 2 (New):\n${text2.substring(0, 10000)}`
        }
      ],
      temperature: 0.3, // Low temp for factual consistency
      response_format: { type: "json_object" } // Force JSON output
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");
    
    console.log("✅ Groq analysis complete:", analysis);
    return res.json({ ok: true, analysis });

  } catch (err: any) {
    console.error("Groq API Error:", err);
    console.error("Error details:", {
      message: err?.message,
      status: err?.status,
      response: err?.response?.data,
      stack: err?.stack
    });
    // Fallback mock response so the demo doesn't crash if API fails
    return res.json({ 
      ok: true, 
      analysis: {
        category: "Unknown",
        summary: "AI Analysis unavailable.",
        details: "Could not connect to the intelligence engine.",
        impactScore: 0
      } 
    });
  }
});

app.listen(PORT, () => {
  console.log(`ArchiveChain backend running on http://localhost:${PORT}`);
});