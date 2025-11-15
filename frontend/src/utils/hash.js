// Client-side SHA-256 helper that returns Base64 string (compatible with backend)
export async function sha256Base64(str) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBinary = String.fromCharCode.apply(null, hashArray);
    // btoa expects binary string
    return btoa(hashBinary);
  }

  // If Web Crypto is not available (very unlikely in modern browsers),
  // we intentionally fail so callers know hashing isn't supported.
  throw new Error('Web Crypto API not available in this environment.');
}

export default sha256Base64;
