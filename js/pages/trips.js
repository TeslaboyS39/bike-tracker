// ── TRIP LOG ────────────────────────────────────────────────────────────────
function pageTripLog(el) {
  function render(filterVehicleId) {
    const trips    = db(KEYS.trips);
    const vehicles = db(KEYS.vehicles);
    const drivers  = db(KEYS.drivers);
    const vehOpts  = vehicles.map(v => `<option value="${v.id}"${filterVehicleId===v.id?' selected':''}>${esc(v.plate)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join('');
    const filtered = filterVehicleId ? trips.filter(t => t.vehicleId === filterVehicleId) : trips;
    const sorted   = [...filtered].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    const tbody = sorted.length === 0
      ? `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No saved trips.</td></tr>`
      : sorted.map(t => {
          const veh = vehicles.find(v => v.id === t.vehicleId);
          const drv = drivers.find(d => d.id === t.driverId);
          const dist = t.stats ? Number(t.stats.distanceKm).toFixed(1) : '-';

          // auto-compute + cache for trips saved before riding analysis feature
          let ra = t.ridingAnalysis;
          if (!ra?.hasGearData && veh?.gearConfig?.length && t.points?.length) {
            const enriched = enrichPoints(t.points, veh.gearConfig);
            ra = computeRidingAnalysis(enriched, veh.gearConfig);
            dbUpdate(KEYS.trips, t.id, { ridingAnalysis: ra }); // cache so next load is instant
          }

          const score = ra?.hasGearData
            ? `<span class="badge" style="background:transparent;border:1px solid ${ra.scoreColor};color:${ra.scoreColor}">${ra.score} ${ra.scoreLabel}</span>`
            : '<span class="badge badge-muted">-</span>';
          return `<tr>
            <td>${fmtDate(t.date || t.savedAt)}</td>
            <td><strong>${esc(t.name)}</strong></td>
            <td>${esc(veh ? veh.plate : '-')}</td>
            <td>${esc(drv ? drv.name : '-')}</td>
            <td>${dist} km</td>
            <td><span class="badge badge-muted">${esc(t.format || '-')}</span></td>
            <td>${score}</td>
            <td><div class="td-actions">
              <button class="btn btn-ghost btn-sm" title="View on map" onclick="viewTrip('${t.id}')">${IC.eye}</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="deleteTrip('${t.id}')">${IC.trash}</button>
            </div></td>
          </tr>`;
        }).join('');

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Trip Log</div><div class="page-sub">History of all saved trips</div></div>
      </div>
      <div class="filter-bar">
        <select id="tl-filter-veh" onchange="renderTripFilter(this.value)">
          <option value="">All Vehicles</option>${vehOpts}
        </select>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Trip Name</th><th>Vehicle</th><th>Driver</th><th>Distance</th><th>Format</th><th>Riding</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.renderTripFilter = id => render(id);

  window.viewTrip = function(id) {
    window._pendingTripId = id;
    navigate('tracking');
  };

  window.deleteTrip = function(id) {
    if (!confirm('Delete this trip?')) return;
    dbDelete(KEYS.trips, id); toast('Trip deleted', 'error'); render();
  };

  render();
}

// ── FUEL LOG ────────────────────────────────────────────────────────────────
function pageFuelLog(el) {
  const fuelTs = l => new Date((l.date || '') + 'T' + (l.time || '00:00'));
  const fuelDtLabel = l => fmtDate(l.date) + (l.time ? ' ' + l.time : '');

  function render() {
    const logs     = [...db(KEYS.fuelLogs)].sort((a, b) => fuelTs(b) - fuelTs(a));
    const vehicles = db(KEYS.vehicles);

    const tbody = logs.length === 0
      ? `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No fuel entries yet.</td></tr>`
      : logs.map(l => {
          const veh   = vehicles.find(v => v.id === l.vehicleId);
          const total = l.liters && l.pricePerLiter ? (l.liters * l.pricePerLiter) : null;
          return `<tr>
            <td>
              <div>${fmtDate(l.date)}</div>
              ${l.time ? `<div style="font-size:11px;color:var(--muted)">${l.time}</div>` : ''}
            </td>
            <td>${esc(veh ? veh.plate : '-')}</td>
            <td>${l.liters ? Number(l.liters).toFixed(2) + ' L' : '-'}</td>
            <td>${l.pricePerLiter ? fmtCur(l.pricePerLiter) + '/L' : '-'}</td>
            <td>${total ? fmtCur(total) : '-'}</td>
            <td>${l.odometer != null ? fmtNum(l.odometer) + ' km' : '-'}</td>
            <td>${esc(l.station || '-')}</td>
            <td><div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="openFuelForm('${l.id}')">${IC.edit}</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="deleteFuel('${l.id}')">${IC.trash}</button>
            </div></td>
          </tr>`;
        }).join('');

    const totalSpend = logs.reduce((s, l) => s + (l.liters && l.pricePerLiter ? l.liters * l.pricePerLiter : 0), 0);
    const totalLit   = logs.reduce((s, l) => s + (l.liters || 0), 0);

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Fuel Log</div><div class="page-sub">Vehicle fuel fill records</div></div>
        <button class="btn btn-primary" onclick="openFuelForm()">${IC.plus} Add</button>
      </div>
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="kpi-card"><div class="kpi-label">Total Fills</div><div class="kpi-value">${logs.length}x</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Liters</div><div class="kpi-value">${totalLit.toFixed(1)}<span style="font-size:14px;font-weight:400;color:var(--muted)"> L</span></div></div>
        <div class="kpi-card"><div class="kpi-label">Total Cost</div><div class="kpi-value" style="font-size:18px">${fmtCur(totalSpend)}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date &amp; Time</th><th>Vehicle</th><th>Liters</th><th>Price/L</th><th>Total</th><th>Odometer</th><th>Station</th><th></th></tr></thead>
        <tbody>${tbody}</tbody>
      </table></div>
    </div>`;
  }

  window.openFuelForm = function(id) {
    const l = id ? dbGet(KEYS.fuelLogs, id) : {};
    const vehicles = db(KEYS.vehicles);
    const vehOpts  = vehicles.map(v => `<option value="${v.id}"${l.vehicleId===v.id?' selected':''}>${esc(v.plate)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join('');
    const nowTime  = new Date().toTimeString().slice(0, 5);
    showModal(id ? 'Edit Fuel Log' : 'Add Fuel Entry', `<div class="form-grid">
      <div class="form-group"><label>Vehicle</label><select id="ff-veh"><option value="">-- Select Vehicle --</option>${vehOpts}</select></div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Date</label><input id="ff-date" type="date" value="${l.date || new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Fill Time</label><input id="ff-time" type="time" value="${l.time || nowTime}"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Amount (Liters)</label><input id="ff-lit" type="number" step="0.01" value="${l.liters||''}" placeholder="10.5"></div>
        <div class="form-group"><label>Price per Liter (Rp)</label><input id="ff-price" type="number" value="${l.pricePerLiter||''}" placeholder="10000"></div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>Odometer (km)</label><input id="ff-odo" type="number" value="${l.odometer != null ? l.odometer : ''}" placeholder="12500"></div>
        <div class="form-group"><label>Station</label><input id="ff-station" value="${esc(l.station||'')}" placeholder="Shell, Pertamina..."></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="ff-notes">${esc(l.notes||'')}</textarea></div>
    </div>`, () => {
      const vehicleId = document.getElementById('ff-veh').value;
      if (!vehicleId) { toast('Please select a vehicle', 'error'); return; }
      const odoVal = document.getElementById('ff-odo').value;
      const rec = {
        vehicleId,
        date:          document.getElementById('ff-date').value,
        time:          document.getElementById('ff-time').value || null,
        liters:        parseFloat(document.getElementById('ff-lit').value) || null,
        pricePerLiter: parseInt(document.getElementById('ff-price').value) || null,
        odometer:      odoVal !== '' ? parseInt(odoVal) : null,
        station:       document.getElementById('ff-station').value.trim(),
        notes:         document.getElementById('ff-notes').value.trim(),
      };
      if (id) dbUpdate(KEYS.fuelLogs, id, rec); else dbAdd(KEYS.fuelLogs, rec);
      closeModal(); toast(id ? 'Fuel log updated' : 'Fuel entry saved'); render();
    });
  };

  window.deleteFuel = function(id) {
    if (!confirm('Delete this entry?')) return;
    dbDelete(KEYS.fuelLogs, id); toast('Fuel log deleted', 'error'); render();
  };

  render();
}

PAGES.tripLog = pageTripLog;
PAGES.fuelLog = pageFuelLog;
