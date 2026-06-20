// ── VEHICLES ────────────────────────────────────────────────────────────────
function pageVehicles(el) {
  function render() {
    const rows = db(KEYS.vehicles);
    const tbody = rows.length === 0
      ? `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No vehicles yet. Click "+ Add" to add one.</td></tr>`
      : rows.map(v => `<tr>
          <td><strong>${esc(v.plate)}</strong></td>
          <td>${esc(v.brand)} ${esc(v.model)}</td>
          <td>${esc(v.year || '-')}</td>
          <td>${esc(v.cc ? v.cc + ' cc' : '-')}</td>
          <td>${esc(v.color || '-')}</td>
          <td>${v.theoreticalConsumption ? v.theoreticalConsumption + ' km/L' : '-'}</td>
          <td><span class="badge ${v.status === 'active' ? 'badge-success' : 'badge-muted'}">${v.status === 'active' ? 'Active' : 'Inactive'}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="openVehicleForm('${v.id}')">${IC.edit}</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="deleteVehicle('${v.id}')">${IC.trash}</button>
          </div></td>
        </tr>`).join('');

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Vehicles</div><div class="page-sub">Vehicle master data</div></div>
        <button class="btn btn-primary" onclick="openVehicleForm()">${IC.plus} Add</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Plate</th><th>Vehicle</th><th>Year</th><th>CC</th><th>Color</th><th>Economy</th><th>Status</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.openVehicleForm = function(id) {
    const v = id ? dbGet(KEYS.vehicles, id) : {};
    const title = id ? 'Edit Vehicle' : 'Add Vehicle';
    showModal(title, `<div class="form-grid">
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Name / Label</label><input id="vf-name" value="${esc(v.name||'')}" placeholder="e.g.: Daily Bike"></div>
        <div class="form-group"><label>Plate Number</label><input id="vf-plate" value="${esc(v.plate||'')}" placeholder="B 1234 ABC"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Brand</label><input id="vf-brand" value="${esc(v.brand||'')}" placeholder="Honda"></div>
        <div class="form-group"><label>Model</label><input id="vf-model" value="${esc(v.model||'')}" placeholder="PCX 160"></div>
      </div>
      <div class="form-grid form-grid-3">
        <div class="form-group"><label>Year</label><input id="vf-year" type="number" value="${v.year||''}" placeholder="2022"></div>
        <div class="form-group"><label>CC</label><input id="vf-cc" type="number" value="${v.cc||''}" placeholder="160"></div>
        <div class="form-group"><label>Color</label><input id="vf-color" value="${esc(v.color||'')}" placeholder="White"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Fuel Type</label>
          <select id="vf-fuel">
            ${['Pertalite','Pertamax','Pertamax Turbo','Solar'].map(f=>`<option${v.fuelType===f?' selected':''}>${f}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Tank Capacity (L)</label><input id="vf-cap" type="number" step="0.1" value="${v.fuelCapacity||''}" placeholder="8.1"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Theoretical Economy (km/L)</label><input id="vf-cons" type="number" step="0.1" value="${v.theoreticalConsumption||''}" placeholder="45.2"></div>
        <div class="form-group"><label>Initial Odometer (km)</label><input id="vf-odo" type="number" value="${v.odometer||''}" placeholder="0"></div>
      </div>
      <div class="form-group"><label>Status</label>
        <select id="vf-status"><option value="active"${v.status!=='inactive'?' selected':''}>Active</option><option value="inactive"${v.status==='inactive'?' selected':''}>Inactive</option></select>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="vf-notes">${esc(v.notes||'')}</textarea></div>
    </div>`, () => {
      const plate = document.getElementById('vf-plate').value.trim().toUpperCase();
      if (!plate) { toast('Plate number is required', 'error'); return; }
      const rec = {
        name: document.getElementById('vf-name').value.trim(),
        plate,
        brand: document.getElementById('vf-brand').value.trim(),
        model: document.getElementById('vf-model').value.trim(),
        year: parseInt(document.getElementById('vf-year').value) || null,
        cc: parseInt(document.getElementById('vf-cc').value) || null,
        color: document.getElementById('vf-color').value.trim(),
        fuelType: document.getElementById('vf-fuel').value,
        fuelCapacity: parseFloat(document.getElementById('vf-cap').value) || null,
        theoreticalConsumption: parseFloat(document.getElementById('vf-cons').value) || null,
        odometer: parseInt(document.getElementById('vf-odo').value) || 0,
        status: document.getElementById('vf-status').value,
        notes: document.getElementById('vf-notes').value.trim(),
      };
      if (id) dbUpdate(KEYS.vehicles, id, rec); else dbAdd(KEYS.vehicles, rec);
      closeModal(); toast(id ? 'Vehicle updated' : 'Vehicle added'); render();
    });
  };

  window.deleteVehicle = function(id) {
    const v = dbGet(KEYS.vehicles, id);
    if (!confirm(`Delete vehicle "${v ? v.plate : id}"?`)) return;
    dbDelete(KEYS.vehicles, id); toast('Vehicle deleted', 'error'); render();
  };

  render();
}

// ── DRIVERS ─────────────────────────────────────────────────────────────────
function pageDrivers(el) {
  function render() {
    const rows = db(KEYS.drivers);
    const tbody = rows.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No drivers yet. Click "+ Add" to add one.</td></tr>`
      : rows.map(d => `<tr>
          <td><strong>${esc(d.name)}</strong></td>
          <td>${esc(d.phone || '-')}</td>
          <td>${d.birthDate ? fmtDate(d.birthDate) : '-'}</td>
          <td>${esc(d.address || '-')}</td>
          <td><span class="badge ${d.status === 'active' ? 'badge-success' : 'badge-muted'}">${d.status === 'active' ? 'Active' : 'Inactive'}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="openDriverForm('${d.id}')">${IC.edit}</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="deleteDriver('${d.id}')">${IC.trash}</button>
          </div></td>
        </tr>`).join('');

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Drivers</div><div class="page-sub">Driver master data</div></div>
        <button class="btn btn-primary" onclick="openDriverForm()">${IC.plus} Add</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Date of Birth</th><th>Address</th><th>Status</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.openDriverForm = function(id) {
    const d = id ? dbGet(KEYS.drivers, id) : {};
    showModal(id ? 'Edit Driver' : 'Add Driver', `<div class="form-grid">
      <div class="form-group"><label>Full Name</label><input id="df-name" value="${esc(d.name||'')}" placeholder="John Doe"></div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Phone Number</label><input id="df-phone" value="${esc(d.phone||'')}" placeholder="+62..."></div>
        <div class="form-group"><label>Date of Birth</label><input id="df-birth" type="date" value="${d.birthDate||''}"></div>
      </div>
      <div class="form-group"><label>Address</label><textarea id="df-addr">${esc(d.address||'')}</textarea></div>
      <div class="form-group"><label>Status</label>
        <select id="df-status"><option value="active"${d.status!=='inactive'?' selected':''}>Active</option><option value="inactive"${d.status==='inactive'?' selected':''}>Inactive</option></select>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="df-notes">${esc(d.notes||'')}</textarea></div>
    </div>`, () => {
      const name = document.getElementById('df-name').value.trim();
      if (!name) { toast('Name is required', 'error'); return; }
      const rec = {
        name,
        phone: document.getElementById('df-phone').value.trim(),
        birthDate: document.getElementById('df-birth').value || null,
        address: document.getElementById('df-addr').value.trim(),
        status: document.getElementById('df-status').value,
        notes: document.getElementById('df-notes').value.trim(),
      };
      if (id) dbUpdate(KEYS.drivers, id, rec); else dbAdd(KEYS.drivers, rec);
      closeModal(); toast(id ? 'Driver updated' : 'Driver added'); render();
    });
  };

  window.deleteDriver = function(id) {
    const d = dbGet(KEYS.drivers, id);
    if (!confirm(`Delete driver "${d ? d.name : id}"?`)) return;
    dbDelete(KEYS.drivers, id); toast('Driver deleted', 'error'); render();
  };

  render();
}

// ── DRIVER LICENSES ─────────────────────────────────────────────────────────
function pageDriverLicenses(el) {
  function render() {
    const rows = db(KEYS.driverLicenses);
    const drivers = db(KEYS.drivers);
    const tbody = rows.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No license data.</td></tr>`
      : rows.map(l => {
          const drv = drivers.find(d => d.id === l.driverId);
          return `<tr>
            <td>${esc(drv ? drv.name : '-')}</td>
            <td><span class="badge badge-accent">${esc(l.simType)}</span></td>
            <td>${esc(l.simNumber || '-')}</td>
            <td>${fmtDate(l.issueDate)}</td>
            <td>${expiryBadge(l.expiryDate)}</td>
            <td><div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="openSimForm('${l.id}')">${IC.edit}</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="deleteSim('${l.id}')">${IC.trash}</button>
            </div></td>
          </tr>`;
        }).join('');

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Driver Licenses</div><div class="page-sub">Driver license records with expiry tracking</div></div>
        <button class="btn btn-primary" onclick="openSimForm()">${IC.plus} Add</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Driver</th><th>Type</th><th>License No.</th><th>Issue Date</th><th>Expiry</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.openSimForm = function(id) {
    const l = id ? dbGet(KEYS.driverLicenses, id) : {};
    const drivers = db(KEYS.drivers);
    const drvOptions = drivers.map(d => `<option value="${d.id}"${l.driverId===d.id?' selected':''}>${esc(d.name)}</option>`).join('');
    const simTypes = ['SIM A','SIM B1','SIM B2','SIM C','SIM C1','SIM C2','SIM D'];
    const typeOpts = simTypes.map(t => `<option${l.simType===t?' selected':''}>${t}</option>`).join('');
    showModal(id ? 'Edit License' : 'Add License', `<div class="form-grid">
      <div class="form-group"><label>Driver</label><select id="sf-driver"><option value="">-- Select Driver --</option>${drvOptions}</select></div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>License Type</label><select id="sf-type">${typeOpts}</select></div>
        <div class="form-group"><label>License Number</label><input id="sf-num" value="${esc(l.simNumber||'')}" placeholder="1234567890123456"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Issue Date</label><input id="sf-issue" type="date" value="${l.issueDate||''}"></div>
        <div class="form-group"><label>Expiry Date</label><input id="sf-expiry" type="date" value="${l.expiryDate||''}"></div>
      </div>
    </div>`, () => {
      const driverId = document.getElementById('sf-driver').value;
      if (!driverId) { toast('Please select a driver', 'error'); return; }
      const rec = {
        driverId,
        simType: document.getElementById('sf-type').value,
        simNumber: document.getElementById('sf-num').value.trim(),
        issueDate: document.getElementById('sf-issue').value || null,
        expiryDate: document.getElementById('sf-expiry').value || null,
      };
      if (id) dbUpdate(KEYS.driverLicenses, id, rec); else dbAdd(KEYS.driverLicenses, rec);
      closeModal(); toast(id ? 'License updated' : 'License added'); render();
    });
  };

  window.deleteSim = function(id) {
    if (!confirm('Delete this license?')) return;
    dbDelete(KEYS.driverLicenses, id); toast('License deleted', 'error'); render();
  };

  render();
}

// ── VEHICLE LICENSES (STNK) ─────────────────────────────────────────────────
function pageVehicleLicenses(el) {
  function render() {
    const rows = db(KEYS.vehicleLicenses);
    const vehicles = db(KEYS.vehicles);
    const tbody = rows.length === 0
      ? `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No registration data.</td></tr>`
      : rows.map(l => {
          const veh = vehicles.find(v => v.id === l.vehicleId);
          return `<tr>
            <td><strong>${esc(veh ? veh.plate : '-')}</strong><br><span class="text-muted" style="font-size:12px">${esc(veh ? veh.brand + ' ' + veh.model : '')}</span></td>
            <td>${esc(l.stnkNumber || '-')}</td>
            <td>${esc(l.ownerName || '-')}</td>
            <td>${fmtDate(l.issueDate)}</td>
            <td>${expiryBadge(l.expiryDate)}</td>
            <td>${l.taxAmount ? fmtCur(l.taxAmount) : '-'}</td>
            <td><div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="openStnkForm('${l.id}')">${IC.edit}</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="deleteStnk('${l.id}')">${IC.trash}</button>
            </div></td>
          </tr>`;
        }).join('');

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Vehicle Registration (STNK)</div><div class="page-sub">Vehicle registration records with expiry tracking</div></div>
        <button class="btn btn-primary" onclick="openStnkForm()">${IC.plus} Add</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Vehicle</th><th>Reg. No.</th><th>Registered Name</th><th>Issue Date</th><th>Expiry</th><th>Tax</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.openStnkForm = function(id) {
    const l = id ? dbGet(KEYS.vehicleLicenses, id) : {};
    const vehicles = db(KEYS.vehicles);
    const vehOpts = vehicles.map(v => `<option value="${v.id}"${l.vehicleId===v.id?' selected':''}>${esc(v.plate)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join('');
    showModal(id ? 'Edit Registration' : 'Add Registration', `<div class="form-grid">
      <div class="form-group"><label>Vehicle</label><select id="stf-veh"><option value="">-- Select Vehicle --</option>${vehOpts}</select></div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Reg. Number</label><input id="stf-num" value="${esc(l.stnkNumber||'')}" placeholder="12345678"></div>
        <div class="form-group"><label>Registered Name</label><input id="stf-owner" value="${esc(l.ownerName||'')}" placeholder="Owner name"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Issue Date</label><input id="stf-issue" type="date" value="${l.issueDate||''}"></div>
        <div class="form-group"><label>Expiry Date</label><input id="stf-expiry" type="date" value="${l.expiryDate||''}"></div>
      </div>
      <div class="form-group"><label>Tax Amount (Rp)</label><input id="stf-tax" type="number" value="${l.taxAmount||''}" placeholder="500000"></div>
    </div>`, () => {
      const vehicleId = document.getElementById('stf-veh').value;
      if (!vehicleId) { toast('Please select a vehicle', 'error'); return; }
      const rec = {
        vehicleId,
        stnkNumber: document.getElementById('stf-num').value.trim(),
        ownerName: document.getElementById('stf-owner').value.trim(),
        issueDate: document.getElementById('stf-issue').value || null,
        expiryDate: document.getElementById('stf-expiry').value || null,
        taxAmount: parseInt(document.getElementById('stf-tax').value) || null,
      };
      if (id) dbUpdate(KEYS.vehicleLicenses, id, rec); else dbAdd(KEYS.vehicleLicenses, rec);
      closeModal(); toast(id ? 'Registration updated' : 'Registration added'); render();
    });
  };

  window.deleteStnk = function(id) {
    if (!confirm('Delete this registration?')) return;
    dbDelete(KEYS.vehicleLicenses, id); toast('Registration deleted', 'error'); render();
  };

  render();
}

// ── GEOFENCES ───────────────────────────────────────────────────────────────
function pageGeofences(el) {
  let gfMap = null, gfMarkers = [], gfDrawPoints = [], gfDrawLayer = null, gfDrawing = false;
  const gfRuntimeLayers = {};

  function renderPanel() {
    const geofences = db(KEYS.geofences);
    const listHtml = geofences.length === 0
      ? `<div class="empty-state" style="padding:20px 0"><p>No geofences saved</p></div>`
      : geofences.map(g => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="color-dot" style="background:${esc(g.color)};flex-shrink:0"></span>
          <span style="flex:1;font-size:13px">${esc(g.name)}</span>
          <span class="text-muted" style="font-size:11px">${g.latlngs.length} points</span>
          <button class="btn btn-ghost btn-sm" onclick="gfZoom('${g.id}')" title="Zoom">${IC.eye}</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="gfDelete('${g.id}')" title="Delete">${IC.trash}</button>
        </div>`).join('');

    el.innerHTML = `
      <div class="tracking-panel" style="width:360px">
        <div style="padding:4px 0 12px">
          <div style="font-size:16px;font-weight:600">Geofence Library</div>
          <div class="text-muted" style="font-size:12px;margin-top:2px">Manage geofence areas</div>
        </div>

        <div class="panel-section">
          <div class="panel-section-title">Create New Geofence</div>
          <div class="form-grid" style="gap:8px">
            <div class="form-group">
              <label>Name</label>
              <input id="gf-name" placeholder="e.g.: Home, Office">
            </div>
            <div style="display:flex;gap:8px;align-items:flex-end">
              <div class="form-group" style="flex:1">
                <label>Color</label>
                <input type="color" id="gf-color" value="#10b981" style="height:36px;padding:3px 6px;cursor:pointer">
              </div>
              <button class="btn btn-primary" id="gf-draw-btn" onclick="gfStartDraw()" style="height:36px">Start Drawing</button>
              <button class="btn btn-danger" id="gf-cancel-btn" onclick="gfCancelDraw()" style="height:36px;display:none">Cancel</button>
            </div>
            <div id="gf-hint" class="info-box info" style="display:none;font-size:12px">
              Click map to add points &bull; Double-click to finish (min. 3 points)
            </div>
          </div>
        </div>

        <div class="panel-section" style="flex:1;overflow-y:auto">
          <div class="panel-section-title">Saved (${geofences.length})</div>
          ${listHtml}
        </div>
      </div>
      <div id="gf-map" style="flex:1"></div>`;

    if (!gfMap) {
      loadLeaflet().then(() => {
        gfMap = L.map('gf-map').setView([-6.2, 106.9], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(gfMap);
        if (L.Control.Geocoder) {
          L.Control.geocoder({ defaultMarkGeocode: false, geocoder: L.Control.Geocoder.nominatim() })
            .on('markgeocode', e => gfMap.fitBounds(e.geocode.bbox))
            .addTo(gfMap);
        }
        db(KEYS.geofences).forEach(g => addGfLayer(g));
        setupGfMapEvents();
      }).catch(e => {
        document.getElementById('gf-map').innerHTML = `<div style="padding:24px;color:var(--danger)">Failed to load map: ${e.message}</div>`;
      });
    } else {
      db(KEYS.geofences).forEach(g => { if (!gfRuntimeLayers[g.id]) addGfLayer(g); });
    }
  }

  function addGfLayer(g) {
    const layer = L.polygon(g.latlngs, { color: g.color, fillColor: g.color, fillOpacity: 0.18, weight: 2 })
      .addTo(gfMap).bindPopup(`<b>${g.name}</b>`);
    gfRuntimeLayers[g.id] = layer;
  }

  function setupGfMapEvents() {
    gfMap.on('click', e => {
      if (!gfDrawing) return;
      gfDrawPoints.push([e.latlng.lat, e.latlng.lng]);
      const m = L.circleMarker(e.latlng, { radius: 5, color: '#fff', fillColor: '#4f7af8', fillOpacity: 1, weight: 2 }).addTo(gfMap);
      gfMarkers.push(m);
      if (gfDrawLayer) gfMap.removeLayer(gfDrawLayer);
      if (gfDrawPoints.length >= 2) {
        const col = document.getElementById('gf-color').value;
        gfDrawLayer = L.polyline(gfDrawPoints, { color: col, weight: 3, dashArray: '6,4' }).addTo(gfMap);
      }
    });
    gfMap.on('dblclick', e => {
      if (!gfDrawing) return;
      e.originalEvent.preventDefault();
      if (gfDrawPoints.length < 3) { toast('Minimum 3 points for a polygon', 'error'); return; }
      gfFinalizePolygon();
    });
  }

  window.gfStartDraw = function() {
    const name = document.getElementById('gf-name').value.trim();
    if (!name) { toast('Enter a geofence name first', 'error'); return; }
    gfDrawing = true; gfDrawPoints = []; gfMarkers = [];
    gfMap.getContainer().style.cursor = 'crosshair';
    gfMap.doubleClickZoom.disable();
    document.getElementById('gf-draw-btn').style.display = 'none';
    document.getElementById('gf-cancel-btn').style.display = '';
    document.getElementById('gf-hint').style.display = '';
  };

  window.gfCancelDraw = function() {
    gfDrawing = false; gfDrawPoints = [];
    gfMarkers.forEach(m => gfMap.removeLayer(m)); gfMarkers = [];
    if (gfDrawLayer) { gfMap.removeLayer(gfDrawLayer); gfDrawLayer = null; }
    gfMap.getContainer().style.cursor = '';
    gfMap.doubleClickZoom.enable();
    document.getElementById('gf-draw-btn').style.display = '';
    document.getElementById('gf-cancel-btn').style.display = 'none';
    document.getElementById('gf-hint').style.display = 'none';
  };

  function gfFinalizePolygon() {
    const name  = document.getElementById('gf-name').value.trim();
    const color = document.getElementById('gf-color').value;
    const rec = { name, color, latlngs: gfDrawPoints.slice() };
    dbAdd(KEYS.geofences, rec);
    gfMarkers.forEach(m => gfMap.removeLayer(m));
    if (gfDrawLayer) gfMap.removeLayer(gfDrawLayer);
    gfDrawLayer = null; gfMarkers = [];
    gfDrawing = false;
    gfMap.getContainer().style.cursor = '';
    gfMap.doubleClickZoom.enable();
    toast('Geofence saved');
    renderPanel();
    const saved = db(KEYS.geofences);
    const last = saved[saved.length - 1];
    if (last) addGfLayer(last);
  }

  window.gfZoom = function(id) {
    const layer = gfRuntimeLayers[id];
    if (layer) gfMap.fitBounds(layer.getBounds(), { padding: [40, 40] });
  };

  window.gfDelete = function(id) {
    const g = dbGet(KEYS.geofences, id);
    if (!confirm(`Delete geofence "${g ? g.name : id}"?`)) return;
    if (gfRuntimeLayers[id]) { gfMap.removeLayer(gfRuntimeLayers[id]); delete gfRuntimeLayers[id]; }
    dbDelete(KEYS.geofences, id); toast('Geofence deleted', 'error'); renderPanel();
  };

  renderPanel();
}

PAGES.vehicles        = pageVehicles;
PAGES.drivers         = pageDrivers;
PAGES.driverLicenses  = pageDriverLicenses;
PAGES.vehicleLicenses = pageVehicleLicenses;
PAGES.geofences       = pageGeofences;
