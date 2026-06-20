// ── STORAGE KEYS ───────────────────────────────────────────────────────────
const KEYS = {
  vehicles:        'vms_vehicles',
  drivers:         'vms_drivers',
  driverLicenses:  'vms_driver_licenses',
  vehicleLicenses: 'vms_vehicle_licenses',
  geofences:       'vms_geofences',
  trips:           'vms_trips',
  fuelLogs:        'vms_fuel_logs',
  maintenance:     'vms_maintenance',
  spareParts:      'vms_spare_parts',
};

// ── IN-MEMORY CACHE ────────────────────────────────────────────────────────
const _cache = {};
Object.values(KEYS).forEach(k => _cache[k] = []);

// ── FOLDER HANDLE ──────────────────────────────────────────────────────────
let _dirHandle = null;

const _fname = lsKey => lsKey.replace('vms_', '') + '.json';

// ── INDEXEDDB (simpan folder handle) ───────────────────────────────────────
function _openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('vmsDB', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}

async function _idbGet(key) {
  const idb = await _openIDB();
  return new Promise(res => {
    const req = idb.transaction('handles', 'readonly').objectStore('handles').get(key);
    req.onsuccess = e => res(e.target.result ?? null);
    req.onerror   = () => res(null);
  });
}

async function _idbSet(key, val) {
  const idb = await _openIDB();
  return new Promise(res => {
    const tx = idb.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(val, key);
    tx.oncomplete = res;
  });
}

// ── FILE READ / WRITE ──────────────────────────────────────────────────────
async function _readFile(lsKey) {
  try {
    const fh   = await _dirHandle.getFileHandle(_fname(lsKey));
    const text = await (await fh.getFile()).text();
    return text.trim() ? JSON.parse(text) : [];
  } catch {
    // File belum ada — kembalikan data dari localStorage sebagai migrasi
    return JSON.parse(localStorage.getItem(lsKey) || '[]');
  }
}

async function _writeFile(lsKey, data) {
  if (!_dirHandle) return;
  try {
    let perm = await _dirHandle.queryPermission({ mode: 'readwrite' });
    if (perm === 'prompt') perm = await _dirHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;

    const fh = await _dirHandle.getFileHandle(_fname(lsKey), { create: true });
    const w  = await fh.createWritable();
    await w.write(JSON.stringify(data, null, 2));
    await w.close();
  } catch (e) {
    console.warn('[VMS] File write failed, localStorage tetap tersimpan:', e);
  }
}

// ── PUBLIC SYNC API (baca dari cache) ─────────────────────────────────────
const db       = key       => [...(_cache[key] || [])];
const dbSave   = (key, data) => {
  _cache[key] = data;
  localStorage.setItem(key, JSON.stringify(data)); // selalu dual-write
  _writeFile(key, data);                           // async, fire-and-forget
};
const dbGet    = (key, id)     => (_cache[key] || []).find(r => r.id === id);
const dbAdd    = (key, rec)    => { const d = db(key); d.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...rec }); dbSave(key, d); };
const dbUpdate = (key, id, u)  => dbSave(key, (_cache[key] || []).map(r => r.id === id ? { ...r, ...u, updatedAt: new Date().toISOString() } : r));
const dbDelete = (key, id)     => dbSave(key, (_cache[key] || []).filter(r => r.id !== id));

// ── INIT STORAGE ───────────────────────────────────────────────────────────
async function initStorage() {
  const saved = await _idbGet('dirHandle');

  if (saved) {
    const perm = await saved.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      _dirHandle = saved;
    }
    // perm === 'prompt' → tidak set _dirHandle sekarang,
    // akan di-request saat write pertama (butuh user gesture)
    else if (perm === 'prompt') {
      _dirHandle = saved; // tetap set agar bisa requestPermission saat write
    }
  }

  // Load semua data ke cache
  await Promise.all(Object.values(KEYS).map(async lsKey => {
    if (_dirHandle && await _dirHandle.queryPermission({ mode: 'readwrite' }) === 'granted') {
      _cache[lsKey] = await _readFile(lsKey);
    } else {
      _cache[lsKey] = JSON.parse(localStorage.getItem(lsKey) || '[]');
    }
  }));

  return !!_dirHandle;
}

// ── PICK FOLDER (user gesture required) ───────────────────────────────────
async function pickFolder() {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    _dirHandle = handle;
    await _idbSet('dirHandle', handle);

    // Tulis semua data cache ke folder baru (migrasi dari localStorage)
    await Promise.all(Object.values(KEYS).map(lsKey => _writeFile(lsKey, _cache[lsKey])));

    updateStorageStatus();
    toast('Storage folder connected — data synced to files');
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') toast('Failed to pick folder', 'error');
    return false;
  }
}

function storageMode() {
  if (!_dirHandle) return 'local';
  return 'folder';
}

function folderName() {
  return _dirHandle?.name ?? null;
}

// ── BACKUP / RESTORE ────────────────────────────────────────────────────────
function exportData() {
  const data = { _exportedAt: new Date().toISOString(), _version: '1' };
  Object.entries(KEYS).forEach(([key, lsKey]) => { data[key] = db(lsKey); });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `vms-backup-${new Date().toISOString().slice(0,10)}.json` });
  a.click(); URL.revokeObjectURL(url);
  toast('Data exported successfully');
}

function importData() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        let count = 0;
        Object.entries(KEYS).forEach(([key, lsKey]) => {
          if (Array.isArray(data[key])) { dbSave(lsKey, data[key]); count++; }
        });
        toast(`Import successful — ${count} data tables restored`);
        navigate(currentPage);
      } catch { toast('Invalid or corrupted file', 'error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}
