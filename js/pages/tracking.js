function pageTracking(el) {
  let tMap = null, tTrackLayer = null, tStartM = null, tEndM = null, tPlayM = null;
  let tPoints = [], tEnriched = [], tCurrentTrack = null, tPlayInterval = null, tTrackMode = 'speed';

  el.innerHTML = `
    <div class="tracking-panel">
      <div style="font-size:15px;font-weight:600;padding-bottom:10px;border-bottom:1px solid var(--border)">Tracking</div>

      <div class="panel-section">
        <div class="panel-section-title">Upload File</div>
        <label class="upload-box" id="tr-upload-box">
          <div class="upload-box-title">Click or drop file</div>
          <div class="upload-box-sub">Supports .gpx and .kml</div>
          <input type="file" id="tr-file" accept=".gpx,.kml" style="display:none">
        </label>
        <div id="tr-info" style="display:none;margin-top:8px"></div>
      </div>

      <div class="panel-section" id="tr-stats-panel" style="display:none">
        <div class="panel-section-title">Track Statistics</div>
        <div class="stats-grid-2">
          <div class="stat-item"><div class="stat-label">Distance</div><div class="stat-value" id="tr-dist">-<span class="stat-unit">km</span></div></div>
          <div class="stat-item"><div class="stat-label">Duration</div><div class="stat-value" id="tr-dur">-</div></div>
          <div class="stat-item"><div class="stat-label">Max Speed</div><div class="stat-value" id="tr-maxspd">-<span class="stat-unit">km/h</span></div></div>
          <div class="stat-item"><div class="stat-label">Avg Speed</div><div class="stat-value" id="tr-avgspd">-<span class="stat-unit">km/h</span></div></div>
          <div class="stat-item"><div class="stat-label">Elevation +/-</div><div class="stat-value" id="tr-elev">-<span class="stat-unit">m</span></div></div>
          <div class="stat-item"><div class="stat-label">Total Points</div><div class="stat-value" id="tr-pts">-</div></div>
        </div>
      </div>

      <div class="panel-section" id="tr-playback-panel" style="display:none">
        <div class="panel-section-title">Playback</div>
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <button class="btn btn-primary btn-sm" style="flex:1" id="tr-play-btn">Play</button>
          <button class="btn btn-secondary btn-sm" id="tr-reset-btn">Reset</button>
        </div>
        <input type="range" class="slider-input" id="tr-slider" min="0" max="100" value="0">
        <div class="playback-info" style="margin-top:4px">
          <span id="tr-idx">-</span>
          <span id="tr-spd">-</span>
        </div>
        <div id="tr-time" class="text-muted" style="font-size:11px;margin-top:2px">-</div>
        <div id="tr-legend" style="display:none;margin-top:10px">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Speed</div>
          <div class="speed-legend">
            <span class="speed-swatch" style="background:#ef4444">Stop</span>
            <span class="speed-swatch" style="background:#f97316">&lt;10</span>
            <span class="speed-swatch" style="background:#f59e0b">&lt;20</span>
            <span class="speed-swatch" style="background:#84cc16">&lt;35</span>
            <span class="speed-swatch" style="background:#22c55e">35+</span>
            <span class="text-muted" style="font-size:10px">km/h</span>
          </div>
        </div>
      </div>

      <div id="tr-gf-section" class="panel-section" style="display:none">
        <div class="panel-section-title">Geofence Events (<span id="tr-gf-count">0</span>)</div>
        <div id="tr-gf-list" style="max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:4px"></div>
      </div>

      <div id="tr-mode-section" class="panel-section" style="display:none">
        <div class="panel-section-title">Track View</div>
        <div style="display:flex;gap:4px">
          <button id="tr-mode-speed" class="btn btn-primary btn-sm" style="flex:1;font-size:11px" onclick="setTrackMode('speed')">Speed</button>
          <button id="tr-mode-gear"  class="btn btn-secondary btn-sm" style="flex:1;font-size:11px" onclick="setTrackMode('gear')">Gear</button>
          <button id="tr-mode-harsh" class="btn btn-secondary btn-sm" style="flex:1;font-size:11px" onclick="setTrackMode('harshness')">Harshness</button>
        </div>
        <div id="tr-mode-legend" style="margin-top:8px"></div>
      </div>

      <div id="tr-analysis-section" class="panel-section" style="display:none">
        <div class="panel-section-title">Riding Analysis</div>
        <div id="tr-analysis-body"></div>
      </div>

      <div style="margin-top:auto;padding-top:12px">
        <button class="btn btn-primary" style="width:100%;display:none" id="tr-save-btn">Save Trip</button>
      </div>
    </div>
    <div id="tracking-map"></div>`;

  loadLeaflet().then(() => {
    tMap = L.map('tracking-map').setView([-6.2, 106.9], 12);
    const _streetL = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 });
    const _satL    = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri', maxZoom: 19 });
    _streetL.addTo(tMap);
    L.control.layers({ 'Street': _streetL, 'Satellite': _satL }, {}, { position: 'topright' }).addTo(tMap);
    if (L.Control.Geocoder) {
      L.Control.geocoder({ defaultMarkGeocode: false, geocoder: L.Control.Geocoder.nominatim() })
        .on('markgeocode', e => tMap.fitBounds(e.geocode.bbox))
        .addTo(tMap);
    }
    db(KEYS.geofences).forEach(g => {
      L.polygon(g.latlngs, { color: g.color, fillColor: g.color, fillOpacity: 0.15, weight: 2 })
        .addTo(tMap).bindPopup(`<b>${g.name}</b>`);
    });
    const tripIdToLoad = window._pendingTripId || window._lastViewedTripId;
    window._pendingTripId = null;
    if (tripIdToLoad) {
      const trip = dbGet(KEYS.trips, tripIdToLoad);
      if (trip) {
        window._lastViewedTripId = trip.id;
        renderTrack(trip);
        document.getElementById('tr-save-btn').style.display = 'none';
      }
    }
  }).catch(e => {
    document.getElementById('tracking-map').innerHTML = `<div style="padding:24px;color:var(--danger)">Failed to load map: ${e.message}</div>`;
  });

  function showInfo(msg, type) {
    const el2 = document.getElementById('tr-info');
    el2.className = `info-box ${type}`;
    el2.textContent = msg;
    el2.style.display = '';
  }

  function renderTrack(parsed) {
    const { points, name, format } = parsed;
    tPoints = points;
    tCurrentTrack = { ...parsed, stats: computeStats(points) };

    // enrich with gear + harshness if vehicle is linked
    const vehicleId = parsed.vehicleId || null;
    const vehicle   = vehicleId ? dbGet(KEYS.vehicles, vehicleId) : null;
    const gearCfg   = vehicle?.gearConfig?.length ? vehicle.gearConfig : null;
    tEnriched = enrichPoints(points, gearCfg);

    tTrackMode = 'speed';
    if (tTrackLayer) tMap.removeLayer(tTrackLayer);
    if (tStartM)     tMap.removeLayer(tStartM);
    if (tEndM)       tMap.removeLayer(tEndM);
    tTrackLayer = buildSpeedTrack(points).addTo(tMap);
    const ll = points.map(p => [p.lat, p.lon]);
    tStartM = L.marker(ll[0]).addTo(tMap).bindPopup('<b>Start</b>');
    tEndM   = L.marker(ll[ll.length - 1]).addTo(tMap).bindPopup('<b>End</b>');
    tMap.fitBounds(tTrackLayer.getBounds(), { padding: [40, 40] });

    const s = tCurrentTrack.stats;
    document.getElementById('tr-dist').innerHTML   = s.distanceKm.toFixed(2) + '<span class="stat-unit">km</span>';
    document.getElementById('tr-dur').textContent  = s.duration;
    document.getElementById('tr-maxspd').innerHTML = s.maxSpeed.toFixed(1) + '<span class="stat-unit">km/h</span>';
    document.getElementById('tr-avgspd').innerHTML = s.avgSpeed.toFixed(1) + '<span class="stat-unit">km/h</span>';
    document.getElementById('tr-elev').innerHTML   = s.elevGain + '/' + s.elevLoss + '<span class="stat-unit">m</span>';
    document.getElementById('tr-pts').textContent  = points.length;
    document.getElementById('tr-stats-panel').style.display   = '';
    document.getElementById('tr-playback-panel').style.display = '';
    document.getElementById('tr-legend').style.display = points.some(p => p.speed > 0) ? '' : 'none';

    const slider = document.getElementById('tr-slider');
    slider.max = points.length - 1; slider.value = 0;
    updateMarker(0);
    document.getElementById('tr-save-btn').style.display = '';

    // show mode toggle only if gear config available
    const modeSection = document.getElementById('tr-mode-section');
    if (gearCfg) {
      modeSection.style.display = '';
      setTrackMode('speed');
      renderAnalysisPanel(gearCfg);
    } else {
      modeSection.style.display = 'none';
      document.getElementById('tr-analysis-section').style.display = 'none';
    }

    if (format === 'KML') showInfo('KML has no per-point time & speed data.', 'info');
    else showInfo('Loaded successfully. ' + points.length + ' points.', 'success');
    renderGfEvents();
  }

  window.setTrackMode = function(mode) {
    tTrackMode = mode;
    ['speed','gear','harshness'].forEach(m => {
      const btn = document.getElementById(`tr-mode-${m}`);
      if (btn) btn.className = `btn btn-sm ${m === mode ? 'btn-primary' : 'btn-secondary'}`;
      if (btn) btn.style.flex = '1'; if (btn) btn.style.fontSize = '11px';
    });
    if (tTrackLayer) tMap.removeLayer(tTrackLayer);
    if      (mode === 'gear')      tTrackLayer = buildGearTrack(tEnriched).addTo(tMap);
    else if (mode === 'harshness') tTrackLayer = buildHarshnessTrack(tEnriched).addTo(tMap);
    else                           tTrackLayer = buildSpeedTrack(tPoints).addTo(tMap);
    renderModeLegend(mode);
  };

  function renderModeLegend(mode) {
    const el2 = document.getElementById('tr-mode-legend');
    if (mode === 'speed') { el2.innerHTML = ''; return; }
    if (mode === 'gear') {
      el2.innerHTML = `<div class="speed-legend" style="flex-wrap:wrap;gap:4px">
        ${GEAR_COLORS.slice(1).map((c, i) => `<span class="speed-swatch" style="background:${c}">G${i+1}</span>`).join('')}
        <span class="speed-swatch" style="background:${GEAR_COLORS[0]}">Stop</span>
      </div>`;
    } else {
      el2.innerHTML = `<div class="speed-legend" style="flex-wrap:wrap;gap:4px">
        <span class="speed-swatch" style="background:#22c55e">Smooth</span>
        <span class="speed-swatch" style="background:#f97316">Mod.Acc</span>
        <span class="speed-swatch" style="background:#ef4444">Harsh Acc</span>
        <span class="speed-swatch" style="background:#f59e0b">Mod.Brk</span>
        <span class="speed-swatch" style="background:#7c3aed">Harsh Brk</span>
      </div>`;
    }
  }

  function renderAnalysisPanel(gearCfg) {
    const analysis = computeRidingAnalysis(tEnriched, gearCfg);
    const sec      = document.getElementById('tr-analysis-section');
    const body     = document.getElementById('tr-analysis-body');
    if (!analysis) { sec.style.display = 'none'; return; }
    sec.style.display = '';

    const gearBars = Object.entries(analysis.gearDist).sort((a,b) => a[0]-b[0]).map(([g, pct]) => {
      const color = getGearColor(Number(g));
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <div style="font-size:10px;color:var(--muted);width:20px;text-align:right">G${g}</div>
        <div style="flex:1;background:var(--border);border-radius:2px;height:7px">
          <div style="width:${pct}%;background:${color};height:7px;border-radius:2px"></div>
        </div>
        <div style="font-size:10px;color:var(--muted);width:26px">${pct}%</div>
      </div>`;
    }).join('');

    const sm = analysis.smoothness;
    const hasSm = Object.values(sm).some(v => v > 0);

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="font-size:24px;font-weight:700;color:${analysis.scoreColor}">${analysis.score}</div>
        <div>
          <div style="font-size:12px;font-weight:600;color:${analysis.scoreColor}">${analysis.scoreLabel}</div>
          <div style="font-size:10px;color:var(--muted)">Riding Score / 100</div>
        </div>
      </div>
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:6px">Gear Distribution</div>
      ${gearBars}
      ${hasSm ? `
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin:8px 0 4px">Smoothness</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        <span class="badge badge-success" style="font-size:10px">Smooth ${sm.smooth||0}%</span>
        <span class="badge badge-warning" style="font-size:10px">Mod ${(sm.moderate_accel||0)+(sm.moderate_brake||0)}%</span>
        <span class="badge badge-danger" style="font-size:10px">Harsh ${(sm.harsh_accel||0)+(sm.harsh_brake||0)}%</span>
      </div>` : `<div style="font-size:11px;color:var(--muted);margin-top:4px">No time data — harshness N/A (KML)</div>`}
      <div style="display:flex;gap:12px;margin-top:8px">
        <div><div style="font-size:10px;color:var(--muted)">Rev-hang</div><div style="font-size:13px;font-weight:600;color:${analysis.revHangCount>0?'var(--warning)':'var(--success)'}">${analysis.revHangCount}x</div></div>
        <div><div style="font-size:10px;color:var(--muted)">Lugging</div><div style="font-size:13px;font-weight:600;color:${analysis.lugCount>0?'var(--warning)':'var(--success)'}">${analysis.lugCount}x</div></div>
      </div>`;
  }

  function updateMarker(idx) {
    if (!tPoints.length) return;
    const p = tPoints[idx];
    if (tPlayM) tMap.removeLayer(tPlayM);
    tPlayM = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ className: '', html: '<div style="font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">&#x1F6F5;</div>', iconSize: [26,26], iconAnchor: [13,13] }),
      zIndexOffset: 1000
    }).addTo(tMap);
    const ep = tEnriched[idx];
    document.getElementById('tr-idx').textContent  = `${idx+1}/${tPoints.length}`;
    const spdTxt = p.speed > 0 ? p.speed.toFixed(1) + ' km/h' : '-';
    const gearTxt = ep?.estimatedGear > 0 ? ` · G${ep.estimatedGear}` : '';
    document.getElementById('tr-spd').textContent  = spdTxt + gearTxt;
    document.getElementById('tr-time').textContent = p.time ? new Date(p.time).toLocaleString('en-GB') : '-';
  }

  function renderGfEvents() {
    const geofences = db(KEYS.geofences);
    const sec = document.getElementById('tr-gf-section');
    if (!geofences.length || !tPoints.length) { sec.style.display = 'none'; return; }
    const events = [];
    geofences.forEach(g => {
      let wasIn = false;
      tPoints.forEach((p, i) => {
        const isIn = pointInPolygon(p, g.latlngs);
        if (isIn && !wasIn) { wasIn = true; events.push({ type: 'enter', name: g.name, color: g.color, idx: i, time: p.time }); }
        else if (!isIn && wasIn) { wasIn = false; events.push({ type: 'exit', name: g.name, color: g.color, idx: i, time: p.time }); }
      });
    });
    events.sort((a,b) => a.idx - b.idx);
    document.getElementById('tr-gf-count').textContent = events.length;
    document.getElementById('tr-gf-list').innerHTML = events.slice(0, 20).map(ev => `
      <div style="font-size:11.5px;padding:4px 6px;background:var(--bg);border-radius:4px;border-left:2px solid ${ev.color};cursor:pointer"
           onclick="document.getElementById('tr-slider').value=${ev.idx};updateTrMarker(${ev.idx})">
        <span style="color:var(--text)">${ev.type === 'enter' ? 'Enter' : 'Exit'}</span>
        <span class="text-muted"> — ${esc(ev.name)}</span>
      </div>`).join('');
    sec.style.display = '';
  }

  window.updateTrMarker = idx => updateMarker(parseInt(idx));

  document.getElementById('tr-file').addEventListener('change', e => {
    if (!e.target.files[0]) return;
    const f = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const ext = f.name.split('.').pop().toLowerCase();
        if (ext === 'gpx') renderTrack(parseGPX(ev.target.result));
        else if (ext === 'kml') renderTrack(parseKML(ev.target.result));
        else throw new Error('Unsupported format. Use .gpx or .kml');
      } catch(err) { showInfo(err.message, 'error'); }
    };
    reader.readAsText(f);
  });

  const uploadBox = document.getElementById('tr-upload-box');
  uploadBox.addEventListener('dragover', e => { e.preventDefault(); uploadBox.classList.add('dragover'); });
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
  uploadBox.addEventListener('drop', e => {
    e.preventDefault(); uploadBox.classList.remove('dragover');
    if (e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const ext = f.name.split('.').pop().toLowerCase();
          if (ext === 'gpx') renderTrack(parseGPX(ev.target.result));
          else if (ext === 'kml') renderTrack(parseKML(ev.target.result));
          else throw new Error('Unsupported format');
        } catch(err) { showInfo(err.message, 'error'); }
      };
      reader.readAsText(f);
    }
  });

  document.getElementById('tr-slider').addEventListener('input', e => updateMarker(parseInt(e.target.value)));

  document.getElementById('tr-play-btn').addEventListener('click', () => {
    if (tPlayInterval) {
      clearInterval(tPlayInterval); tPlayInterval = null;
      document.getElementById('tr-play-btn').textContent = 'Play';
    } else {
      document.getElementById('tr-play-btn').textContent = 'Pause';
      tPlayInterval = setInterval(() => {
        const s = document.getElementById('tr-slider');
        const idx = parseInt(s.value);
        if (idx >= tPoints.length - 1) { clearInterval(tPlayInterval); tPlayInterval = null; document.getElementById('tr-play-btn').textContent = 'Play'; return; }
        s.value = idx + 1; updateMarker(idx + 1);
      }, 80);
    }
  });

  document.getElementById('tr-reset-btn').addEventListener('click', () => {
    if (tPlayInterval) { clearInterval(tPlayInterval); tPlayInterval = null; document.getElementById('tr-play-btn').textContent = 'Play'; }
    document.getElementById('tr-slider').value = 0; updateMarker(0);
  });

  document.getElementById('tr-save-btn').addEventListener('click', () => {
    if (!tCurrentTrack) return;
    const vehicles = db(KEYS.vehicles);
    const drivers  = db(KEYS.drivers);
    const vehOpts  = vehicles.map(v => `<option value="${v.id}">${esc(v.plate)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join('');
    const drvOpts  = drivers.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
    const defDate  = tCurrentTrack.points[0]?.time ? tCurrentTrack.points[0].time.slice(0, 10) : new Date().toISOString().slice(0, 10);
    showModal('Save Trip', `<div class="form-grid">
      <div class="form-group"><label>Trip Name</label><input id="tsf-name" value="${esc(tCurrentTrack.name)}"></div>
      <div class="form-group"><label>Date</label><input id="tsf-date" type="date" value="${defDate}"></div>
      <div class="form-group"><label>Vehicle</label><select id="tsf-veh"><option value="">-- Not selected --</option>${vehOpts}</select></div>
      <div class="form-group"><label>Driver</label><select id="tsf-drv"><option value="">-- Not selected --</option>${drvOpts}</select></div>
      <div class="form-group"><label>Notes</label><textarea id="tsf-notes" placeholder="Optional"></textarea></div>
    </div>`, () => {
      const name = document.getElementById('tsf-name').value.trim();
      if (!name) { toast('Trip name is required', 'error'); return; }
      const selVehicleId = document.getElementById('tsf-veh').value || null;
      const selVehicle   = selVehicleId ? dbGet(KEYS.vehicles, selVehicleId) : null;
      const ridingAnalysis = selVehicle?.gearConfig?.length
        ? computeRidingAnalysis(enrichPoints(tCurrentTrack.points, selVehicle.gearConfig), selVehicle.gearConfig)
        : { hasGearData: false };
      const rec = {
        name,
        date: document.getElementById('tsf-date').value,
        vehicleId: selVehicleId,
        driverId: document.getElementById('tsf-drv').value || null,
        notes: document.getElementById('tsf-notes').value.trim(),
        format: tCurrentTrack.format,
        stats: tCurrentTrack.stats,
        points: tCurrentTrack.points,
        savedAt: new Date().toISOString(),
        ridingAnalysis,
      };
      dbAdd(KEYS.trips, rec);
      const saved = db(KEYS.trips);
      window._lastViewedTripId = saved[saved.length - 1]?.id || null;
      closeModal(); toast('Trip saved');
      document.getElementById('tr-save-btn').style.display = 'none';
    });
  });
}

PAGES.tracking = pageTracking;
