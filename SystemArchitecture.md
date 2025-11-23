🏗️ System Architecture

ArchiveChain is a decentralized application (dApp) built on a modular architecture separating Capture, Storage, Provenance, and Analysis.

🧩 Component Diagram

graph TD
    %% Frontend Layer
    subgraph "Client Layer"
        Ext[Chrome Extension]
        Viewer[React Viewer App]
    end

    %% Backend Layer
    subgraph "Execution Layer (Node.js)"
        API[Express API]
        Puppeteer[Headless Browser Engine]
        Crypto[Crypto Module (AES/RSA)]
        AI_Service[Grok Integration]
    end

    %% Decentralized Infrastructure
    subgraph "Protocol Layer"
        Walrus[Walrus Network]
        Sui[Sui Blockchain]
    end

    %% Data Flow
    Ext -->|Target URL| API
    API -->|Launch| Puppeteer
    Puppeteer -->|HTML/PNG| API
    API -->|Raw Data| Crypto
    Crypto -->|Zip/Encrypt| Walrus
    Walrus -->|Blob ID| API
    API -->|Mint Object| Sui
    API -->|Analyze| AI_Service
    
    %% Read Path
    Viewer -->|Query| Sui
    Viewer -->|Fetch Blob| Walrus
    Viewer -->|Decrypt| Client_Key[Local Private Key]


1. The Execution Layer (Backend)

Runtime: Node.js (TypeScript)

Role: The trusted oracle/witness.

Key Modules:

Capture Engine: Uses puppeteer to render full DOM and take screenshots. Configured with stealth settings to avoid bot detection.

Compression: Uses jszip (Level 6 compression) to bundle assets.

Uploader: Implements a "Resilient Uploader" that iterates through multiple Walrus Publisher nodes (stakely, nodes.guru, official) to ensure high availability.

Sui Client: Manages the Ed25519 keypair to sign transactions and interact with the Move contract.

2. The Protocol Layer (Blockchain & Storage)

A. Sui (The Registry)

Network: Sui Testnet

Package ID: 0xe7fc68dde0e6cd9617328a8fc011cc16668807b4b9a950d22ec67653774234de

Data Model:

URLRegistry: A shared object that maps a URL string to a vector of Archive IDs.

Archive: An immutable struct containing:

struct Archive has key, store {
    id: UID,
    url: String,
    walrus_blob_id: String, // Link to content
    content_hash: vector<u8>, // SHA-256 Integrity check
    captured_at_ms: u64, // Trustless timestamp
    version_number: u64
}


B. Walrus (The Vault)

Role: Decentralized Blob Storage.

Data Stored: .zip archives containing index.html and screenshot.png.

Access Pattern:

Write: Direct HTTP PUT to Publisher Nodes.

Read: Direct HTTP GET via Aggregator Nodes (using the blobId stored on Sui).

3. The Privacy Layer (Encryption)

We use a Hybrid Cryptosystem to enable the "Whistleblower Drop."

Key Exchange: RSA-OAEP (2048-bit).

Content Encryption: AES-256-GCM.

Process:

AES: A fresh, random 256-bit AES key is generated for every archive.

Encrypt Content: The zip file is encrypted with this AES key.

Encrypt Key: The AES key itself is encrypted using the recipient's RSA Public Key.

Packaging: The payload is structured as a binary buffer:
[IV (16b)] + [AuthTag (16b)] + [KeyLength (2b)] + [Encrypted AES Key] + [Encrypted Content]

4. The Intelligence Layer (AI)

Model: Grok Beta (via xAI API).

Function: Semantic Difference Analysis.

Input: Text_Version_A vs Text_Version_B.

Prompt Engineering: The AI is instructed to act as a "Forensic Analyst" and categorize changes into "Censorship," "Correction," or "Update" based on semantic tone and factual removal.

5. Trust Assumptions

Capture: Users trust the Backend Node to capture the URL honestly (future roadmap: verify this using Nautilus TEEs).

Storage: We trust Walrus availability (erasure coding provides guarantees).

Timestamp: We trust the Sui Validator set for accurate timestamps.

Privacy: We trust standard crypto primitives (AES/RSA); the backend never stores private keys.