import { openDB } from 'idb';

let dbPromise: any = null;

if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
  dbPromise = openDB('CyberConnect', 1, {
    upgrade(db) {
      db.createObjectStore('store');
    },
  });
}

export async function get(key: string) {
  if (dbPromise) {
    return (await dbPromise).get('store', key);
  }

  return;
}

export async function set(key: string, val: CryptoKeyPair) {
  if (dbPromise) {
    return (await dbPromise).put('store', val, key);
  }

  return;
}

export async function clear() {
  return (await dbPromise).clear('store');
}

export async function clearSigningKey() {
  await clear();
}

export async function rotateSigningKey() {
  await clear();
  return generateSigningKey();
}

export async function generateSigningKey() {
  const algorithm = {
    name: 'ECDSA',
    namedCurve: 'P-256',
  };
  const extractable = false;
  const keyUsages: KeyUsage[] = ['sign', 'verify'];

  const signingKey = await window.crypto.subtle.generateKey(
    algorithm,
    extractable,
    keyUsages,
  );

  set('signingKey', signingKey).then();

  return signingKey;
}

export async function hasSigningKey() {
  return await get('signingKey');
}

export async function getSigningKey() {
  let signingKey = await get('signingKey');

  if (!signingKey) {
    signingKey = generateSigningKey();
  }

  return signingKey;
}

export async function getPublicKey() {
  const signingKey = await getSigningKey();
  const exported = await window.crypto.subtle.exportKey(
    'spki',
    signingKey.publicKey,
  );

  return window.btoa(arrayBuffer2String(exported));
}

export async function signWithSigningKey(input: string) {
  const signingKey = await getSigningKey();
  const algorithm = {
    name: 'ECDSA',
    hash: {
      name: 'SHA-256',
    },
  };
  const enc = new TextEncoder();
  const encodedMessage = enc.encode(input);

  const signature = await window.crypto.subtle.sign(
    algorithm,
    signingKey.privateKey,
    encodedMessage,
  );

  return arrayBuffer2Hex(signature);
}

export function arrayBuffer2Hex(buffer: ArrayBuffer) {
  return (
    '0x' +
    Array.prototype.map
      .call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2))
      .join('')
  );
}

function arrayBuffer2String(buffer: ArrayBuffer) {
  return String.fromCharCode.apply(null, new Uint8Array(buffer) as any);
}
