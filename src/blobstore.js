// 큰 파일(생성된 음성)은 localStorage 대신 IndexedDB에 둔다. 작품에는 'idb:<키>' 로만 적는다.
const DB = 'ssul-media';
const STORE = 'blobs';
const urls = new Map();

function open() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) {
      rej(e);
    }
  });
}

export async function putBlob(key, blob) {
  const db = await open();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  urls.delete(key);
  return `idb:${key}`;
}

export async function getBlob(key) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const q = tx.objectStore(STORE).get(key);
    q.onsuccess = () => res(q.result ?? null);
    q.onerror = () => rej(q.error);
  });
}

export async function deleteBlob(key) {
  const db = await open();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  const u = urls.get(key);
  if (u) URL.revokeObjectURL(u);
  urls.delete(key);
}

// 'idb:<키>' → 재생용 blob: 주소 (한 번 만들면 재사용)
export async function resolveMediaUrl(ref) {
  if (!ref || !ref.startsWith('idb:')) return ref;
  const key = ref.slice(4);
  if (urls.has(key)) return urls.get(key);
  const b = await getBlob(key);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urls.set(key, u);
  return u;
}

export function b64ToBlob(b64, mime = 'audio/mpeg') {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
