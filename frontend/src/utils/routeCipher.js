const defaultKey = (process.env.REACT_APP_ROUTE_KEY || 'default_key');

function toUint8Array(str) {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

function fromUint8Array(arr) {
  return String.fromCharCode.apply(null, Array.from(arr));
}

function xorCipher(str, key) {
  const s = toUint8Array(str);
  const k = toUint8Array(key);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    out[i] = s[i] ^ k[i % k.length];
  }
  return fromUint8Array(out);
}

function b64Encode(str) {
  try { return btoa(str); } catch (e) { return Buffer.from(str, 'binary').toString('base64'); }
}

function b64Decode(str) {
  try { return atob(str); } catch (e) { return Buffer.from(str, 'base64').toString('binary'); }
}

export function encryptRoute(path) {
  if (!path) return '';
  const cipher = xorCipher(path, defaultKey);
  return b64Encode(cipher).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
}

export function decryptRoute(token) {
  if (!token) return '';
  const safe = token.replace(/-/g,'+').replace(/_/g,'/');
  const pad = safe.length % 4 === 0 ? '' : '='.repeat(4 - (safe.length % 4));
  const decoded = b64Decode(safe + pad);
  return xorCipher(decoded, defaultKey);
}

export default { encryptRoute, decryptRoute };
