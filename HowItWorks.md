# ⚙️ How ArchiveChain Works

ArchiveChain operates on a **"Remote Notary" model**. Unlike traditional web archivers where the user uploads a file (which can be faked), ArchiveChain relies on a decentralized node to visit, capture, and sign the content. This ensures that what is stored is exactly what the server served.

---

## 🔄 The Archival Workflow

### 1. The Trigger

The user visits a webpage and clicks **"Archive"** in the ArchiveChain Extension.

- **Data Sent:** The extension sends the target URL (e.g., `https://example.com`) to our backend.
- **Security:** It does not send the HTML from the user's browser, preventing the user from editing the DOM (Inspect Element) to forge evidence.

### 2. The Remote Capture (The Witness)

Our decentralized backend (Node.js) acts as the witness.

- **Headless Browser:** It launches an isolated instance of Puppeteer (Chrome).
- **Navigation:** It visits the URL directly.
- **Snapshot:** It captures:
  - The full rendered HTML (DOM state)
  - A full-page screenshot (PNG)
- **Packaging:** These assets are bundled into a single `.zip` file.

### 3. The Fingerprint

Before storage, we establish the file's identity.

- **Hashing:** We compute a SHA-256 hash of the zip file.
- **Purpose:** This hash allows us to mathematically verify later that the data stored on Walrus has not been altered by a single byte.

### 4. Immutable Storage (Walrus)

We store the heavy data on the **Walrus Decentralized Network**.

- **Upload:** The zip file is uploaded directly to a Walrus Publisher Node.
- **Blob ID:** Walrus returns a unique Blob ID (e.g., `2Vf...`).
- **Resilience:** Because Walrus uses erasure coding across many nodes, this data cannot be deleted by a central administrator or lost due to server failure.

### 5. Cryptographic Proof (Sui)

This is the **"Notarization"** step. We create an on-chain record on the Sui blockchain.

- **The Transaction:** We call the `create_archive` function in our Move smart contract.
- **The Data:** We submit the URL, Timestamp (Sui Clock), SHA-256 Hash, and Walrus Blob ID.
- **The Freeze:** The resulting Sui Object is frozen (made immutable). It creates a permanent, public, timestamped proof that this content existed at this second.

---

## 🕵️ The Whistleblower Flow (Privacy Mode)

When a user toggles **"Secure Mode,"** the workflow changes to protect the source.

### Key Exchange

The recipient (Journalist) generates an RSA Keypair in their browser. They share the Public Key.

### Encryption

The backend receives the Public Key. Instead of just zipping the content, it performs **Hybrid Encryption:**

- A one-time AES-256 key encrypts the zip file
- The Public Key encrypts the AES key

### Dead Drop

The encrypted blob is stored on Walrus. It is mathematically impossible for the backend, Walrus nodes, or the public to read it.

### Decryption

Only the Journalist (holder of the Private Key) can unlock the file in the ArchiveViewer.

---

## 🤖 The Truth Analysis

When a user compares two versions, we don't just show code.

1. **Fetch:** The viewer retrieves both blobs from Walrus.
2. **Clean:** We strip non-visible code (scripts, styles) to isolate human-readable text.
3. **Diff:** We generate a visual difference (Red vs Green).
4. **Analyze:** We send the diff to Grok (AI). The AI analyzes the semantic meaning of the changes to determine if the intent was "Correction," "Update," or "Censorship."

---

## 🔐 Security Summary

| Component | Security Feature |
|-----------|------------------|
| **Capture** | Remote witness prevents DOM tampering |
| **Storage** | Erasure coding across decentralized nodes |
| **Integrity** | SHA-256 cryptographic fingerprinting |
| **Proof** | Immutable blockchain timestamp on Sui |
| **Privacy** | RSA + AES-256 hybrid encryption |

---

## 📊 Technology Stack

- **Backend:** Node.js
- **Browser Automation:** Puppeteer (Headless Chrome)
- **Storage:** Walrus Decentralized Network
- **Blockchain:** Sui (Move smart contracts)
- **Encryption:** RSA + AES-256
- **Hashing:** SHA-256
- **AI Analysis:** Grok
