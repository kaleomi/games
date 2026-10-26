// 存档存储：浏览器本地数据库 IndexedDB（只在这台电脑的这个浏览器里，别人读不到；容量比 localStorage 大得多）
// 每个玩家单独一条记录，每次保存只写有变化的玩家（在场的、刚领奖的），几千人的存档也不会让画面卡一下。
// 第一次打开时把旧的 localStorage 存档搬过来；数据库打不开（极少数浏览器）就退回 localStorage。
export const SAVE_KEY = 'dragon-raid-save-v1';
const BACKUP_KEY = 'dragon-raid-save-backup';
const DB = 'dragon-raid', KV = 'kv', PLAYERS = 'players';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('浏览器不支持本地数据库')); return; }
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      if (!db.objectStoreNames.contains(PLAYERS)) db.createObjectStore(PLAYERS);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('本地数据库被另一个页面占用'));
  });
}

const done = tx => new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('写入被中止')); });
const result = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export async function openStore({ legacy = window.localStorage, onError = () => {} } = {}) {
  let db;
  try { db = await openDb(); } catch (e) {
    console.warn('本地数据库打不开，继续用 localStorage', e);
    return { kind: 'localStorage', storage: legacy, info: () => ({ kind: 'localStorage', bytes: (legacy.getItem(SAVE_KEY) || '').length, error: null, savedAt: 0 }) };
  }
  const state = { error: null, savedAt: 0, bytes: 0, migrated: false };
  // ── 读：meta + 每个玩家一条 ──
  let loaded = null;
  {
    const tx = db.transaction([KV, PLAYERS], 'readonly');
    const meta = await result(tx.objectStore(KV).get('meta'));
    if (meta) {
      const keys = await result(tx.objectStore(PLAYERS).getAllKeys());
      const vals = await result(tx.objectStore(PLAYERS).getAll());
      const players = {}; keys.forEach((k, i) => { players[k] = vals[i]; });
      loaded = { ...meta, players };
    }
  }
  const kvGet = async k => result(db.transaction(KV, 'readonly').objectStore(KV).get(k));
  if (!loaded) {
    // 旧格式：整份 JSON（先看数据库里有没有上一版的整块存档，再看 localStorage）
    let raw = await kvGet(SAVE_KEY);
    let fromLs = false;
    if (!raw) { try { raw = legacy?.getItem(SAVE_KEY) || null; fromLs = !!raw; } catch { raw = null; } }
    if (raw) {
      try { loaded = JSON.parse(raw); state.migrated = true; state.legacyFromLs = fromLs; } catch (e) { console.warn('旧存档读不出来', e); }
    }
  }
  let backup = await kvGet(BACKUP_KEY);
  try { state.bytes = loaded ? JSON.stringify(loaded).length : 0; } catch { state.bytes = 0; }

  let chain = Promise.resolve();
  const queue = fn => { chain = chain.then(fn).then(() => { state.error = null; state.savedAt = Date.now(); }, e => { state.error = e?.message || String(e); onError(e); }); return chain; };

  const storage = {
    loadSave: () => loaded,
    migrated: () => state.migrated,
    // 写：meta + 有变化的玩家；full=true 时整份重写（导入、清空、每周清零、第一次搬家）
    writeSave(meta, entries, removed, full) {
      return queue(async () => {
        const tx = db.transaction([KV, PLAYERS], 'readwrite');
        const ps = tx.objectStore(PLAYERS);
        if (full) ps.clear();
        for (const [uid, p] of entries) ps.put(p, uid);
        if (!full) for (const uid of removed) ps.delete(uid);
        tx.objectStore(KV).put(meta, 'meta');
        await done(tx);
        if (state.migrated) {   // 搬家写好了：删掉旧的整块存档，腾出空间
          state.migrated = false;
          try { db.transaction(KV, 'readwrite').objectStore(KV).delete(SAVE_KEY); } catch { /* 忽略 */ }
          if (state.legacyFromLs) { try { legacy.removeItem(SAVE_KEY); } catch { /* 忽略 */ } console.info('存档已从 localStorage 搬到本地数据库'); }
        }
      });
    },
    getItem: k => (k === BACKUP_KEY ? backup : legacy?.getItem(k) ?? null),
    setItem: (k, v) => {
      if (k === BACKUP_KEY) { backup = v; queue(async () => { const tx = db.transaction(KV, 'readwrite'); tx.objectStore(KV).put(v, BACKUP_KEY); await done(tx); }); return; }
      legacy.setItem(k, v);
    },
    removeItem: k => legacy?.removeItem(k),
    whenSaved: () => chain,
  };
  return { kind: 'indexedDB', storage, info: () => ({ kind: 'indexedDB', bytes: state.bytes, error: state.error, savedAt: state.savedAt }), setBytes: n => { state.bytes = n; } };
}
