const SALT = new TextEncoder().encode("iamspeed-device-fingerprint-salt");
const PBKDF2_ITERATIONS = 100_000;

function getDeviceFingerprint(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "node-env";
  const screen = typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "1920x1080";
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = indexedDB.open("iamspeed_secure", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getStoredCryptoKey(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("keys", "readonly");
    const store = tx.objectStore("keys");
    const request = store.get("symmetric_key");
    request.onsuccess = () => resolve((request.result as CryptoKey) || null);
    request.onerror = () => reject(request.error);
  });
}

function saveCryptoKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("keys", "readwrite");
    const store = tx.objectStore("keys");
    const request = store.put(key, "symmetric_key");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getEncryptionKey(): Promise<CryptoKey> {
  try {
    const db = await openDB();
    let cryptoKey = await getStoredCryptoKey(db);
    if (!cryptoKey) {
      cryptoKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false, // extractable: false (non-extractable key)
        ["encrypt", "decrypt"]
      );
      await saveCryptoKey(db, cryptoKey);
    }
    return cryptoKey;
  } catch {
    // Fallback: If IndexedDB is blocked (e.g. Incognito) or unsupported, derive key from user agent
    const fingerprint = getDeviceFingerprint();
    return deriveKey(fingerprint);
  }
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
  const key = await getEncryptionKey();
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
    const key = await getEncryptionKey();
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
