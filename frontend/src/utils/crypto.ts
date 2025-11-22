// frontend/src/utils/crypto.ts
/**
 * Cryptographic utilities for end-to-end encryption in Whistleblower Mode.
 * Implements hybrid encryption: RSA-OAEP for key exchange, AES-GCM for content.
 */

/**
 * Generates an RSA-OAEP 2048-bit keypair for journalist identity.
 * @returns CryptoKeyPair with public key (for sharing) and private key (kept secret)
 */
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

/**
 * Exports a public key to base64 format for sharing with whistleblowers.
 * @param key - CryptoKey (public) to export
 * @returns Base64-encoded public key string
 */
export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const exportedAsBase64 = window.btoa(String.fromCharCode(...new Uint8Array(exported)));
  return exportedAsBase64;
};

// 3. Import Public Key (to encrypt data)
export const importPublicKey = async (pem: string): Promise<CryptoKey> => {
  const binaryDerString = window.atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
};

// 4. Encrypt Data (Hybrid: AES for data, RSA for AES key)
export const encryptData = async (data: ArrayBuffer, publicKey: CryptoKey) => {
  // A. Generate a one-time AES key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  // B. Encrypt the actual file data with AES
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    data
  );

  // C. Export the AES key
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // D. Encrypt the AES key with the Recipient's RSA Public Key
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawAesKey
  );

  // E. Combine everything: IV + Encrypted Key Length + Encrypted Key + Encrypted Content
  // This is our "Sealed Blob"
  const keyLength = new Uint8Array(new Uint16Array([encryptedAesKey.byteLength]).buffer);
  
  return new Blob([iv, keyLength, encryptedAesKey, encryptedContent]);
};

/**
 * Decrypts a sealed archive blob using the journalist's private key.
 * Reverses the hybrid encryption: RSA decrypts AES key, then AES decrypts content.
 * @param blob - Encrypted blob from Walrus storage
 * @param privateKey - Journalist's RSA private key
 * @returns Decrypted blob (original ZIP archive)
 * @throws Error if decryption fails (wrong key or corrupted data)
 */
export const decryptBlob = async (blob: Blob, privateKey: CryptoKey) => {
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
  // Note: Web Crypto AES-GCM expects tag appended to ciphertext. 
  // We need to reconstruct: [Content] + [AuthTag]
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

// 6. Export Private Key (for storage/display)
export const exportPrivateKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  const exportedAsBase64 = window.btoa(String.fromCharCode(...new Uint8Array(exported)));
  return exportedAsBase64;
};

// 7. Import Private Key (from storage)
export const importPrivateKey = async (pem: string): Promise<CryptoKey> => {
  const binaryDerString = window.atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
};
