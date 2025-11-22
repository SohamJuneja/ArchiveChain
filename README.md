<div align="center">
<h1>🔗 ArchiveChain</h1>
<h3>The Immutable Truth Engine for the Decentralized Web</h3>

<p>
<b>Capture. Seal. Prove.</b>




A censorship-resistant archiving platform powered by <b>Walrus</b>, <b>Sui</b>, and <b>AI</b>.
</p>

<div>
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Storage-Walrus-blue%3Fstyle%3Dfor-the-badge%26logo%3Dipfs" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Blockchain-Sui_Testnet-4ea8de%3Fstyle%3Dfor-the-badge%26logo%3Dsui" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/AI-Grok_Beta-orange%3Fstyle%3Dfor-the-badge%26logo%3Dopenai" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Security-AES_256_%2B_RSA-success%3Fstyle%3Dfor-the-badge%26logo%3Dlock" />
</div>
</div>

🚨 The Problem: The "Silent Edit"

In the digital age, history is malleable.

Consider this scenario: A news outlet publishes a report on corporate corruption. Two hours later, under legal pressure, the article is quietly "updated." The incriminating paragraphs about toxic waste dumping are removed. The URL remains the same. The timestamp says "Updated."

The truth has vanished, and there is no proof it ever existed.

Existing solutions like the Wayback Machine are centralized. They can be pressured, sued, or technically blocked from crawling specific sites. They are not a permanent record; they are a polite library.

🛡️ The Solution: ArchiveChain

ArchiveChain is not just a "Save Page" tool. It is a decentralized cryptographic notary. It turns transient web content into permanent, verifiable evidence.

We decouple the Storage of Truth (Walrus) from the Proof of Truth (Sui) to create a system that is impossible to censor and mathematically impossible to fake.

🏆 Target Track: Provably Authentic

ArchiveChain is built specifically for the Provably Authentic (Truth Engine) track. We verify the provenance of media (web pages) by creating an unbroken chain of custody from the moment of capture.

How we guarantee Authenticity:

Server-Side Capture: We don't trust the client. Our decentralized backend launches an isolated browser (Puppeteer) to visit the URL, ensuring the content captured is exactly what the server served, not what a user manipulated in their DOM.

Cryptographic Hashing: Every pixel and character is hashed (SHA-256) immediately upon capture.

Immutable Registry: We mint a Sui Object representing the archive. This object is frozen (made immutable), locking the content hash and timestamp forever on the blockchain.

Decentralized Permanence: The data itself is stored on Walrus. Unlike AWS or Google Drive, Walrus blobs cannot be deleted by a central admin. If the data exists, it is authentic.

🏗️ Why Walrus? (The Critical Piece)

ArchiveChain could not exist without Walrus. Here is why we chose it over IPFS or AWS:

1. True Censorship Resistance

Centralized storage (AWS S3) has a "Delete" button. If a government issues a takedown request, the evidence is gone. Walrus stores data across a decentralized network of nodes. Once a blob is certified, it is resilient. We need this property to protect whistleblowers.

2. Cost-Effective Permanence

Storing high-fidelity web archives (HTML + Screenshots) is data-heavy. Storing this directly on-chain (Sui/Solana) is prohibitively expensive ($100s per MB). Walrus allows us to store gigabytes of evidence for pennies, while keeping the proof (metadata) on the high-speed Sui chain.

3. The "Blob ID" as a Trust Anchor

Walrus Blob IDs are cryptographic. If the content changes, the ID changes. This means the Sui Smart Contract can reference a Walrus Blob ID and mathematically guarantee that that specific file was the one verified at that specific time.

✨ Key Features

⚡ 1. Visual Diff & Time Travel

We don't just show you the archive; we show you the history.

Timeline View: Browse every version of a page ever captured.

Visual Diffing: Select any two versions (e.g., "Before Censorship" vs. "After Censorship"). Our engine highlights exactly what text was added (Green) or removed (Red).

HTML-Cleaned Comparison: We strip away code noise (scripts, styles) to show only the semantic changes in the human-readable text.

🤖 2. AI Truth Analyst (Powered by Grok)

Raw diffs can be confusing. We integrate Grok (Llama 3 70B) to act as an automated investigative journalist.

Semantic Analysis: The AI reads the diff and determines the intent of the change.

Truth Scoring: Was it a typo fix? (Score: 0/10). Or was it the removal of a specific allegation? (Score: 10/10).

Output: "Critical information regarding 'Chemical Spill' was removed from the second paragraph."

🕵️‍♂️ 3. The "Whistleblower Drop" (Privacy Mode)

Sometimes, the truth is dangerous.

The Use Case: A whistleblower wants to archive a leaked internal memo, but cannot publish it publicly yet without putting themselves at risk.

The Tech: We use Hybrid Encryption (AES-256-GCM + RSA-OAEP).

The Flow:

A journalist generates a Keypair in the ArchiveChain Viewer.

They share their Public Key.

The whistleblower pastes this key into the ArchiveChain Extension.

The archive is encrypted client-side and stored on Walrus.

Only the journalist can decrypt and view the evidence using their private key. Use Walrus as a secure "Dead Drop."

📜 4. Legal Proof Export

Journalists and lawyers need more than a web link.

Certificate Generation: We generate a cryptographically signed PDF.

Contains: The screenshot, the SHA-256 hash, the Walrus Blob ID, and a QR Code linking to the immutable Sui Transaction.

Admissibility: This document serves as a digital affidavit of what the web page looked like at a specific millisecond in time.

🧪 Technical Architecture

graph TD
    User[User / Extension] -->|1. Request Archive| Backend[Node.js Backend]
    Backend -->|2. Capture (Puppeteer)| Content[HTML + Screenshot]
    
    subgraph "Security Layer"
    Content -->|3. Zip & Hash| Zip[Archive.zip]
    Zip -->|4. Hybrid Encryption (Optional)| Sealed[Sealed Blob]
    end
    
    subgraph "Decentralized Storage"
    Sealed -->|5. Store Blob| Walrus[Walrus Network]
    Walrus -->|6. Return Blob ID| Backend
    end
    
    subgraph "Trust Layer"
    Backend -->|7. Mint Object| Sui[Sui Smart Contract]
    Sui -->|8. Immutable Proof| Registry[https://www.myregistry.com/us/en/](https://www.myregistry.com/us/en/)
    end


Tech Stack

Frontend: React, Vite, Tailwind CSS, JSZip, jsPDF.

Backend: Node.js, Express, Puppeteer (Headless Chrome).

Blockchain: Sui Move (Smart Contracts), Sui TypeScript SDK.

Storage: Walrus (Direct Publisher Upload).

AI: Grok (via xAI API).

🚀 Getting Started

Prerequisites

Node.js 18+

Sui Wallet (Testnet)

1. Installation

git clone [https://github.com/SohamJuneja/archivechain.git](https://github.com/SohamJuneja/archivechain.git)
cd archivechain

# Install Backend
cd backend
npm install

# Install Frontend
cd ../frontend
npm install


2. Configuration

Create a .env file in /backend:

# AI Analysis
GROQ_API_KEY=your_grok_key_here

# Sui Blockchain Config
SUI_PACKAGE_ID=0xe7fc68dde0e6cd9617328a8fc011cc16668807b4b9a950d22ec67653774234de
SUI_REGISTRY_ID=0x57d3018cdb3a8057147f5f79c1c6572f53cf6f7db8adc7b33d2c7271a1067677
SUI_PRIVATE_KEY=your_sui_private_key
PORT=4000


3. Running the System

Terminal 1 (Backend):

cd backend
npm run build
npm run dev


Terminal 2 (Frontend):

cd frontend
npm run dev


4. Loading the Extension

Open Chrome -> chrome://extensions/

Enable Developer Mode.

Click Load Unpacked.

Select the /extension folder in this repo.

🔮 Future Roadmap

Nautilus Integration: Moving the Puppeteer capture engine into an AWS Nitro Enclave (TEE). This would allow us to cryptographically prove that the server didn't tamper with the screenshot before hashing it, closing the final trust gap.

Seal Protocol Integration: While our current RSA implementation works for P2P drops, we plan to integrate Seal to enable Time-Locked Archives (e.g., "Unlock this evidence automatically if I don't check in within 30 days").

<div align="center">
<p>Built with ❤️ for the <b>Walrus Haulout Hackathon