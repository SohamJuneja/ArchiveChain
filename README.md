# 🔗 ArchiveChain

**Immutable Web History & Privacy-Preserving Truth Engine**

ArchiveChain is a decentralized web archiving platform that combines blockchain proof, AI analysis, and end-to-end encryption to preserve digital truth. Built on Sui blockchain and Walrus decentralized storage.

## 🌟 Features

### 🌐 Core Functionality
- **Immutable Web Archiving** - Capture full web pages (HTML + screenshots)
- **Decentralized Storage** - Store archives on Walrus network
- **Blockchain Proof** - Cryptographic verification on Sui blockchain
- **Version History** - Track changes over time with SHA-256 hashing
- **Browser Extension** - One-click archiving from any webpage

### 🤖 AI-Powered Analysis
- **Truth Detection** - Automated censorship vs correction analysis
- **Impact Scoring** - 0-10 scale for severity of changes
- **Side-by-Side Diff** - Visual comparison of versions
- **Powered by Groq AI** - Using Llama 3.3 70B model

### 📜 Legal Proof Export
- **Court-Ready PDFs** - Professional certificates with blockchain proof
- **QR Code Verification** - Direct links to Sui blockchain explorer
- **SHA-256 Hashes** - Cryptographic integrity verification
- **Timestamp Proof** - Immutable creation time evidence

### 🔒 Whistleblower Mode (Privacy-Preserving)
- **End-to-End Encryption** - Hybrid AES-256-GCM + RSA-OAEP
- **Zero-Knowledge Architecture** - Backend cannot read sealed content
- **Journalist Keys** - Only intended recipient can decrypt
- **Perfect Forward Secrecy** - Each archive uses unique encryption keys

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser Ext    │────▶│  Backend API     │────▶│  Sui Blockchain │
│  (Archive UI)   │     │  (Node.js)       │     │  (Proof Layer)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Walrus Network  │
                        │  (Storage Layer) │
                        └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Sui CLI (for contract deployment)
- Walrus testnet access

### 1. Clone & Install

```bash
git clone https://github.com/SohamJuneja/archivechain.git
cd archivechain

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key
SUI_PACKAGE_ID=your_package_id
SUI_REGISTRY_ID=your_registry_id
SUI_PRIVATE_KEY=suiprivkey1...
PORT=4000
```

Get a free Groq API key at https://console.groq.com

### 3. Run Backend

```bash
cd backend
npm run build
npm start
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

### 5. Load Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

## 🎯 Usage

### Public Archiving
1. Visit any webpage
2. Click ArchiveChain extension
3. Click "Archive this page"
4. View in ArchiveViewer at http://localhost:5173

### Sealed Archiving (Whistleblower Mode)
1. Open ArchiveViewer → Copy your public key
2. Share public key with whistleblower
3. Whistleblower clicks "🔒 Sealed" in extension
4. Paste public key → Archive
5. Only you can decrypt with your private key

### AI Analysis
1. Search for URL in ArchiveViewer
2. Enable "Comparison Mode"
3. Select 2 versions
4. Click "⚡ Run Diff"
5. View AI-powered truth analysis

## 📁 Project Structure

```
archivechain/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── server.ts     # Main API & encryption logic
│   │   └── suiClient.ts  # Sui blockchain integration
│   └── package.json
├── frontend/             # React viewer application
│   ├── src/
│   │   ├── components/
│   │   │   └── ArchiveViewer.tsx
│   │   └── utils/
│   │       ├── crypto.ts          # Encryption utilities
│   │       └── generateCertificate.ts
│   └── package.json
├── extension/            # Chrome browser extension
│   ├── manifest.json
│   ├── popup.html
│   └── popup.js
└── contracts/           # Sui Move smart contracts
    └── archivechain/
        └── sources/
            └── registry.move
```

## 🔐 Security

### Encryption
- **AES-256-GCM** for content (authenticated encryption)
- **RSA-OAEP 2048-bit** for key exchange
- **SHA-256** for content integrity
- **Random IV** per encryption operation

### Key Management
- Private keys stored in browser localStorage
- Public keys shareable via copy-paste
- No keys transmitted to backend
- Perfect forward secrecy (ephemeral AES keys)

### Threat Model
✅ Backend compromise → Sealed archives remain encrypted  
✅ Network interception → Content encrypted in transit  
✅ Censorship attempts → Walrus provides redundancy  
✅ Data tampering → Blockchain proof detects changes

## 🧪 Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: Sui (Move smart contracts)
- **Storage**: Walrus decentralized network
- **AI**: Groq (Llama 3.3 70B)
- **Encryption**: Web Crypto API, Node.js crypto
- **PDF**: jsPDF, QRCode.js

## 📊 Smart Contract

The Sui Move contract (`contracts/archivechain/sources/registry.move`) manages:
- Archive metadata storage
- Version tracking
- Content hash verification
- Timestamp immutability

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT License - see LICENSE file

## 🏆 Hackathon Tracks

- ✅ **Data Security & Privacy** - End-to-end encryption for whistleblowers
- ✅ **Decentralized Storage** - Walrus for censorship resistance
- ✅ **Blockchain Integration** - Sui for immutable proof
- ✅ **AI/ML** - Automated truth detection

## 🔗 Links

- [Sui Explorer](https://suiscan.xyz/testnet)
- [Walrus Docs](https://docs.walrus.site)
- [Project Demo](#)

---

Built with ❤️ for Web3 Hackathon 2025
