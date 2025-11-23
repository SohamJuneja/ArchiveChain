# 🛠️ Technical Implementation

This document outlines the engineering stack, deployment architecture, and core logic that powers ArchiveChain.

---

## 💻 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18, Vite, TypeScript | Interactive Viewer & Dashboard |
| **Styling** | Tailwind CSS | Responsive, modern UI design |
| **Browser Ext** | Chrome Manifest V3 | Context-aware capture trigger |
| **Backend** | Node.js, Express | API Orchestration & Remote Capture |
| **Capture Engine** | Puppeteer (Headless Chrome) | Server-side DOM & Screenshot rendering |
| **Blockchain** | Sui Move, Sui TS SDK | Immutable Provenance Registry |
| **Storage** | Walrus Protocol | Decentralized, censorship-resistant storage |
| **AI Intelligence** | Grok (Llama 3.3 70B via xAI) | Semantic difference analysis |
| **Cryptography** | Web Crypto API, Node crypto | Hybrid AES-256 + RSA-OAEP encryption |
| **Utilities** | JSZip, jsPDF, QRCode.js | Compression and Legal Certificate generation |

---

## ☁️ Deployment Architecture

### 1. Frontend (Vercel)

The React viewer is deployed on **Vercel** for global edge delivery.

| Configuration | Value |
|--------------|-------|
| **Build Command** | `npm run build` |
| **Output Directory** | `/dist` |
| **Environment Variables** | `VITE_SUI_NETWORK=testnet` |

**Features:**
- Global CDN distribution
- Automatic HTTPS
- Zero-config deployments

---

### 2. Backend (Render)

The Node.js API is deployed on **Render** (or Railway) as a Web Service.

| Configuration | Details |
|--------------|---------|
| **Runtime** | Node.js |
| **Special Requirement** | Buildpack with Chromium/Puppeteer dependencies (`libnss3`, `libatk`, etc.) |

#### Environment Variables

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | For AI analysis |
| `SUI_PRIVATE_KEY` | To sign transactions minting the Archive objects |
| `SUI_PACKAGE_ID` | The address of our deployed Move contract |

**Infrastructure Notes:**
- Requires Chromium libraries for headless browser operation
- Handles server-side rendering and capture logic
- Manages blockchain transaction signing

---

### 3. Blockchain (Sui Testnet)

| Property | Value |
|----------|-------|
| **Package ID** | `0xe7fc68dde0e6cd9617328a8fc011cc16668807b4b9a950d22ec67653774234de` |
| **Registry Object** | `0x57d3018cdb3a8057147f5f79c1c6572f53cf6f7db8adc7b33d2c7271a1067677` |
| **Status** | Live and verified on SuiScan |

**Verification:**
- Publicly auditable on blockchain explorer
- Immutable provenance records
- Timestamp-certified captures

---

### 4. Storage (Walrus)

**Network:** Walrus Testnet

#### Access Mode

| Operation | Method | Endpoints |
|-----------|--------|-----------|
| **Write** | Direct HTTP PUT | Randomized pool of Publisher Nodes (`publisher-testnet.walrus.space`, `stakely.io`) |
| **Read** | Direct HTTP GET | Aggregator Nodes (`nodes.guru`) |

**Reliability Features:**
- Multi-node failover
- Erasure coding
- Censorship-resistant architecture

---

## ⚙️ Key Engineering Modules

### 1. The "Remote Notary" Capture Engine

**Philosophy:** We do not trust client-side HTML. The capture happens on our server to prevent tampering.

#### Capture Logic

```javascript
// Workflow
1. Backend receives targetUrl
2. Spawns puppeteer browser context
3. Navigates to URL with networkidle2 (waits for dynamic content)
4. Extracts page.content() (Full HTML) and page.screenshot()
5. Bundles assets into an in-memory .zip buffer using JSZip
```

**Key Features:**
- Server-side execution prevents DOM manipulation
- Waits for dynamic content to fully load
- Captures both rendered HTML and visual screenshot
- Creates tamper-proof evidence package

---

### 2. Resilient Walrus Uploader

**Problem:** Walrus Testnet nodes can be intermittent.

**Solution:** Failover Uploader with intelligent retry logic.

#### Implementation Strategy

| Component | Description |
|-----------|-------------|
| **Node Pool** | Backend maintains a list of 4 known public Publisher nodes |
| **Execution** | Iterates through the list (try/catch block) until successful `200 OK` response |
| **Result** | High reliability even during network instability |

**Benefits:**
- Automatic failover
- No single point of failure
- Transparent retry mechanism

---

### 3. Hybrid Encryption (Whistleblower Mode)

To enable secure, zero-knowledge drops, we devised a hybrid cryptosystem.

#### Encryption Workflow

**Client-Side (Journalist):**
- Generates an RSA-2048 Keypair
- Public Key is shared; Private Key is stored in `localStorage`

**Server-Side (Encryption):**
1. Generates a fresh AES-256-GCM key
2. Encrypts the `.zip` payload with AES
3. Encrypts the AES key with the Journalist's RSA Public Key
4. Packs `[IV] + [EncryptedKey] + [EncryptedContent]` into a single binary blob

**Client-Side (Decryption):**
- The Viewer extracts the encrypted AES key
- Decrypts it with the stored Private Key
- Then decrypts the file content

#### Security Properties

| Property | Implementation |
|----------|----------------|
| **Confidentiality** | AES-256-GCM symmetric encryption |
| **Key Protection** | RSA-OAEP asymmetric encryption |
| **Forward Secrecy** | Fresh AES key per archive |
| **Zero Knowledge** | Server cannot read encrypted content |

---

### 4. AI Truth Analysis

We moved beyond simple "diffs" by integrating LLM analysis.

#### Analysis Pipeline

**Input Processing:**
- Strip HTML tags from Version A and Version B to generate raw text

**Prompt Engineering:**
- Treat the AI as a "Forensic Analyst"
- Explicitly ask it to categorize changes as:
  - **"Correction"** - Factual error fixes
  - **"Update"** - New information added
  - **"Censorship"** - Content removal or obfuscation
- Assign a 0-10 impact score based on factual data removal

**Output:**
- Semantic assessment of changes
- Impact severity rating
- Human-readable explanation

---

### 5. Sui Smart Contract Design

Our Move contract (`registry.move`) focuses on **immutability**.

#### Contract Structure

```rust
struct Archive has key, store {
    id: UID,
    url: String,
    walrus_blob_id: String,
    content_hash: vector<u8>,
    captured_at_ms: u64,
    version_number: u64
}
```

#### Immutability Mechanism

**Function:** `public_freeze_object`

- Immediately after creation, the Archive object is frozen
- Makes it impossible for anyone (even the creator) to modify or delete the proof
- Satisfies the "Provably Authentic" requirement

**Security Guarantees:**
- Tamper-proof records
- Permanent timestamp certification
- Cryptographic integrity verification

---

## 🔄 Complete Workflow Integration

### Archive Creation Flow

```
1. User clicks "Archive" in Extension
   ↓
2. Extension sends URL to Backend API
   ↓
3. Puppeteer captures page (HTML + Screenshot)
   ↓
4. Content compressed with JSZip
   ↓
5. [Optional] Hybrid encryption applied
   ↓
6. Upload to Walrus (with failover retry)
   ↓
7. Walrus returns Blob ID
   ↓
8. Sui transaction mints Archive object
   ↓
9. Archive object immediately frozen
   ↓
10. Return confirmation to user
```

### Verification Flow

```
1. User accesses Viewer
   ↓
2. Query Sui for Archive metadata
   ↓
3. Fetch content from Walrus using Blob ID
   ↓
4. Verify SHA-256 hash matches on-chain record
   ↓
5. [If encrypted] Decrypt with private key
   ↓
6. Display content with integrity badge
```

### Comparison Flow

```
1. Select two versions in Viewer
   ↓
2. Fetch both archives from Walrus
   ↓
3. Strip non-visible HTML elements
   ↓
4. Generate visual diff (red/green highlighting)
   ↓
5. Send text diff to Grok AI
   ↓
6. Display semantic analysis + impact score
```

---

## 🔐 Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Client-side tampering** | Server-side capture only |
| **Storage manipulation** | Cryptographic hashing + blockchain proof |
| **Privacy breach** | End-to-end encryption for sensitive content |
| **Timestamp forgery** | Blockchain-certified timestamps |
| **Node failure** | Multi-node failover architecture |

### Trust Boundaries

| Component | Trust Level | Verification Method |
|-----------|-------------|---------------------|
| **Capture** | Trusted Backend | Future: TEE attestation |
| **Storage** | Trustless | Erasure coding + decentralization |
| **Timestamp** | Validator Consensus | Blockchain consensus mechanism |
| **Encryption** | Mathematical | Industry-standard primitives |

---

## 📈 Performance Optimizations

- **Lazy Loading:** Archives loaded on-demand
- **Edge Caching:** Static assets served from CDN
- **Compression:** Level 6 JSZip compression
- **Parallel Uploads:** Non-blocking Walrus operations
- **Browser Reuse:** Puppeteer contexts pooled for efficiency

---

## 🚀 Future Enhancements

- [ ] Trusted Execution Environment (TEE) integration for verifiable capture on Nautilus
- [ ] Browser extension for Firefox and Safari
- [ ] Real-time collaboration features
- [ ] Advanced forensic analysis tools
- [ ] Mainnet deployment
