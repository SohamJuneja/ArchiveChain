// src/suiClient.ts
import dotenv from "dotenv";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";

dotenv.config();

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl("testnet");
const PACKAGE_ID = process.env.SUI_PACKAGE_ID!;
const REGISTRY_ID = process.env.SUI_REGISTRY_ID!;
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;

if (!SUI_PRIVATE_KEY) {
  throw new Error("SUI_PRIVATE_KEY missing in .env");
}

// Decode `suiprivkey...` into a secret key byte array
const { schema, secretKey } = decodeSuiPrivateKey(SUI_PRIVATE_KEY);

if (schema !== "ED25519") {
  throw new Error(`Expected ED25519 key, got ${schema}`);
}

const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const client = new SuiClient({ url: RPC_URL });

export interface OnChainArchiveParams {
  url: string;
  walrusBlobId: string;
  tuskyFileId: string;
  contentHashHex: string; // sha256 hex string
  title: string;
}

/**
 * Calls archivechain::registry::create_archive on Sui testnet.
 * Returns tx digest + new archive object id if found.
 */
export async function createOnChainArchive(
  params: OnChainArchiveParams
) {
  const { url, walrusBlobId, tuskyFileId, contentHashHex, title } = params;

  const tx = new TransactionBlock();

  // convert hex string -> vector<u8> for Move
  const hex = contentHashHex.startsWith("0x")
    ? contentHashHex.slice(2)
    : contentHashHex;
  const hashBytes = Buffer.from(hex, "hex");

  tx.moveCall({
    target: `${PACKAGE_ID}::registry::create_archive`,
    arguments: [
      tx.pure.string(url),
      tx.pure.string(walrusBlobId),
      tx.pure.string(tuskyFileId),
      tx.pure(Array.from(hashBytes)), // vector<u8>
      tx.pure.string(title),
      tx.object(REGISTRY_ID), // &mut URLRegistry
      tx.object("0x6"), // &Clock (global shared object)
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  const digest = result.digest;
  let archiveId: string | null = null;

  if (result.events) {
    for (const ev of result.events as any[]) {
      if (
        ev.type &&
        typeof ev.type === "string" &&
        ev.type.endsWith("::registry::ArchiveCreated")
      ) {
        const parsed = ev.parsedJson;
        if (parsed && parsed.archive_id) {
          archiveId = parsed.archive_id as string;
          break;
        }
      }
    }
  }

  return {
    digest,
    archiveId,
    raw: result,
  };
}
