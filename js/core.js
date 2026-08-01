// ── UTILS ──────────────────────────────────────────────────────────────────
const esc     = s => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
const fmt     = (n, d = 1) => Number(n || 0).toFixed(d);
const fmtNum  = n => Number(n || 0).toLocaleString('en-US');
const fmtCur  = n => 'Rp ' + Number(n || 0).toLocaleString('en-US');
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// Best-known current odometer for a vehicle: odometer only ever goes up, so the highest value
// recorded anywhere (fuel log, maintenance, spare parts, or the vehicle's initial reading) is a
// safer estimate than "whichever record has the latest date" — a mistyped later entry would
// otherwise make the odometer look like it went backwards.
function estOdometer(vehicleId) {
  const vehicle = dbGet(KEYS.vehicles, vehicleId);
  const readings = [
    vehicle?.odometer,
    ...db(KEYS.fuelLogs).filter(l => l.vehicleId === vehicleId).map(l => l.odometer),
    ...db(KEYS.maintenance).filter(m => m.vehicleId === vehicleId).map(m => m.odometer),
    ...db(KEYS.spareParts).filter(p => p.vehicleId === vehicleId).map(p => p.odometerAt),
  ].filter(v => v != null && v !== '').map(Number);
  return readings.length ? Math.max(...readings) : null;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function expiryBadge(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return '<span class="badge badge-muted">-</span>';
  if (d < 0)    return `<span class="badge badge-danger">Expired ${Math.abs(d)}d ago</span>`;
  if (d <= 30)  return `<span class="badge badge-warning">${d} days left</span>`;
  return `<span class="badge badge-success">${fmtDate(dateStr)}</span>`;
}

// ── TOAST ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── MODAL ──────────────────────────────────────────────────────────────────
let _modalSave = null;

function showModal(title, bodyHtml, onSave, saveLabel = 'Save') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-save-btn').textContent = saveLabel;
  _modalSave = onSave;
  document.getElementById('modal-backdrop').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  _modalSave = null;
}

// ── ICONS ──────────────────────────────────────────────────────────────────
const IC = {
  vehicle:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2l2-4h14l2 4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>`,
  driver:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  idcard:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h3"/></svg>`,
  document: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>`,
  mappin:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  grid:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  map:      `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
  route:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M3 17l3-9 4 4 3-6 4 8 4-4"/></svg>`,
  gauge:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0-9-9"/><path d="M12 12l4-3"/><circle cx="12" cy="12" r="1"/></svg>`,
  droplet:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  chart:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="4" width="4" height="17"/></svg>`,
  wrench:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  package:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  plus:     `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  download: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  edit:     `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:    `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  eye:      `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  folder:   `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  hdd:      `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
};

// ── ROUTER ─────────────────────────────────────────────────────────────────
// PAGES is populated by each page file at load time
const PAGES = {};
let currentPage = 'dashboard';

function navigate(id) {
  currentPage = id;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === id)
  );
  const main = document.getElementById('main');
  main.innerHTML = '';
  main.className = (id === 'tracking' || id === 'geofences') ? 'tracking-layout' : '';
  if (PAGES[id]) PAGES[id](main);
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { section: 'MASTER', key: 'master', items: [
    { id: 'vehicles',        label: 'Vehicle',         icon: 'vehicle'  },
    { id: 'drivers',         label: 'Driver',          icon: 'driver'   },
    { id: 'driverLicenses',  label: 'Driver License',  icon: 'idcard'   },
    { id: 'vehicleLicenses', label: 'Vehicle License', icon: 'document' },
    { id: 'geofences',       label: 'Geofence Library',icon: 'mappin'   },
  ]},
  { section: 'TRANSACTIONAL', key: 'txn', items: [
    { id: 'tracking',    label: 'Tracking',    icon: 'map'     },
    { id: 'tripLog',     label: 'Trip Log',    icon: 'route'   },
    { id: 'fuelLog',     label: 'Fuel Log',    icon: 'droplet' },
    { id: 'fuelReport',  label: 'Fuel Report', icon: 'chart'   },
    { id: 'maintenance', label: 'Maintenance', icon: 'wrench'  },
    { id: 'spareParts',  label: 'Spare Parts', icon: 'package' },
  ]},
];

const _navCollapsed = { master: false, txn: false };
const _IC_chev = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>`;

function _toggleNavGroup(key) {
  _navCollapsed[key] = !_navCollapsed[key];
  const body = document.getElementById(`nav-grp-${key}`);
  const collapsed = _navCollapsed[key];
  body.style.maxHeight = collapsed ? '0' : '1000px';
  const chevron = body.previousElementSibling.querySelector('.nav-chevron');
  chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
}

const _IC_logo = `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="34" height="34" rx="9" fill="#4f7af8"/>
  <path d="M9 25 C9 19 13 17 17 17 C21 17 25 15 25 9" stroke="rgba(255,255,255,0.45)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <circle cx="9" cy="25" r="2.8" fill="rgba(255,255,255,0.6)"/>
  <circle cx="25" cy="9" r="3.4" fill="white"/>
  <circle cx="25" cy="9" r="1.6" fill="#4f7af8"/>
</svg>`;

function buildSidebar() {
  const nav = document.getElementById('sidebar');
  nav.innerHTML = `<div class="brand">
    <div style="display:flex;align-items:center;gap:10px">
      ${_IC_logo}
      <div>
        <div class="brand-name">VMS</div>
        <div class="brand-sub">Vehicle Monitoring System</div>
      </div>
    </div>
  </div>`;

  NAV.forEach(item => {
    if (!item.section) {
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.style.marginTop = '8px';
      el.dataset.page = item.id;
      el.innerHTML = IC[item.icon] + `<span>${item.label}</span>`;
      el.addEventListener('click', () => navigate(item.id));
      nav.appendChild(el);
    } else {
      const collapsed = _navCollapsed[item.key];
      const group = document.createElement('div');

      const hd = document.createElement('div');
      hd.className = 'nav-group-hd';
      hd.innerHTML = `<span>${item.section}</span><span class="nav-chevron" style="${collapsed ? 'transform:rotate(-90deg)' : ''}">${_IC_chev}</span>`;
      hd.addEventListener('click', () => _toggleNavGroup(item.key));

      const body = document.createElement('div');
      body.className = 'nav-group-body';
      body.id = `nav-grp-${item.key}`;
      body.style.maxHeight = collapsed ? '0' : '1000px';

      item.items.forEach(child => {
        const el = document.createElement('div');
        el.className = 'nav-item';
        el.dataset.page = child.id;
        el.innerHTML = IC[child.icon] + `<span>${child.label}</span>`;
        el.addEventListener('click', () => navigate(child.id));
        body.appendChild(el);
      });

      group.appendChild(hd);
      group.appendChild(body);
      nav.appendChild(group);
    }
  });

  const footer = document.createElement('div');
  footer.id = 'sidebar-footer';
  footer.style.cssText = 'margin-top:auto;padding:10px 8px;border-top:1px solid var(--border)';
  footer.innerHTML = `
    <div id="storage-status" style="padding:7px 10px;margin-bottom:2px;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px">
      ${IC.hdd} <span id="storage-label">Loading...</span>
    </div>
    <button id="btn-pick-folder" onclick="pickFolder()" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;background:transparent;border:none;border-radius:6px;color:var(--muted);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--card)'" onmouseout="this.style.background='transparent'">
      ${IC.folder} <span id="folder-btn-label">Pick Folder</span>
    </button>
    <button onclick="exportData()" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;background:transparent;border:none;border-radius:6px;color:var(--muted);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--card)'" onmouseout="this.style.background='transparent'">
      ${IC.download} Export JSON
    </button>
    <button onclick="importData()" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;background:transparent;border:none;border-radius:6px;color:var(--muted);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--card)'" onmouseout="this.style.background='transparent'">
      ${IC.upload} Import JSON
    </button>`;
  nav.appendChild(footer);
}

function updateStorageStatus() {
  const labelEl     = document.getElementById('storage-label');
  const btnLabelEl  = document.getElementById('folder-btn-label');
  if (!labelEl) return;
  if (storageMode() === 'folder') {
    labelEl.textContent    = folderName() || 'Folder connected';
    labelEl.style.color    = 'var(--success)';
    btnLabelEl.textContent = 'Change Folder';
  } else {
    labelEl.textContent    = 'localStorage (temporary)';
    labelEl.style.color    = 'var(--warning)';
    btnLabelEl.textContent = 'Pick Permanent Folder';
  }
}

// ── LEAFLET LOADER ─────────────────────────────────────────────────────────
let _leafletReady = false;
let _leafletQueue = [];

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (_leafletReady) { resolve(); return; }
    _leafletQueue.push({ resolve, reject });
    if (_leafletQueue.length > 1) return;
    const sources = [
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
    ];
    let i = 0;
    function tryNext() {
      if (i >= sources.length) {
        _leafletQueue.forEach(cb => cb.reject(new Error('Leaflet CDN failed')));
        _leafletQueue = [];
        return;
      }
      const s = document.createElement('script');
      s.src = sources[i++];
      s.onload = () => {
        if (typeof L !== 'undefined') {
          const gc = document.createElement('script');
          gc.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
          const resolve = () => { _leafletReady = true; _leafletQueue.forEach(cb => cb.resolve()); _leafletQueue = []; };
          gc.onload = resolve;
          gc.onerror = resolve; // degrade gracefully if geocoder fails
          document.head.appendChild(gc);
        } else tryNext();
      };
      s.onerror = tryNext;
      document.head.appendChild(s);
    }
    tryNext();
  });
}

// ── GEO HELPERS ────────────────────────────────────────────────────────────
function haversine(a, b) {
  const R = 6371, r = d => d * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const x = Math.sin(dLat/2)**2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function getSpeedColor(s) {
  if (s <= 0) return '#ef4444';
  if (s < 10) return '#f97316';
  if (s < 20) return '#f59e0b';
  if (s < 35) return '#84cc16';
  return '#22c55e';
}

function buildSpeedTrack(points) {
  const hasSpeed = points.some(p => p.speed > 0);
  if (!hasSpeed) return L.polyline(points.map(p => [p.lat, p.lon]), { color: '#4f7af8', weight: 4, opacity: 0.85 });
  const layers = []; let segStart = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const cc = getSpeedColor(points[i].speed);
    const nc = i + 1 < points.length - 1 ? getSpeedColor(points[i + 1].speed) : null;
    if (nc !== cc) {
      layers.push(L.polyline(points.slice(segStart, i + 2).map(p => [p.lat, p.lon]), { color: cc, weight: 5, opacity: 0.9 }));
      segStart = i + 1;
    }
  }
  if (segStart < points.length - 1)
    layers.push(L.polyline(points.slice(segStart).map(p => [p.lat, p.lon]), { color: getSpeedColor(points[segStart].speed), weight: 5, opacity: 0.9 }));
  return L.featureGroup(layers);
}

function computeStats(points) {
  let dist = 0, maxSpd = 0, elevGain = 0, elevLoss = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversine(points[i-1], points[i]);
    if (points[i].speed > maxSpd) maxSpd = points[i].speed;
    const de = points[i].ele - points[i-1].ele;
    if (de > 0) elevGain += de; else elevLoss -= de;
  }
  const first = points[0].time ? new Date(points[0].time) : null;
  const last  = points[points.length-1].time ? new Date(points[points.length-1].time) : null;
  let duration = '-', durationMs = 0;
  if (first && last) {
    durationMs = last - first;
    duration = `${String(Math.floor(durationMs/60000)).padStart(2,'0')}:${String(Math.floor((durationMs%60000)/1000)).padStart(2,'0')}`;
  }
  // distance / elapsed time, not a mean of per-sample speed readings — this way a real mid-route
  // stop (traffic, red light) correctly drags the average down instead of being silently excluded.
  const avgSpeed = durationMs > 0 ? dist / (durationMs / 3600000) : 0;
  return { distanceKm: dist, maxSpeed: maxSpd, avgSpeed, elevGain: Math.round(elevGain), elevLoss: Math.round(elevLoss), duration };
}

// Detects a "forgot to stop the logger" tail: the first low-speed point after which position
// holds within radiusKm of itself for at least minIdleMin straight AND which still ends up near
// the track's actual final point — signalling the ride is over here and the rest of the file is
// GPS drift/wandering at the destination (indoors, no real movement), not a mid-route stop
// (traffic light, red light, waiting) after which the rider carries on for a real extra leg.
// Anchored to the candidate point itself (not blindly to the file's last point) because indoor
// GPS drift can wander past a fixed radius from any single fixed sample, including the final one
// — hence finalToleranceKm is looser than radiusKm to tolerate hours of accumulated drift.
// The speed gate keeps a fast final-approach sample (which can coincidentally sit within
// radiusKm of where the rider stops moments later, e.g. a compact loop into a driveway) from
// being picked as "arrival" before the rider has actually stopped.
// NB: haversine() here returns kilometers (matches its use in computeStats), hence radiusKm.
function detectArrivalCutoff(points, radiusKm = 0.2, minIdleMin = 15, maxSpeedKmh = 5) {
  const n = points.length;
  if (n < 2) return null;
  const last = points[n - 1];
  if (!last.time) return null;
  const finalToleranceKm = radiusKm * 5;
  const minIdleMs = minIdleMin * 60000;
  for (let i = 0; i < n - 1; i++) {
    if (!points[i].time || points[i].speed > maxSpeedKmh) continue;
    const startMs = new Date(points[i].time).getTime();
    let j = i + 1;
    while (j < n && haversine(points[i], points[j]) <= radiusKm) j++;
    const heldUntil = points[j - 1];
    if (!heldUntil.time) continue;
    const heldMs = new Date(heldUntil.time).getTime() - startMs;
    if (heldMs < minIdleMs) continue;
    if (haversine(points[i], last) > finalToleranceKm) continue;
    const idleMs = new Date(last.time).getTime() - startMs;
    return { cutoffIdx: i, idleMinutes: Math.round(idleMs / 60000) };
  }
  return null;
}

function parseGPX(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('GPX tidak valid');
  const trkpts = xml.querySelectorAll('trkpt');
  if (!trkpts.length) throw new Error('Tidak ada trackpoint di file GPX');
  const points = [];
  trkpts.forEach(pt => {
    const lat = parseFloat(pt.getAttribute('lat')), lon = parseFloat(pt.getAttribute('lon'));
    if (!isNaN(lat) && !isNaN(lon)) points.push({
      lat, lon,
      ele: parseFloat(pt.querySelector('ele')?.textContent || '0'),
      time: pt.querySelector('time')?.textContent || null,
      speed: parseFloat(pt.querySelector('speed')?.textContent || '0') * 3.6,
    });
  });
  const name = xml.querySelector('trk > name')?.textContent || 'Track';
  return { points, name, format: 'GPX' };
}

function parseKML(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('KML tidak valid');
  const coordsEl = xml.querySelector('LineString > coordinates') || xml.querySelector('coordinates');
  if (!coordsEl) throw new Error('Tidak ada koordinat LineString di file KML');
  const points = coordsEl.textContent.trim().split(/\s+/).map(t => {
    const [lon, lat, ele] = t.split(',').map(parseFloat);
    return { lat, lon, ele: ele || 0, time: null, speed: 0 };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
  if (!points.length) throw new Error('Tidak ada koordinat valid');
  const name = xml.querySelector('Placemark > name')?.textContent || 'Track';
  return { points, name, format: 'KML' };
}

function pointInPolygon(point, polygon) {
  const x = point.lon, y = point.lat; let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0], xj = polygon[j][1], yj = polygon[j][0];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-10) + xi)) inside = !inside;
  }
  return inside;
}

// ── GEAR / HARSHNESS COLORS ────────────────────────────────────────────────
const GEAR_COLORS = ['#7b8099','#a78bfa','#4f7af8','#22c55e','#f59e0b','#f97316','#ef4444'];
// index 0 = neutral/stop, 1=G1, 2=G2, 3=G3, 4=G4, 5=G5, 6=G6+

function getGearColor(gear) { return GEAR_COLORS[Math.min(gear, GEAR_COLORS.length - 1)]; }

function getHarshnessColor(h) {
  return h === 'harsh_accel'    ? '#ef4444'
       : h === 'moderate_accel' ? '#f97316'
       : h === 'smooth'         ? '#22c55e'
       : h === 'moderate_brake' ? '#f59e0b'
       : h === 'harsh_brake'    ? '#7c3aed'
       : '#7b8099';
}

// ── RIDING ANALYSIS ────────────────────────────────────────────────────────
function enrichPoints(points, gearConfig) {
  if (!gearConfig || !gearConfig.length) return points.map(p => ({ ...p, estimatedGear: null, harshness: null, accel: null }));

  const sorted = [...gearConfig].sort((a, b) => a.gear - b.gear);

  // 3-point moving average on speed to reduce GPS noise
  const smooth = points.map((p, i) => {
    const prev = points[i - 1]?.speed ?? p.speed;
    const next = points[i + 1]?.speed ?? p.speed;
    return (prev + p.speed + next) / 3;
  });

  const result = [];
  let prevGear = 1;

  for (let i = 0; i < points.length; i++) {
    const p   = points[i];
    const spd = smooth[i];

    let estimatedGear = 0;
    if (spd > 0.5) {
      const candidates = sorted.filter(g => spd >= g.minKmh && spd <= g.maxKmh);
      if (candidates.length === 0) {
        // outside all ranges — pick nearest
        estimatedGear = spd < sorted[0].minKmh
          ? sorted[0].gear
          : sorted[sorted.length - 1].gear;
      } else if (candidates.some(g => g.gear === prevGear)) {
        estimatedGear = prevGear; // hysteresis
      } else {
        estimatedGear = candidates.reduce((best, g) =>
          Math.abs(g.gear - prevGear) < Math.abs(best.gear - prevGear) ? g : best
        ).gear;
      }
      prevGear = estimatedGear;
    }

    // acceleration (km/h per second)
    let accel = null, harshness = 'smooth';
    if (i > 0 && p.time && points[i - 1].time) {
      const dt = (new Date(p.time) - new Date(points[i - 1].time)) / 1000;
      if (dt > 0) {
        accel = (spd - smooth[i - 1]) / dt;
        harshness = accel >  3   ? 'harsh_accel'
                  : accel >  1.5 ? 'moderate_accel'
                  : accel < -3   ? 'harsh_brake'
                  : accel < -1.5 ? 'moderate_brake'
                  : 'smooth';
      }
    }

    result.push({ ...p, estimatedGear, harshness, accel });
  }
  return result;
}

function computeRidingAnalysis(enriched, gearConfig) {
  if (!gearConfig || !gearConfig.length) return null;

  const moving    = enriched.filter(p => p.estimatedGear > 0);
  const withTime  = enriched.filter(p => p.harshness !== null);
  const total     = moving.length || 1;
  const totalH    = withTime.length || 1;

  // gear distribution (% of moving time)
  const gearDist = {};
  moving.forEach(p => { gearDist[p.estimatedGear] = (gearDist[p.estimatedGear] || 0) + 1; });
  Object.keys(gearDist).forEach(g => { gearDist[g] = Math.round(gearDist[g] / total * 100); });

  // harshness distribution
  const hCounts = { smooth: 0, moderate_accel: 0, harsh_accel: 0, moderate_brake: 0, harsh_brake: 0 };
  withTime.forEach(p => { if (p.harshness in hCounts) hCounts[p.harshness]++; });
  const smoothness = {};
  Object.keys(hCounts).forEach(k => { smoothness[k] = Math.round(hCounts[k] / totalH * 100); });

  // rev-hang: speed > gear.maxKmh for 3+ consecutive points
  let revHangCount = 0, lugCount = 0;
  const sorted = [...gearConfig].sort((a, b) => a.gear - b.gear);
  let revRun = 0, lugRun = 0;
  moving.forEach(p => {
    const gcfg = sorted.find(g => g.gear === p.estimatedGear);
    if (gcfg) {
      revRun = p.accel > 0 && p.estimatedGear < sorted[sorted.length - 1].gear && p.speed > gcfg.maxKmh ? revRun + 1 : 0;
      lugRun = p.estimatedGear > sorted[0].gear && p.speed < gcfg.minKmh * 0.7 ? lugRun + 1 : 0;
      if (revRun === 3) revHangCount++;
      if (lugRun === 3) lugCount++;
    }
  });

  // score
  const optimalPct  = moving.filter(p => {
    const gcfg = sorted.find(g => g.gear === p.estimatedGear);
    return gcfg && p.speed >= gcfg.minKmh && p.speed <= gcfg.maxKmh;
  }).length / total;
  const smoothPct   = hCounts.smooth / totalH;
  const gearEff     = 1 - Math.min((revHangCount + lugCount) / Math.max(total / 30, 1), 1);
  const score       = Math.round((optimalPct * 0.4 + smoothPct * 0.4 + gearEff * 0.2) * 100);
  const scoreLabel  = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Poor';
  const scoreColor  = score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--accent)' : score >= 55 ? 'var(--warning)' : 'var(--danger)';

  return { score, scoreLabel, scoreColor, gearDist, smoothness, revHangCount, lugCount, hasGearData: true };
}

function buildGearTrack(points) {
  const layers = []; let segStart = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const cc = getGearColor(points[i].estimatedGear ?? 0);
    const nc = getGearColor(points[i + 1].estimatedGear ?? 0);
    if (nc !== cc) {
      layers.push(L.polyline(points.slice(segStart, i + 2).map(p => [p.lat, p.lon]), { color: cc, weight: 5, opacity: 0.9 }));
      segStart = i + 1;
    }
  }
  if (segStart < points.length - 1)
    layers.push(L.polyline(points.slice(segStart).map(p => [p.lat, p.lon]), { color: getGearColor(points[segStart].estimatedGear ?? 0), weight: 5, opacity: 0.9 }));
  return L.featureGroup(layers);
}

function buildHarshnessTrack(points) {
  const layers = []; let segStart = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const cc = getHarshnessColor(points[i].harshness);
    const nc = getHarshnessColor(points[i + 1].harshness);
    if (nc !== cc) {
      layers.push(L.polyline(points.slice(segStart, i + 2).map(p => [p.lat, p.lon]), { color: cc, weight: 5, opacity: 0.9 }));
      segStart = i + 1;
    }
  }
  if (segStart < points.length - 1)
    layers.push(L.polyline(points.slice(segStart).map(p => [p.lat, p.lon]), { color: getHarshnessColor(points[segStart].harshness), weight: 5, opacity: 0.9 }));
  return L.featureGroup(layers);
}

function _stub(title) {
  return `<div class="page"><div class="page-header"><div class="page-title">${title}</div></div><p class="text-muted">Loading...</p></div>`;
}

// ── INIT ───────────────────────────────────────────────────────────────────
async function init() {
  buildSidebar();
  document.getElementById('modal-save-btn').addEventListener('click', () => { if (_modalSave) _modalSave(); });
  await initStorage();
  updateStorageStatus();
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
