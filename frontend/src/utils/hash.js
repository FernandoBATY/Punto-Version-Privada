export async function sha256Base64(str) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBinary = String.fromCharCode.apply(null, hashArray);
    return btoa(hashBinary);
  }

  throw new Error('Web Crypto API not available in this environment.');
}

export default sha256Base64;
