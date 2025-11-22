// index.mjs
import { Tusky } from "@tusky-io/ts-sdk";
import "dotenv/config";
import fs from "fs";

// --- Config ---
const API_KEY = process.env.TUSKY_API_KEY;
if (!API_KEY) {
  throw new Error("TUSKY_API_KEY not found in .env file.");
}

const tusky = new Tusky({ apiKey: API_KEY });

// --- Main Function ---
async function uploadTestFile() {
  console.log("Starting Walrus upload test...\n");

  try {
    // 1. Get or create a PUBLIC vault
    console.log("Step 1: Getting vaults...");
    const vaults = await tusky.vault.listAll();
    console.log(`Found ${vaults.items?.length || 0} vaults`);

    let vaultId;
    let vault;

    if (vaults.items && vaults.items.length > 0) {
      // Prefer an existing public vault, otherwise just use the first one
      vault =
        vaults.items.find((v) => v.encrypted === false) || vaults.items[0];
      vaultId = vault.id;
      console.log(
        `✅ Using existing vault: ${vault.name} (${vaultId}), encrypted=${vault.encrypted}\n`
      );
    } else {
      console.log("No vaults found, creating a PUBLIC (unencrypted) vault...");
      const created = await tusky.vault.create("ArchiveChain Vault", {
        encrypted: false,
      });
      vaultId = created.id;
      vault = created;
      console.log(
        `✅ Created vault: ${vault.name} (${vaultId}), encrypted=${vault.encrypted}\n`
      );
    }

    // 2. Create a folder in the vault
    console.log("Step 2: Creating a folder in vault...");
    const { id: folderId } = await tusky.folder.create(
      vaultId,
      "ArchiveChain Test"
    );
    console.log(`✅ Folder created with ID: ${folderId}\n`);

    // 3. Read the local test file
    const fileBuffer = fs.readFileSync("test.txt");
    console.log("✅ Read test.txt file.\n");

    // 4. Upload file into the folder
    console.log("Step 3: Uploading file to folder...");
    const uploadId = await tusky.file.upload(vaultId, fileBuffer, {
      parentId: folderId,
      name: "test.txt",
      mimeType: "text/plain",
    });

    console.log("\n--- ✅ SUCCESS! ---");
    console.log(`File uploaded to Walrus via Tusky!`);
    console.log(`Upload ID: ${uploadId}`);
    console.log(`Vault ID: ${vaultId}`);
    console.log(`Folder ID: ${folderId}`);
    console.log("---\n");

    // 5. Fetch file metadata (Walrus blob id, Sui object id, etc.)
    console.log("Step 4: Fetching file metadata from Tusky...");
    const fileMetadata = await tusky.file.get(uploadId);

    console.log("\n--- File metadata ---");
    console.log(JSON.stringify(fileMetadata, null, 2));
    console.log(
      "Walrus blob id:",
      fileMetadata.blobId || "(not yet available / still processing)"
    );
    console.log(
      "Sui object id:",
      fileMetadata.blobObjectId || "(not yet available / still processing)"
    );
    console.log("---\n");

    // 6. Download the file back to verify round-trip
    console.log("Step 5: Downloading file buffer from Tusky...");
    const downloadedArrayBuffer = await tusky.file.arrayBuffer(uploadId);
    const downloadedBuffer = Buffer.from(downloadedArrayBuffer);

    fs.writeFileSync("downloaded-test.txt", downloadedBuffer);
    console.log(
      `✅ Downloaded file saved as downloaded-test.txt (${downloadedBuffer.byteLength} bytes)`
    );
    console.log("---\n");
  } catch (error) {
    console.error("\n--- ❌ UPLOAD FAILED ---");
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    console.log("---");
  }
}

uploadTestFile();
