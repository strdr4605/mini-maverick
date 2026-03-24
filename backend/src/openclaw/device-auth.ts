import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

type DeviceKeys = {
  deviceId: string;
  publicKey: string;
  privateKey: string;
};

const DATA_DIR = process.env.DATA_DIR ?? "./data";
const KEY_FILE = path.join(DATA_DIR, "device-key.json");

function deriveDeviceId(publicKeyB64url: string): string {
  const rawBytes = Buffer.from(publicKeyB64url, "base64url");
  const deviceId = crypto.createHash("sha256").update(rawBytes).digest("hex");
  console.log("[device-auth] pubkey base64url:", publicKeyB64url);
  console.log("[device-auth] raw bytes length:", rawBytes.length);
  console.log("[device-auth] derived deviceId:", deviceId);
  return deviceId;
}

export function getOrCreateDeviceKeys(): DeviceKeys {
  if (fs.existsSync(KEY_FILE)) {
    const data = JSON.parse(fs.readFileSync(KEY_FILE, "utf-8"));
    return data as DeviceKeys;
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  const pubKeyDer = publicKey.export({ type: "spki", format: "der" });
  // Ed25519 SPKI DER has 12-byte header, raw key starts at offset 12
  const rawPubKey = pubKeyDer.subarray(12);
  const publicKeyB64 = rawPubKey.toString("base64url");

  const privKeyDer = privateKey.export({ type: "pkcs8", format: "der" });
  const privateKeyB64 = privKeyDer.toString("base64url");

  const deviceId = deriveDeviceId(publicKeyB64);

  const keys: DeviceKeys = { deviceId, publicKey: publicKeyB64, privateKey: privateKeyB64 };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(KEY_FILE, JSON.stringify(keys, null, 2));
  console.log("[device-auth] generated new Ed25519 keypair, deviceId:", deviceId);

  return keys;
}

type SignParams = {
  keys: DeviceKeys;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  token: string;
  nonce: string;
  platform: string;
  deviceFamily: string;
};

export function signConnectPayload(params: SignParams): {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
} {
  const signedAt = Date.now();

  // v3 payload format
  const payload = [
    "v3",
    params.keys.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(signedAt),
    params.token,
    params.nonce,
    params.platform,
    params.deviceFamily,
  ].join("|");

  const privKeyDer = Buffer.from(params.keys.privateKey, "base64url");
  const privateKey = crypto.createPrivateKey({
    key: privKeyDer,
    format: "der",
    type: "pkcs8",
  });

  console.log("[device-auth] signing payload:", payload);
  console.log("[device-auth] device.id:", params.keys.deviceId);
  console.log("[device-auth] device.publicKey:", params.keys.publicKey);
  const signature = crypto.sign(null, Buffer.from(payload), privateKey).toString("base64url");

  return {
    id: params.keys.deviceId,
    publicKey: params.keys.publicKey,
    signature,
    signedAt,
    nonce: params.nonce,
  };
}
