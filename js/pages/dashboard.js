function pageDashboard(el) {
  const vehicles  = db(KEYS.vehicles);
  const drivers   = db(KEYS.drivers);
  const trips     = db(KEYS.trips);
  const slicenses = db(KEYS.driverLicenses);
  const vlicenses = db(KEYS.vehicleLicenses);

  const now   = new Date();
  const days  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const mons  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const h     = now.getHours();
  const greeting = h < 11 ? 'Good Morning' : h < 15 ? 'Good Afternoon' : h < 18 ? 'Good Evening' : 'Good Night';
  const dateStr  = `${days[now.getDay()]}, ${now.getDate()} ${mons[now.getMonth()]} ${now.getFullYear()}`;

  const allDocs = [
    ...slicenses.map(l => {
      const drv = drivers.find(d => d.id === l.driverId);
      return { label: `License ${l.simType}`, sub: drv ? drv.name : '-', expiry: l.expiryDate, type: 'License' };
    }),
    ...vlicenses.map(l => {
      const veh = vehicles.find(v => v.id === l.vehicleId);
      return { label: 'Registration', sub: veh ? veh.plate : '-', expiry: l.expiryDate, type: 'Registration' };
    }),
  ].filter(d => { const x = daysUntil(d.expiry); return x !== null && x <= 60; })
   .sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry));

  const critCount = allDocs.filter(d => daysUntil(d.expiry) <= 30).length;
  const recentTrips = [...trips].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 5);

  const kpiCards = [
    { label: 'Active Vehicles', value: vehicles.filter(v => v.status === 'active').length,
      sub: `of ${vehicles.length} registered`, color: 'var(--accent)', icon: IC.vehicle },
    { label: 'Active Drivers', value: drivers.filter(d => d.status === 'active').length,
      sub: `of ${drivers.length} registered`, color: '#22c55e', icon: IC.driver },
    { label: 'Docs Needing Attention', value: critCount,
      sub: 'expiring within 30 days', color: critCount > 0 ? 'var(--warning)' : 'var(--muted)', icon: IC.document },
    { label: 'Total Trips', value: trips.length,
      sub: 'saved trips', color: '#a78bfa', icon: IC.route },
  ];

  const kpiHtml = kpiCards.map(k => `
    <div class="kpi-card" style="border-left:3px solid ${k.color};position:relative;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div class="kpi-label">${k.label}</div>
        <div style="color:${k.color};opacity:0.5;transform:scale(1.2)">${k.icon}</div>
      </div>
      <div class="kpi-value" style="color:${k.color === 'var(--muted)' ? 'var(--text)' : k.color}">${k.value}</div>
      <div class="kpi-sub" style="margin-top:6px">${k.sub}</div>
    </div>`).join('');

  const alertsHtml = allDocs.length === 0
    ? `<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:13px">All documents are valid</div>`
    : allDocs.map(d => {
        const days = daysUntil(d.expiry);
        const accent = days < 0 ? 'var(--danger)' : days <= 14 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : '#4f7af850';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-left:3px solid ${accent};border-radius:6px;margin-bottom:6px">
          <div>
            <div style="font-size:13px;font-weight:500">${esc(d.label)} <span style="color:var(--muted);font-weight:400">— ${esc(d.sub)}</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Valid until ${fmtDate(d.expiry)}</div>
          </div>
          ${expiryBadge(d.expiry)}
        </div>`;
      }).join('');

  const tripsHtml = recentTrips.length === 0
    ? `<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:13px">No saved trips</div>`
    : recentTrips.map(t => {
        const veh  = vehicles.find(v => v.id === t.vehicleId);
        const dist = t.stats ? Number(t.stats.distanceKm).toFixed(1) : null;
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;cursor:pointer"
                     onclick="window._pendingTripId='${t.id}'; navigate('tracking')">
          <div style="color:var(--accent);flex-shrink:0">${IC.route}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(veh ? veh.plate : 'No vehicle assigned')}${dist ? ' · ' + dist + ' km' : ''}</div>
          </div>
          <div style="font-size:11px;color:var(--muted);flex-shrink:0">${fmtDate(t.date || t.savedAt)}</div>
        </div>`;
      }).join('');

  el.innerHTML = `<div class="page">
    <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em">${greeting}</div>
          <div style="color:var(--muted);font-size:13px;margin-top:4px">${dateStr}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="navigate('tracking')">${IC.map} Tracking</button>
          <button class="btn btn-primary btn-sm" onclick="navigate('fuelLog')">${IC.plus} Fuel Log</button>
        </div>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:28px">${kpiHtml}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="section-title" style="margin-bottom:0">Document Alerts</div>
          ${critCount > 0 ? `<span class="badge badge-warning">${critCount} urgent</span>` : ''}
        </div>
        <div>${alertsHtml}</div>
        ${allDocs.length > 0 ? `<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="navigate('vehicleLicenses')" style="font-size:11px;color:var(--muted)">Manage Registration →</button> <button class="btn btn-ghost btn-sm" onclick="navigate('driverLicenses')" style="font-size:11px;color:var(--muted)">Manage Licenses →</button></div>` : ''}
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="section-title" style="margin-bottom:0">Recent Trips</div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('tripLog')" style="font-size:11px;color:var(--muted)">View all →</button>
        </div>
        <div>${tripsHtml}</div>
      </div>
    </div>
  </div>`;
}

PAGES.dashboard = pageDashboard;
