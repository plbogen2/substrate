export async function saveToIndexedDB(slotName: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('substrate_db', 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('saves')) {
        db.createObjectStore('saves');
      }
      if (!db.objectStoreNames.contains('replays')) {
        db.createObjectStore('replays');
      }
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const tx = db.transaction('saves', 'readwrite');
      const store = tx.objectStore('saves');
      store.put(data, slotName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadFromIndexedDB(slotName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('substrate_db', 1);
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('saves')) {
        resolve(null);
        return;
      }
      const tx = db.transaction('saves', 'readonly');
      const store = tx.objectStore('saves');
      const getReq = store.get(slotName);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}
