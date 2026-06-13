const SALT = new TextEncoder().encode("iamspeed-device-fingerprint-salt");
const PBKDF2_ITERATIONS = 100_000;

function getDeviceFingerprint(): string {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${ua}|${screen}|${tz}`;
}

async function deriveKey(fingerprint: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(fingerprint),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function storageKey(provider: string): string {
  return `iamspeed_key_${provider}`;
}

export async function saveKey(provider: string, rawKey: string): Promise<void> {
  const fingerprint = getDeviceFingerprint();
  const key = await deriveKey(fingerprint);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoded = new TextEncoder().encode(rawKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const payload = {
    iv: toBase64(iv.buffer),
    ciphertext: toBase64(ciphertext),
  };
  localStorage.setItem(storageKey(provider), JSON.stringify(payload));
}

export async function loadKey(provider: string): Promise<string | null> {
  const raw = localStorage.getItem(storageKey(provider));
  if (!raw) return null;
  try {
    const { iv, ciphertext } = JSON.parse(raw) as { iv: string; ciphertext: string };
    const fingerprint = getDeviceFingerprint();
    const key = await deriveKey(fingerprint);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(fromBase64(iv)) },
      key,
      fromBase64(ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export function clearKey(provider: string): void {
  localStorage.removeItem(storageKey(provider));
}

export function hasStoredKey(provider: string): boolean {
  return localStorage.getItem(storageKey(provider)) !== null;
}
