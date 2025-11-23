🛠️ Technical Implementation

This document outlines the engineering stack, deployment architecture, and core logic that powers ArchiveChain.

💻 Technology Stack

Component

Technology

Purpose

Frontend

React 18, Vite, TypeScript

Interactive Viewer & Dashboard

Styling

Tailwind CSS

Responsive, modern UI design

Browser Ext

Chrome Manifest V3

Context-aware capture trigger

Backend

Node.js, Express

API Orchestration & Remote Capture

Capture Engine

Puppeteer (Headless Chrome)

Server-side DOM & Screenshot rendering

Blockchain

Sui Move, Sui TS SDK

Immutable Provenance Registry

Storage

Walrus Protocol

Decentralized, censorship-resistant storage

AI Intelligence

Grok (Llama 3.3 70B via xAI)

Semantic difference analysis

Cryptography

Web Crypto API, Node crypto

Hybrid AES-256 + RSA-OAEP encryption

Utilities

JSZip, jsPDF, QRCode.js

Compression and Legal Certificate generation

☁️ Deployment Architecture

1. Frontend (Vercel)

The React viewer is deployed on Vercel for global edge delivery.

Build Command: npm run build

Output: /dist

Env Vars: VITE_SUI_NETWORK=testnet

2. Backend (Render)

The Node.js API is deployed on Render (or Railway) as a Web Service.

Runtime: Node.js

Special Requirement: Requires a buildpack with Chromium/Puppeteer dependencies (libnss3, libatk, etc.) to run the headless browser.

Environment Variables:

GROQ_API_KEY: For AI analysis.

SUI_PRIVATE_KEY: To sign transactions minting the Archive objects.

SUI_PACKAGE_ID: The address of our deployed Move contract.

3. Blockchain (Sui Testnet)

Package ID: 0xe7fc68dde0e6cd9617328a8fc011cc16668807b4b9a950d22ec67653774234de

Registry Object: 0x57d3018cdb3a8057147f5f79c1c6572f53cf6f7db8adc7b33d2c7271a1067677

Status: Live and verified on SuiScan.

4. Storage (Walrus)

Network: Walrus Testnet

Access Mode:

Write: Direct HTTP PUT to a randomized pool of Publisher Nodes (e.g., publisher-testnet.walrus.space, stakely.io).

Read: Direct HTTP GET via Aggregator Nodes (e.g., nodes.guru).

⚙️ Key Engineering Modules

1. The "Remote Notary" Capture Engine

We do not trust client-side HTML. The capture happens on our server to prevent tampering.

Logic:

Backend receives targetUrl.

Spawns puppeteer browser context.

Navigates to URL with networkidle2 (waits for dynamic content).

Extracts page.content() (Full HTML) and page.screenshot().

Bundles assets into an in-memory .zip buffer using JSZip.

2. Resilient Walrus Uploader

Walrus Testnet nodes can be intermittent. We implemented a Failover Uploader:

Strategy: The backend maintains a list of 4 known public Publisher nodes.

Execution: It iterates through the list (try/catch block) until a successful 200 OK response is received.

Result: High reliability even during network instability.

3. Hybrid Encryption (Whistleblower Mode)

To enable secure, zero-knowledge drops, we devised a hybrid cryptosystem:

Client-Side (Journalist): Generates an RSA-2048 Keypair. Public Key is shared; Private Key is stored in localStorage.

Server-Side (Encryption):

Generates a fresh AES-256-GCM key.

Encrypts the .zip payload with AES.

Encrypts the AES key with the Journalist's RSA Public Key.

Packs [IV] + [EncryptedKey] + [EncryptedContent] into a single binary blob.

Client-Side (Decryption): The Viewer extracts the encrypted AES key, decrypts it with the stored Private Key, and then decrypts the file content.

4. AI Truth Analysis

We moved beyond simple "diffs" by integrating LLM analysis.

Input: We strip HTML tags from Version A and Version B to generate raw text.

Prompt Engineering: We treat the AI as a "Forensic Analyst," explicitly asking it to categorize changes as "Correction," "Update," or "Censorship" and assign a 0-10 impact score based on factual data removal.

5. Sui Smart Contract Design

Our Move contract (registry.move) focuses on immutability.

Archive Struct: Contains the walrus_blob_id, content_hash, and timestamp.

public_freeze_object: Immediately after creation, the Archive object is frozen. This makes it impossible for anyone (even the creator) to modify or delete the proof, satisfying the "Provably Authentic" requirement.