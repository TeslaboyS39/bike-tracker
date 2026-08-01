// ── MAINTENANCE LOG ─────────────────────────────────────────────────────────
function pageMaintenance(el) {
  const TYPES = [
    'Oil Change', 'Oil Filter', 'Air Filter', 'Spark Plug',
    'Tune Up', 'Regular Service', 'Chain', 'Gear Set',
    'Front Brake Pad', 'Rear Brake Pad',
    'Front Tire', 'Rear Tire', 'Battery', 'Other',
  ];
  const SVC = {
    'Oil Change':       { days: 90,   km: 3000  },
    'Oil Filter':       { days: 180,  km: 6000  },
    'Air Filter':       { days: 180,  km: 10000 },
    'Spark Plug':       { days: null, km: 8000  },
    'Tune Up':          { days: 180,  km: 8000  },
    'Regular Service':  { days: 90,   km: 3000  },
    'Chain':            { days: null, km: 10000 },
    'Gear Set':         { days: null, km: 20000 },
    'Front Brake Pad':  { days: null, km: 15000 },
    'Rear Brake Pad':   { days: null, km: 10000 },
    'Front Tire':       { days: 730,  km: 20000 },
    'Rear Tire':        { days: 730,  km: 15000 },
    'Battery':          { days: 730,  km: null  },
  };

  window.maintAutoSuggest = function() {
    const checked = [...document.querySelectorAll('.maint-type-cb:checked')].map(cb => cb.value);
    const date    = document.getElementById('mf-date').value;
    const odo     = parseInt(document.getElementById('mf-odo').value) || null;
    let minDays = Infinity, minKm = Infinity;
    checked.forEach(t => {
      if (SVC[t]?.days) minDays = Math.min(minDays, SVC[t].days);
      if (SVC[t]?.km)   minKm   = Math.min(minKm,   SVC[t].km);
    });
    if (date && minDays < Infinity) {
      const d = new Date(date + 'T00:00'); d.setDate(d.getDate() + minDays);
      document.getElementById('mf-ndate').value = d.toISOString().slice(0, 10);
    }
    if (odo && minKm < Infinity) {
      document.getElementById('mf-nodo').value = odo + minKm;
    }
  };

  function render() {
    const logs     = [...db(KEYS.maintenance)].sort((a, b) => new Date(b.date) - new Date(a.date));
    const vehicles = db(KEYS.vehicles);

    const tbody = logs.length === 0
      ? `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No maintenance records.</td></tr>`
      : logs.map(m => {
          const veh   = vehicles.find(v => v.id === m.vehicleId);
          const types = Array.isArray(m.types) ? m.types : (m.type ? [m.type] : []);
          let nextBadge = '-';
          if (m.nextDueDate) nextBadge = expiryBadge(m.nextDueDate);
          else if (m.nextDueOdometer) nextBadge = `<span class="badge badge-muted">${fmtNum(m.nextDueOdometer)} km</span>`;
          return `<tr>
            <td>${fmtDate(m.date)}</td>
            <td>${esc(veh ? veh.plate : '-')}</td>
            <td><div style="display:flex;flex-wrap:wrap;gap:3px">${types.map(t => `<span class="badge badge-accent">${esc(t)}</span>`).join('')}</div></td>
            <td>${esc(m.description || '-')}</td>
            <td>${m.odometer ? fmtNum(m.odometer) + ' km' : '-'}</td>
            <td>${m.cost ? fmtCur(m.cost) : '-'}</td>
            <td>${nextBadge}</td>
            <td><div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="openMaintForm('${m.id}')">${IC.edit}</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="deleteMaint('${m.id}')">${IC.trash}</button>
            </div></td>
          </tr>`;
        }).join('');

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Maintenance Log</div><div class="page-sub">Vehicle service and maintenance history</div></div>
        <button class="btn btn-primary" onclick="openMaintForm()">${IC.plus} Add</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Vehicle</th><th>Service Type</th><th>Description</th><th>Odometer</th><th>Cost</th><th>Next Due</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.openMaintForm = function(id) {
    const m        = id ? dbGet(KEYS.maintenance, id) : {};
    const vehicles = db(KEYS.vehicles);
    const vehOpts  = vehicles.map(v => `<option value="${v.id}"${m.vehicleId===v.id?' selected':''}>${esc(v.plate)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join('');
    const selTypes = Array.isArray(m.types) ? m.types : (m.type ? [m.type] : []);
    const typePills = TYPES.map(t => {
      const sel = selTypes.includes(t);
      return `<label style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:var(--card);border:1px solid ${sel ? 'var(--accent)' : 'var(--border)'};border-radius:20px;cursor:pointer;font-size:12px">
        <input type="checkbox" class="maint-type-cb" value="${t}" ${sel ? 'checked' : ''} onchange="maintAutoSuggest()" style="accent-color:var(--accent)">
        ${esc(t)}
      </label>`;
    }).join('');

    showModal(id ? 'Edit Maintenance' : 'Add Maintenance', `<div class="form-grid">
      <div class="form-group">
        <label>Vehicle</label>
        <select id="mf-veh"><option value="">-- Select Vehicle --</option>${vehOpts}</select>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input id="mf-date" type="date" value="${m.date || new Date().toISOString().slice(0,10)}" onchange="maintAutoSuggest()">
      </div>
      <div class="form-group">
        <label>Service Type <span style="color:var(--muted);font-size:11px">— select all that apply</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${typePills}</div>
      </div>
      <div class="form-group"><label>Description</label><input id="mf-desc" value="${esc(m.description||'')}" placeholder="e.g.: Shell Helix HX7 10W-40, AHASS"></div>
      <div class="form-group"><label>Workshop</label><input id="mf-ws" value="${esc(m.workshop||'')}" placeholder="Honda AHASS, Authorized Workshop"></div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Odometer (km)</label><input id="mf-odo" type="number" value="${m.odometer||''}" placeholder="12500" onchange="maintAutoSuggest()"></div>
        <div class="form-group"><label>Cost (Rp)</label><input id="mf-cost" type="number" value="${m.cost||''}" placeholder="150000"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label>Next Due Date <span style="color:var(--accent);font-size:11px">(auto-suggest)</span></label>
          <input id="mf-ndate" type="date" value="${m.nextDueDate||''}">
        </div>
        <div class="form-group">
          <label>Next Due Odometer (km) <span style="color:var(--accent);font-size:11px">(auto-suggest)</span></label>
          <input id="mf-nodo" type="number" value="${m.nextDueOdometer||''}" placeholder="—">
        </div>
      </div>
    </div>`, () => {
      const vehicleId = document.getElementById('mf-veh').value;
      if (!vehicleId) { toast('Please select a vehicle', 'error'); return; }
      const types = [...document.querySelectorAll('.maint-type-cb:checked')].map(cb => cb.value);
      if (!types.length) { toast('Select at least one service type', 'error'); return; }
      const rec = {
        vehicleId,
        date:            document.getElementById('mf-date').value,
        types,
        description:     document.getElementById('mf-desc').value.trim(),
        workshop:        document.getElementById('mf-ws').value.trim(),
        odometer:        parseInt(document.getElementById('mf-odo').value) || null,
        cost:            parseInt(document.getElementById('mf-cost').value) || null,
        nextDueDate:     document.getElementById('mf-ndate').value || null,
        nextDueOdometer: parseInt(document.getElementById('mf-nodo').value) || null,
      };
      if (id) dbUpdate(KEYS.maintenance, id, rec); else dbAdd(KEYS.maintenance, rec);
      closeModal(); toast(id ? 'Maintenance updated' : 'Maintenance recorded'); render();
    });
  };

  window.deleteMaint = function(id) {
    if (!confirm('Delete this maintenance record?')) return;
    dbDelete(KEYS.maintenance, id); toast('Maintenance deleted', 'error'); render();
  };

  render();
}

// ── SPARE PARTS ─────────────────────────────────────────────────────────────
function pageSpareparts(el) {
  const SUGGESTIONS = [
    'Front Brake Pad','Rear Brake Pad','Front Tire','Rear Tire',
    'Chain','Front Sprocket','Rear Sprocket','Gear Set',
    'Engine Oil','Oil Filter','Air Filter','Spark Plug','Battery',
    'Front Wheel Bearing','Rear Wheel Bearing','Front Shock Absorber','Rear Shock Absorber',
    'Clutch','Throttle Cable','Brake Cable','Headlight','Tail Light',
  ];
  const PART_KM = {
    'Front Brake Pad': 15000,'Rear Brake Pad': 10000,
    'Front Tire': 20000,'Rear Tire': 15000,
    'Chain': 10000,'Front Sprocket': 25000,'Rear Sprocket': 15000,'Gear Set': 15000,
    'Engine Oil': 3000,'Oil Filter': 6000,'Air Filter': 10000,'Spark Plug': 8000,
    'Front Wheel Bearing': 30000,'Rear Wheel Bearing': 30000,
  };
  const PART_DAYS = {
    'Front Tire': 730,'Rear Tire': 730,'Battery': 730,
    'Engine Oil': 90,'Oil Filter': 180,'Air Filter': 180,
  };

  window.partAutoSuggest = function() {
    const partName = document.getElementById('sp-name').value;
    const date     = document.getElementById('sp-date').value;
    const odo      = parseInt(document.getElementById('sp-odo').value) || null;
    if (date && PART_DAYS[partName]) {
      const d = new Date(date + 'T00:00'); d.setDate(d.getDate() + PART_DAYS[partName]);
      document.getElementById('sp-ndate').value = d.toISOString().slice(0, 10);
    }
    if (odo && PART_KM[partName]) {
      document.getElementById('sp-nodo').value = odo + PART_KM[partName];
    }
  };

  function render() {
    const parts    = [...db(KEYS.spareParts)].sort((a, b) => new Date(b.replacedDate) - new Date(a.replacedDate));
    const vehicles = db(KEYS.vehicles);

    const tbody = parts.length === 0
      ? `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px">No spare part records.</td></tr>`
      : parts.map(p => {
          const veh      = vehicles.find(v => v.id === p.vehicleId);
          const currOdo  = estOdometer(p.vehicleId);
          const kmUsed   = (currOdo && p.odometerAt) ? currOdo - Number(p.odometerAt) : null;
          const nextKm   = p.nextDueOdometer ? Number(p.nextDueOdometer) : null;
          const kmLeft   = (nextKm && currOdo) ? nextKm - currOdo : null;

          let nextBadge  = '-', statusBadge = '';
          if (p.nextDueDate) {
            nextBadge = expiryBadge(p.nextDueDate);
            const d = daysUntil(p.nextDueDate);
            statusBadge = d < 0 ? `<span class="badge badge-danger">Replace!</span>` :
                          d <= 30 ? `<span class="badge badge-warning">Soon</span>` :
                          `<span class="badge badge-success">OK</span>`;
          } else if (nextKm && currOdo !== null) {
            nextBadge = `<span class="badge badge-muted">${fmtNum(nextKm)} km</span>`;
            statusBadge = kmLeft <= 0 ? `<span class="badge badge-danger">Replace!</span>` :
                          kmLeft <= 500 ? `<span class="badge badge-warning">Soon</span>` :
                          `<span class="badge badge-success">OK</span>`;
          } else if (nextKm) {
            nextBadge = `<span class="badge badge-muted">${fmtNum(nextKm)} km</span>`;
          }

          return `<tr>
            <td><strong>${esc(p.partName)}</strong></td>
            <td>${esc(veh ? veh.plate : '-')}</td>
            <td><span class="badge ${p.category === 'wearable' ? 'badge-warning' : 'badge-muted'}">${p.category === 'wearable' ? 'Wearable' : 'Permanent'}</span></td>
            <td>${fmtDate(p.replacedDate)}</td>
            <td>${p.odometerAt ? fmtNum(p.odometerAt) + ' km' : '-'}</td>
            <td>${kmUsed !== null ? fmtNum(Math.round(kmUsed)) + ' km' : '-'}</td>
            <td>${p.brand ? esc(p.brand) : '-'}</td>
            <td>${p.cost ? fmtCur(p.cost) : '-'}</td>
            <td>${nextBadge}</td>
            <td>${statusBadge || '-'}</td>
            <td><div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="openPartForm('${p.id}')">${IC.edit}</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="deletePart('${p.id}')">${IC.trash}</button>
            </div></td>
          </tr>`;
        }).join('');

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Spare Parts</div><div class="page-sub">Component replacement monitoring &amp; lifetime tracking</div></div>
        <button class="btn btn-primary" onclick="openPartForm()">${IC.plus} Add</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Component</th><th>Vehicle</th><th>Type</th><th>Replaced</th><th>Odo at Replace</th><th>Usage</th><th>Brand</th><th>Cost</th><th>Next Due</th><th>Status</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.openPartForm = function(id) {
    const p        = id ? dbGet(KEYS.spareParts, id) : {};
    const vehicles = db(KEYS.vehicles);
    const vehOpts  = vehicles.map(v => `<option value="${v.id}"${p.vehicleId===v.id?' selected':''}>${esc(v.plate)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join('');
    const suggList = SUGGESTIONS.map(s => `<option value="${s}">`).join('');

    showModal(id ? 'Edit Spare Part' : 'Add Spare Part', `
      <datalist id="part-suggestions">${suggList}</datalist>
      <div class="form-grid">
        <div class="form-group">
          <label>Vehicle</label>
          <select id="sp-veh"><option value="">-- Select Vehicle --</option>${vehOpts}</select>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label>Component Name</label>
            <input id="sp-name" list="part-suggestions" value="${esc(p.partName||'')}" placeholder="Front Brake Pad" oninput="partAutoSuggest()">
          </div>
          <div class="form-group">
            <label>Type</label>
            <select id="sp-cat">
              <option value="wearable"${(!p.category || p.category==='wearable') ? ' selected' : ''}>Wearable (regular replacement)</option>
              <option value="non-wearable"${p.category==='non-wearable' ? ' selected' : ''}>Permanent (replace if broken)</option>
            </select>
          </div>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label>Date Replaced</label>
            <input id="sp-date" type="date" value="${p.replacedDate || new Date().toISOString().slice(0,10)}" onchange="partAutoSuggest()">
          </div>
          <div class="form-group">
            <label>Odometer at Replace (km)</label>
            <input id="sp-odo" type="number" value="${p.odometerAt||''}" placeholder="12500" onchange="partAutoSuggest()">
          </div>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group"><label>Brand</label><input id="sp-brand" value="${esc(p.brand||'')}" placeholder="Federal, NGK, Bosch..."></div>
          <div class="form-group"><label>Cost (Rp)</label><input id="sp-cost" type="number" value="${p.cost||''}" placeholder="150000"></div>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label>Next Due Date <span style="color:var(--accent);font-size:11px">(auto-suggest)</span></label>
            <input id="sp-ndate" type="date" value="${p.nextDueDate||''}">
          </div>
          <div class="form-group">
            <label>Next Due Odometer (km) <span style="color:var(--accent);font-size:11px">(auto-suggest)</span></label>
            <input id="sp-nodo" type="number" value="${p.nextDueOdometer||''}" placeholder="—">
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="sp-notes">${esc(p.notes||'')}</textarea></div>
      </div>`, () => {
      const vehicleId = document.getElementById('sp-veh').value;
      const partName  = document.getElementById('sp-name').value.trim();
      if (!vehicleId) { toast('Please select a vehicle', 'error'); return; }
      if (!partName)  { toast('Enter a component name', 'error'); return; }
      const rec = {
        vehicleId, partName,
        category:        document.getElementById('sp-cat').value,
        brand:           document.getElementById('sp-brand').value.trim(),
        replacedDate:    document.getElementById('sp-date').value,
        odometerAt:      parseInt(document.getElementById('sp-odo').value) || null,
        nextDueDate:     document.getElementById('sp-ndate').value || null,
        nextDueOdometer: parseInt(document.getElementById('sp-nodo').value) || null,
        cost:            parseInt(document.getElementById('sp-cost').value) || null,
        notes:           document.getElementById('sp-notes').value.trim(),
      };
      if (id) dbUpdate(KEYS.spareParts, id, rec); else dbAdd(KEYS.spareParts, rec);
      closeModal(); toast(id ? 'Spare part updated' : 'Spare part recorded'); render();
    });
  };

  window.deletePart = function(id) {
    if (!confirm('Delete this spare part record?')) return;
    dbDelete(KEYS.spareParts, id); toast('Spare part deleted', 'error'); render();
  };

  render();
}

PAGES.maintenance = pageMaintenance;
PAGES.spareParts  = pageSpareparts;
