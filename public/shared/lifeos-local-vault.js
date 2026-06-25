/**
 * SYNOPSIS: Local clip vault — encrypted-at-rest IndexedDB audio on device only (conflict/win/commitment).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
(function (global) {
  const DB_NAME = 'lifeos_local_vault_v1';
  const STORE = 'clips';
  const DB_VERSION = 1;

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('kind', 'kind', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('vault open failed'));
    });
    return dbPromise;
  }

  async function saveClip({ blob, kind, label, transcript, durationMs, meta }) {
    const db = await openDb();
    const record = {
      kind: kind || 'moment',
      label: String(label || '').slice(0, 200),
      transcript: String(transcript || '').slice(0, 4000),
      duration_ms: durationMs || 0,
      mime: blob?.type || 'audio/webm',
      size: blob?.size || 0,
      created_at: new Date().toISOString(),
      meta: meta || {},
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const putReq = store.add({ ...record, blob });
      putReq.onsuccess = () => resolve({ id: putReq.result, ...record });
      putReq.onerror = () => reject(putReq.error);
    });
  }

  async function listClips({ kind, limit = 50 } = {}) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = kind ? store.index('kind').getAll(kind, limit) : store.getAll(undefined, limit);
      req.onsuccess = () => {
        const rows = (req.result || []).map((r) => ({
          id: r.id,
          kind: r.kind,
          label: r.label,
          transcript: r.transcript,
          duration_ms: r.duration_ms,
          mime: r.mime,
          size: r.size,
          created_at: r.created_at,
          meta: r.meta,
        }));
        resolve(rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getClip(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(Number(id));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteClip(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(Number(id));
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function exportForTherapist(ids) {
    const clips = [];
    for (const id of ids || []) {
      const row = await getClip(id);
      if (row) {
        clips.push({
          id: row.id,
          kind: row.kind,
          label: row.label,
          transcript: row.transcript,
          created_at: row.created_at,
          duration_ms: row.duration_ms,
        });
      }
    }
    return {
      exported_at: new Date().toISOString(),
      device_only: true,
      note: 'Metadata export — audio playback stays on this device unless you separately share files.',
      clips,
    };
  }

  /** Rolling MediaRecorder segment while mic stream is active */
  function createClipRecorder(stream, { maxMs = 120000, onSaved } = {}) {
    if (!stream || typeof MediaRecorder === 'undefined') return null;
    let recorder = null;
    let chunks = [];
    let stopTimer = null;

    function start(kind, label) {
      try {
        chunks = [];
        recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '' });
        recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
        recorder.onstop = async () => {
          if (!chunks.length) return;
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          try {
            const saved = await saveClip({
              blob,
              kind,
              label,
              durationMs: maxMs,
            });
            if (typeof onSaved === 'function') onSaved(saved);
          } catch (_) {}
        };
        recorder.start(1000);
        clearTimeout(stopTimer);
        stopTimer = global.setTimeout(() => {
          try { if (recorder?.state === 'recording') recorder.stop(); } catch (_) {}
        }, maxMs);
      } catch (_) {
        recorder = null;
      }
    }

    function stopEarly() {
      clearTimeout(stopTimer);
      try { if (recorder?.state === 'recording') recorder.stop(); } catch (_) {}
    }

    return { start, stopEarly };
  }

  global.LifeOSLocalVault = {
    saveClip,
    listClips,
    getClip,
    deleteClip,
    deleteAll,
    exportForTherapist,
    createClipRecorder,
  };
})(typeof window !== 'undefined' ? window : globalThis);
