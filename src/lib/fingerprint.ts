/**
 * Shared device fingerprint + handle generation.
 *
 * `getDeviceFingerprint()` is extracted from crypto.ts so both the encrypted
 * API-key store and the leaderboard handle use the same identity signal.
 *
 * `getDeviceHash()` returns a stable SHA-256 hex hash of the fingerprint —
 * the backend's real unique key.
 *
 * `generateHandle()` deterministically maps the deviceHash to a memorable,
 * Blind-style anonymous handle (adjective + noun + 4-digit number).
 *
 * `getRegion()` derives a coarse geographic label from the browser timezone
 * via the `countries-and-timezones` library (timezone → country → region).
 * We intentionally avoid collecting IP addresses. The library is imported
 * dynamically so it doesn't bloat the main client bundle or break SSR.
 */

export function getDeviceFingerprint(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "node-env";
  const screen = typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "1920x1080";
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return `${ua}|${screen}|${tz}`;
}

export async function getDeviceHash(): Promise<string> {
  const fingerprint = getDeviceFingerprint();
  const data = new TextEncoder().encode(fingerprint);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const ADJECTIVES = [
  "crimson", "azure", "silent", "rapid", "neon", "electric", "stellar", "cosmic",
  "phantom", "shadow", "turbo", "lunar", "solar", "arctic", "ember", "frost",
  "iron", "golden", "velvet", "midnight", "thunder", "blaze", "storm", "quantum",
  "cobalt", "scarlet", "obsidian", "silver", "jade", "amber", "onyx", "copper",
  "magma", "glacier", "vortex", "pulse", "delta", "apex", "hyper", "ultra",
  "swift", "ninja", "rocket", "meteor", "comet", "nova", "volt", "pixel",
  "cyber", "atomic",
];

const NOUNS = [
  "falcon", "panther", "racer", "phantom", "viper", "cobra", "raven", "wolf",
  "tiger", "eagle", "hawk", "fox", "jaguar", "mustang", "cheetah", "lynx",
  "drake", "phoenix", "griffin", "raptor", "stallion", "bolt", "spark", "blaze",
  "rocket", "comet", "meteor", "nova", "vortex", "pulse", "engine", "runner",
  "driver", "pilot", "rider", "hunter", "scout", "strider", "dash", "sprint",
  "flash", "streak", "surge", "bolt", "cyclone", "tempest", "inferno", "thunder",
  "lightning", "phantom",
];

/**
 * Deterministically generate a Blind-style handle from a deviceHash.
 *
 * Uses the first 4 bytes for the adjective index, next 4 for the noun index,
 * and the next 2 bytes for a 4-digit number. Same hash → same handle, always.
 */
export function generateHandle(deviceHash: string): string {
  const bytes = hexToBytes(deviceHash);

  const adjIdx = bytesToIndex(bytes, 0, 4) % ADJECTIVES.length;
  const nounIdx = bytesToIndex(bytes, 4, 4) % NOUNS.length;
  const num = bytesToIndex(bytes, 8, 2) % 10000;

  const adjective = ADJECTIVES[adjIdx];
  const noun = NOUNS[nounIdx];
  const number = num.toString().padStart(4, "0");

  return `${adjective}_${noun}_${number}`;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToIndex(bytes: Uint8Array, offset: number, length: number): number {
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = (value << 8) | bytes[offset + i];
  }
  // Convert to unsigned 32-bit if 4 bytes
  if (length === 4) value = value >>> 0;
  return value;
}

/**
 * Coarse region label derived from the browser timezone.
 *
 * Uses the IANA timezone's continent prefix + UTC offset (from
 * `countries-and-timezones`) to produce a coarse geographic label —
 * no IP address collection, no country-level hardcoding.
 *
 * Returns labels like "Americas-E", "Americas-W", "EU-West", "EU-Central",
 * "AP-East", "AP-SE", "AP-South", "Africa", "Oceania", or "Other".
 */
export async function getRegion(): Promise<string> {
  const tz = typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";
  return timezoneToRegion(tz);
}

export async function timezoneToRegion(tz: string): Promise<string> {
  const continent = tz.split("/")[0];

  try {
    const ct = await import("countries-and-timezones");
    const timezone = ct.getTimezone(tz);
    // utcOffset is in minutes (e.g., -300 for UTC-5)
    const offset = timezone ? timezone.utcOffset : 0;

    switch (continent) {
      case "America":
        // Americas-E: UTC-5 or eastward (NY, Toronto, Halifax, Brazil, Argentina)
        // Americas-W: UTC-7 or westward (Denver, LA, Anchorage, Hawaii)
        // Americas-C: UTC-6 (Chicago, Mexico City)
        if (offset >= -300) return "Americas-E";
        if (offset <= -420) return "Americas-W";
        return "Americas-C";

      case "Europe":
        if (offset <= 0) return "EU-West";
        if (offset <= 120) return "EU-Central";
        return "EU-East";

      case "Asia":
        // AP-West: UTC+3 to UTC+4 (Dubai, Tehran)
        // AP-South: UTC+5 to UTC+6 (India, Pakistan, Bangladesh)
        // AP-SE: UTC+6 to UTC+7 (Thailand, Indonesia, Vietnam)
        // AP-East: UTC+8+ (China, Japan, Korea, Singapore)
        if (offset < 300) return "AP-West";
        if (offset < 420) return "AP-South";
        if (offset < 480) return "AP-SE";
        return "AP-East";

      case "Africa":
        return "Africa";

      case "Australia":
      case "Pacific":
        return "Oceania";

      case "Antarctica":
        return "Antarctica";

      default:
        return "Other";
    }
  } catch {
    return "Other";
  }
}
