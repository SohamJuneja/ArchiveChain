import { useState, useEffect } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import JSZip from 'jszip';
import * as Diff from 'diff';
import { generateCertificate } from '../utils/generateCertificate';
import { generateKeyPair, exportKey, exportPrivateKey, importPrivateKey } from '../utils/crypto';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
// 🔥 KEEP YOUR REGISTRY ID HERE
const REGISTRY_ID = "0x57d3018cdb3a8057147f5f79c1c6572f53cf6f7db8adc7b33d2c7271a1067677"; 

type ArchiveObject = {
  id: string;
  url: string;
  title: string;
  realVersion: number; // The numbering 1, 2, 3...
  capturedAtMs: string;
  walrusBlobId: string;
  tuskyFileId: string;
  contentHash: string; // SHA-256 hash from blockchain
  objectId: string; // Sui object ID for explorer links
};

export function ArchiveViewer() {
  const [searchUrl, setSearchUrl] = useState(''); // Start empty
  const [versions, setVersions] = useState<ArchiveObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  
  // Viewer States
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  
  // Comparison States
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<ArchiveObject[]>([]);
  const [diffResult, setDiffResult] = useState<Diff.Change[] | null>(null);
  
  // [NEW] AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<{
    category: string;
    summary: string;
    details: string;
    impactScore: number;
  } | null>(null);

  // [NEW] Journalist Keypair State
  const [journalistPublicKey, setJournalistPublicKey] = useState<string | null>(null);
  const [journalistPrivateKey, setJournalistPrivateKey] = useState<CryptoKey | null>(null);

  // [NEW] Generate Journalist Keypair on Mount
  useEffect(() => {
    const initKeypair = async () => {
      try {
        // Check if we have saved keys in localStorage
        const savedPrivateKey = localStorage.getItem('journalist_private_key');
        const savedPublicKey = localStorage.getItem('journalist_public_key');
        
        if (savedPrivateKey && savedPublicKey) {
          // Import existing keys
          const privateKey = await importPrivateKey(savedPrivateKey);
          setJournalistPrivateKey(privateKey);
          setJournalistPublicKey(savedPublicKey);
          console.log("🔑 Loaded existing journalist keypair from storage");
          console.log("🔑 Public Key (first 50 chars):", savedPublicKey.substring(0, 50));
        } else {
          // Generate new keypair
          const keyPair = await generateKeyPair();
          const publicKey = await exportKey(keyPair.publicKey);
          const privateKey = await exportPrivateKey(keyPair.privateKey);
          
          setJournalistPublicKey(publicKey);
          setJournalistPrivateKey(keyPair.privateKey);
          
          // Save both keys to localStorage
          localStorage.setItem('journalist_private_key', privateKey);
          localStorage.setItem('journalist_public_key', publicKey);
          console.log("🔑 Generated new journalist keypair and saved to storage");
          console.log("🔑 Public Key (first 50 chars):", publicKey.substring(0, 50));
        }
      } catch (err) {
        console.error("Failed to initialize keypair:", err);
      }
    };
    
    initKeypair();
  }, []);

  // [NEW] Helper: Clean HTML to get human-readable text
  const cleanText = (htmlString: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    // Remove scripts, styles, SVGs, and meta tags to clean up the noise
    const junk = doc.querySelectorAll('script, style, svg, meta, link, noscript');
    junk.forEach(el => el.remove());
    
    // Get text content and collapse whitespace
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() || "";
  };

  // 1. SEARCH
  const findArchives = async () => {
    if (!searchUrl) {
      setStatusMsg("Please enter a URL.");
      return;
    }

    setIsLoading(true);
    setStatusMsg("Scanning provenance chain...");
    setVersions([]);
    setSelectedContent(null);
    setDiffResult(null);
    setCompareSelection([]);

    try {
      const registryObj = await suiClient.getObject({ id: REGISTRY_ID, options: { showContent: true } });
      
      if (registryObj.data?.content?.dataType !== 'moveObject') throw new Error("Invalid Registry Object");
      const fields = registryObj.data.content.fields as any;
      const archiveIds = fields.all_archive_ids;

      if (!archiveIds || archiveIds.length === 0) {
        setStatusMsg("No archives found on chain.");
        setIsLoading(false);
        return;
      }

      const archiveObjects = await suiClient.multiGetObjects({ ids: archiveIds, options: { showContent: true } });
      
      // [FIXED] Filter by URL and Re-number
      const rawList: ArchiveObject[] = [];
      
      archiveObjects.forEach((obj) => {
        if (obj.data?.content?.dataType === 'moveObject') {
          const f = obj.data.content.fields as any;
          // ONLY add if the URL matches the search (normalization helps)
          if (f.url.includes(searchUrl.replace("https://", "").replace("http://", "").split('/')[0])) {
            // Convert content_hash vector<u8> back to hex string
            let contentHashHex = "0x";
            if (f.content_hash && Array.isArray(f.content_hash)) {
              contentHashHex += f.content_hash.map((byte: number) => byte.toString(16).padStart(2, '0')).join('');
            }
            
            rawList.push({
              id: obj.data.objectId,
              url: f.url,
              title: f.title,
              realVersion: 0, // Will assign momentarily
              capturedAtMs: f.captured_at_ms,
              walrusBlobId: f.walrus_blob_id,
              tuskyFileId: f.tusky_file_id,
              contentHash: contentHashHex,
              objectId: obj.data.objectId,
            });
          }
        }
      });

      // Sort Oldest -> Newest to assign version numbers
      rawList.sort((a, b) => parseInt(a.capturedAtMs) - parseInt(b.capturedAtMs));
      
      // Assign version numbers sequentially
      rawList.forEach((v, index) => v.realVersion = index + 1);

      // Reverse for display (Newest first)
      setVersions(rawList.reverse());
      
      if (rawList.length === 0) {
        setStatusMsg("No archives found for this specific URL.");
      } else {
        setStatusMsg(null);
      }

    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
    setIsLoading(false);
  };

  // [NEW] Helper: Decrypt Sealed Blob
  const decryptSealedBlob = async (blob: Blob, privateKey: CryptoKey): Promise<Blob> => {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    
    // Unpack structure: [IV (16)] + [AuthTag (16)] + [KeyLength (2)] + [EncryptedKey] + [Content]
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const keyLength = view.getUint16(32, false); // Big Endian
    const encryptedKey = buffer.slice(34, 34 + keyLength);
    const content = buffer.slice(34 + keyLength);

    // 1. Decrypt AES Key
    const aesKeyRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedKey
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw", 
      aesKeyRaw, 
      "AES-GCM", 
      true, 
      ["decrypt"]
    );

    // 2. Decrypt Content
    // Web Crypto AES-GCM expects tag appended to ciphertext
    const contentWithTag = new Uint8Array(content.byteLength + 16);
    contentWithTag.set(new Uint8Array(content));
    contentWithTag.set(new Uint8Array(authTag), content.byteLength);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      aesKey,
      contentWithTag
    );

    return new Blob([decryptedBuffer]);
  };

  // Helper: Fetch HTML content (with automatic decryption for sealed archives)
  const fetchHtml = async (version: ArchiveObject): Promise<string> => {
    if (version.walrusBlobId === "unknown") throw new Error(`Version ${version.realVersion} is pending (Blob ID unknown)`);
    
    const isSealed = version.title.includes("🔒");
    
    const AGGREGATORS = [
      "https://walrus-testnet-aggregator.nodes.guru",
      "https://walrus-testnet-aggregator.stakely.io",
      "https://aggregator.walrus-testnet.walrus.space",
      "https://testnet-walrus-aggregator.staketab.org"
    ];

    for (const baseUrl of AGGREGATORS) {
      try {
        console.log(`Trying aggregator: ${baseUrl}`);
        const url = `${baseUrl}/v1/blobs/${version.walrusBlobId}`;
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`${baseUrl} returned status ${response.status}`);
          continue;
        }
        
        let blob = await response.blob();
        
        // [NEW] Decrypt if sealed
        if (isSealed) {
          if (!journalistPrivateKey) {
            throw new Error("🔒 This archive is sealed. Private key not available.");
          }
          console.log("🔓 Decrypting sealed archive...");
          try {
            blob = await decryptSealedBlob(blob, journalistPrivateKey);
            console.log("✅ Archive decrypted successfully!");
          } catch (decryptErr: any) {
            throw new Error(`🔒 Decryption failed: ${decryptErr.message}. This archive may not be intended for your key.`);
          }
        }
        
        try {
          const zip = await JSZip.loadAsync(blob);
          const html = await zip.file("index.html")?.async("string");
          console.log(`✅ Successfully fetched from ${baseUrl}`);
          return html || "Error: index.html missing";
        } catch {
          return await blob.text();
        }
      } catch (err) { 
        console.warn(`${baseUrl} failed:`, err);
        continue; 
      }
    }
    throw new Error("Could not fetch content from any node.");
  };

  // 2. LOAD SINGLE VERSION
  const loadSingle = async (version: ArchiveObject) => {
    setIsLoading(true);
    const isSealed = version.title.includes("🔒");
    setStatusMsg(isSealed ? `🔓 Decrypting Version ${version.realVersion}...` : `Loading Version ${version.realVersion}...`);
    setDiffResult(null);
    try {
      const html = await fetchHtml(version);
      setSelectedContent(html);
      setStatusMsg(isSealed ? `✅ Decrypted Version ${version.realVersion}` : `Loaded Version ${version.realVersion}`);
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
      setSelectedContent(null);
      console.error("Load error:", err);
    }
    setIsLoading(false);
  };

  // 3. RUN COMPARISON
  const runComparison = async () => {
    if (compareSelection.length !== 2) return;
    setIsLoading(true);
    setStatusMsg("Analyzing differences...");
    setSelectedContent(null);
    setAiAnalysis(null);

    try {
      const [vNew, vOld] = compareSelection.sort((a, b) => b.realVersion - a.realVersion);
      
      const [htmlNew, htmlOld] = await Promise.all([fetchHtml(vNew), fetchHtml(vOld)]);
      
      // [FIXED] Clean the text before diffing
      const textOld = cleanText(htmlOld);
      const textNew = cleanText(htmlNew);
      
      const diff = Diff.diffWords(textOld, textNew); // Use diffWords for better readability
      setDiffResult(diff);
      setStatusMsg(`Comparing V${vOld.realVersion} -> V${vNew.realVersion}`);
      
      // [NEW] Call AI Analysis
      try {
        const aiResponse = await fetch('http://localhost:4000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text1: textOld, text2: textNew })
        });
        const aiData = await aiResponse.json();
        if (aiData.ok && aiData.analysis) {
          setAiAnalysis(aiData.analysis);
        }
      } catch (aiErr) {
        console.warn('AI analysis failed:', aiErr);
      }
      
    } catch (err: any) {
      setStatusMsg(`Comparison failed: ${err.message}`);
    }
    setIsLoading(false);
  };

  const toggleSelection = (v: ArchiveObject) => {
    if (compareSelection.find(i => i.id === v.id)) {
      setCompareSelection(compareSelection.filter(i => i.id !== v.id));
    } else {
      if (compareSelection.length < 2) setCompareSelection([...compareSelection, v]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 pb-6 border-b border-slate-700/50 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent mb-2">
              ArchiveChain Viewer
            </h1>
            <p className="text-slate-400 text-sm">
              🔗 Immutable Web History & Cryptographic Provenance
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
            <span className="text-sm font-semibold text-slate-300">Comparison Mode</span>
            <button 
              onClick={() => { setIsCompareMode(!isCompareMode); setCompareSelection([]); setDiffResult(null); setSelectedContent(null); }}
              className={`relative w-14 h-7 rounded-full p-1 transition-all duration-300 ${isCompareMode ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-slate-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${isCompareMode ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
          </div>
        </header>

        {/* [NEW] Journalist Key Panel */}
        {journalistPublicKey && (
          <div className="mb-6 bg-gradient-to-r from-purple-950/40 to-blue-950/40 border-2 border-purple-500/50 rounded-xl p-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🕵️</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-purple-300 mb-2 flex items-center gap-2">
                  <span>🔑</span>
                  Journalist Mode Active
                </h3>
                <p className="text-sm text-slate-300 mb-3">
                  You can decrypt sealed archives. Share your public key with whistleblowers to receive encrypted evidence.
                </p>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400">YOUR PUBLIC KEY (Share This):</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(journalistPublicKey);
                        alert("✅ Public key copied to clipboard!");
                      }}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all block">
                    {journalistPublicKey.substring(0, 120)}...
                  </code>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  💡 Your private key is stored securely in browser localStorage. Only you can decrypt sealed archives sent to this key.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            value={searchUrl} 
            onChange={(e) => setSearchUrl(e.target.value)} 
            className="flex-grow p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
            placeholder="Enter exact URL (e.g. https://daily-chronicle.vercel.app)" 
          />
          <button onClick={findArchives} disabled={isLoading} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/30">
            {isLoading ? '🔍 Searching...' : '🔍 Search Registry'}
          </button>
        </div>

        {statusMsg && (
          <div className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
            statusMsg.includes('Error') || statusMsg.includes('❌')
              ? 'bg-red-950/50 border-red-800/50 text-red-300' 
              : 'bg-blue-950/50 border-blue-800/50 text-blue-300'
          }`}>
            {statusMsg}
          </div>
        )}

        {/* [DEBUG] Encryption Stats */}
        {versions.length > 0 && (
          <div className="mb-4 bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 text-xs">
            <div className="flex gap-4">
              <span className="text-slate-400">
                Total Archives: <span className="text-white font-bold">{versions.length}</span>
              </span>
              <span className="text-slate-400">
                🔒 Sealed: <span className="text-purple-400 font-bold">{versions.filter(v => v.title.includes("🔒")).length}</span>
              </span>
              <span className="text-slate-400">
                📢 Public: <span className="text-blue-400 font-bold">{versions.filter(v => !v.title.includes("🔒")).length}</span>
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 h-[700px]">
          <div className="col-span-3 bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col shadow-xl">
            <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50 flex justify-between items-center">
              <span className="font-bold text-slate-200">📜 Version History</span>
              {isCompareMode && compareSelection.length === 2 && (
                <button onClick={runComparison} className="text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-all shadow-lg shadow-green-900/30">
                  ⚡ Run Diff
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {versions.filter(v => v.walrusBlobId !== 'unknown').map((v) => (
                <div key={v.id} 
                  onClick={() => isCompareMode ? toggleSelection(v) : loadSingle(v)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                    isCompareMode && compareSelection.find(i => i.id === v.id) 
                      ? 'border-cyan-500 bg-cyan-950/40 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-900/30' 
                      : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">Version {v.realVersion}</span>
                      {v.title.includes("🔒") && (
                        <span className="text-lg">🔒</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {v.title.includes("🔒") && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1 font-bold">
                          <span className="text-[8px]">🔒</span> SEALED
                        </span>
                      )}
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                        <span className="text-[8px]">⚓️</span> Verified
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {new Date(parseInt(v.capturedAtMs)).toLocaleString()}
                    {v.title.includes("🔒") && (
                      <div className="text-purple-400 font-semibold mt-1">🔐 Encrypted Archive</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateCertificate(
                        v.url,
                        v.realVersion,
                        v.capturedAtMs,
                        v.objectId, // Using object ID as transaction reference
                        v.contentHash,
                        v.walrusBlobId
                      );
                    }}
                    className="text-[10px] flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300 transition-colors w-full justify-center"
                  >
                    <span>📜</span> Legal Proof
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-9 bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden relative shadow-xl">
            {!isCompareMode && selectedContent && (
              <iframe srcDoc={selectedContent} title="Content" className="w-full h-full bg-white" sandbox="" />
            )}

            {isCompareMode && diffResult && (
              <div className="w-full h-full overflow-auto bg-slate-950 p-6">
                {/* [NEW] AI Truth Card */}
                {aiAnalysis && (
                  <div className={`mb-6 rounded-xl border-2 p-6 ${
                    aiAnalysis.category === 'Censorship' ? 'bg-red-950/40 border-red-500' :
                    aiAnalysis.category === 'Correction' ? 'bg-blue-950/40 border-blue-500' :
                    aiAnalysis.category === 'Update' ? 'bg-green-950/40 border-green-500' :
                    'bg-slate-800/40 border-slate-600'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">
                        {aiAnalysis.category === 'Censorship' ? '🚨' :
                         aiAnalysis.category === 'Correction' ? '✅' :
                         aiAnalysis.category === 'Update' ? '📝' : '🤔'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            aiAnalysis.category === 'Censorship' ? 'bg-red-500/30 text-red-200 border border-red-500' :
                            aiAnalysis.category === 'Correction' ? 'bg-blue-500/30 text-blue-200 border border-blue-500' :
                            aiAnalysis.category === 'Update' ? 'bg-green-500/30 text-green-200 border border-green-500' :
                            'bg-slate-600/30 text-slate-300 border border-slate-600'
                          }`}>
                            {aiAnalysis.category.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Impact Score:</span>
                            <div className="flex gap-1">
                              {[...Array(10)].map((_, i) => (
                                <div key={i} className={`w-2 h-4 rounded-sm ${
                                  i < aiAnalysis.impactScore 
                                    ? aiAnalysis.impactScore >= 7 ? 'bg-red-500' : aiAnalysis.impactScore >= 4 ? 'bg-yellow-500' : 'bg-green-500'
                                    : 'bg-slate-700'
                                }`} />
                              ))}
                            </div>
                            <span className="text-sm font-bold text-slate-200">{aiAnalysis.impactScore}/10</span>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
                          <span>🧠</span>
                          {aiAnalysis.summary}
                        </h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {aiAnalysis.details}
                        </p>
                        <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                          <span>⚡</span>
                          <span>Powered by Groq AI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-6 pb-4 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <span className="text-2xl">🔬</span>
                    Semantic Differences
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    <span className="inline-block w-3 h-3 bg-green-500/30 border border-green-500 rounded mr-1"></span>
                    Added Content
                    <span className="inline-block w-3 h-3 bg-red-500/30 border border-red-500 rounded ml-4 mr-1"></span>
                    Removed Content
                  </p>
                </div>
                <div className="text-base leading-relaxed font-serif">
                  {diffResult.map((part, index) => {
                    if (!part.added && !part.removed) return <span key={index} className="text-slate-500">{part.value} </span>;
                    return (
                      <span key={index} className={`px-1 rounded font-bold ${part.added ? 'bg-green-500/30 text-green-200 border border-green-500/50' : 'bg-red-500/30 text-red-200 border border-red-500/50 line-through'}`}>
                        {part.value}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {!selectedContent && !diffResult && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  {isCompareMode ? (
                    <div className="space-y-3">
                      <div className="text-6xl mb-4">⚖️</div>
                      <p className="text-lg font-semibold text-slate-300">Select Exactly 2 Versions</p>
                      <p className="text-sm">Click two versions from the timeline to compare changes</p>
                      <div className="text-xs text-slate-600 mt-4 bg-slate-800/30 rounded-lg p-3 max-w-md mx-auto border border-slate-700/30">
                        💡 Tip: This will show you word-level differences between archived snapshots
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-6xl mb-4">🕵️</div>
                      <p className="text-lg font-semibold text-slate-300">No Version Selected</p>
                      <p className="text-sm">Select a version to view its archived content</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-600">
          <p>
            🌊 Powered by <span className="text-cyan-400 font-semibold">Walrus</span> + 
            <span className="text-blue-400 font-semibold ml-1">Sui Blockchain</span>
          </p>
          <p className="mt-1 font-mono">
            Registry: <span className="text-slate-500">{REGISTRY_ID.slice(0, 20)}...</span>
          </p>
        </div>
      </div>
    </div>
  );
}
