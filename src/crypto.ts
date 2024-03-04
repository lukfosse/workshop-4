import { webcrypto } from "crypto";
const {subtle} = webcrypto;
// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const keyPair = await subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt", "decrypt"]
  );

  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
}
// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exported = await subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);

}


// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (!key) return null;
  const exportedKey = await subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string public key to its native format
export async function importPubKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const bufferKey = Buffer.from(strKey, "base64");

  const importedKey = await subtle.importKey(
    "spki",
    bufferKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );

  return importedKey;
}

// Import a base64 string private key to its native format
export async function importPrvKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const bufferKey = Buffer.from(strKey, "base64");

  const importedKey = await subtle.importKey(
    "pkcs8",
    bufferKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );

  return importedKey;
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
  b64Data: string,
  strPublicKey: string
): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const encrypted = await subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      dataBuffer
  );
  return arrayBufferToBase64(encrypted);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(
  data: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
  const dataBuffer = base64ToArrayBuffer(data);
  const decrypted = await subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      dataBuffer
  );
  return arrayBufferToBase64(decrypted);
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  const key = await subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256, 
    },
    true, 
    ["encrypt", "decrypt"] 
  );

  return key;
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await subtle.exportKey("raw", key);
  const exportedBuffer = Buffer.from(exportedKey);
  const base64String = exportedBuffer.toString("base64");
  return base64String;
}

// Import a base64 string format to its crypto native format
export async function importSymKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const bufferKey = Buffer.from(strKey, "base64");
  const importedKey = await subtle.importKey(
    "raw",
    bufferKey,
    { name: "AES-CBC" },
    true,
    ["encrypt", "decrypt"]
  );

  return importedKey;
}

// Encrypt a message using a symmetric key
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const iv = new Uint8Array(16);
  const encrypted = await subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv
      },
      key,
      encodedData
  );

  return arrayBufferToBase64(encrypted);
}

// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  const key = await importSymKey(strKey);
  const encryptedDataWithIvBuffer = base64ToArrayBuffer(encryptedData);
  const iv = new Uint8Array(16);
  const decrypted = await subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv
      },
      key,
      encryptedDataWithIvBuffer
  );
  return new TextDecoder().decode(decrypted);
}

