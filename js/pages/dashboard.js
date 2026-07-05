function pageDashboard(el) {
  const vehicles  = db(KEYS.vehicles);
  const drivers   = db(KEYS.drivers);
  const trips     = db(KEYS.trips);
  const slicenses = db(KEYS.driverLicenses);
  const vlicenses = db(KEYS.vehicleLicenses);
  const fuelLogs  = db(KEYS.fuelLogs);

  const now      = new Date();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const h        = now.getHours();
  const greeting = h < 11 ? 'Good Morning' : h < 15 ? 'Good Afternoon' : h < 18 ? 'Good Evening' : 'Good Night';
  const dateStr  = `${dayNames[now.getDay()]}, ${now.getDate()} ${monNames[now.getMonth()]} ${now.getFullYear()}`;

  // ── Docs expiring ──────────────────────────────────────────────────────────
  const allDocs = [
    ...slicenses.map(l => {
      const drv = drivers.find(d => d.id === l.driverId);
      return { label: `License ${l.simType}`, sub: drv ? drv.name : '-', expiry: l.expiryDate };
    }),
    ...vlicenses.map(l => {
      const veh = vehicles.find(v => v.id === l.vehicleId);
      return { label: 'Registration', sub: veh ? veh.plate : '-', expiry: l.expiryDate };
    }),
  ].filter(d => { const x = daysUntil(d.expiry); return x !== null && x <= 60; })
   .sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry));

  const critCount   = allDocs.filter(d => daysUntil(d.expiry) <= 30).length;
  const recentTrips = [...trips].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 5);

  // ── Maintenance due alerts ─────────────────────────────────────────────────
  const maintAlerts = [];
  db(KEYS.maintenance).forEach(m => {
    const veh      = vehicles.find(v => v.id === m.vehicleId);
    const plateLbl = veh ? veh.plate : '-';
    const types    = Array.isArray(m.types) ? m.types : m.type ? [m.type] : ['Service'];
    const label    = types.join(', ');

    // estimate current odometer from fuel logs
    const fuels    = fuelLogs.filter(l => l.vehicleId === m.vehicleId && l.odometer != null);
    const estOdo   = fuels.length ? Math.max(...fuels.map(l => Number(l.odometer))) : null;

    if (m.nextDueDate) {
      const d = daysUntil(m.nextDueDate);
      if (d !== null && d <= 14) maintAlerts.push({ label, sub: plateLbl, daysLeft: d, kmLeft: null, overdue: d < 0 });
    }
    if (m.nextDueKm && estOdo !== null) {
      const kmLeft = Number(m.nextDueKm) - estOdo;
      if (kmLeft <= 500) maintAlerts.push({ label, sub: plateLbl, daysLeft: null, kmLeft: Math.round(kmLeft), overdue: kmLeft <= 0 });
    }
  });
  maintAlerts.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const aUrgency = a.daysLeft ?? (a.kmLeft / 50);
    const bUrgency = b.daysLeft ?? (b.kmLeft / 50);
    return aUrgency - bUrgency;
  });
  const maintCritCount = maintAlerts.filter(m => m.overdue).length;

  // ── KPI values ─────────────────────────────────────────────────────────────
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const activeDrivers  = drivers.filter(d => d.status === 'active').length;
  const totalKm        = trips.reduce((s, t) => s + (t.stats?.distanceKm || 0), 0);

  // ── Last 14 days trip activity ─────────────────────────────────────────────
  const kmByDay = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    kmByDay[d.toISOString().slice(0, 10)] = 0;
  }
  trips.forEach(t => {
    const key = t.date || (t.savedAt || '').slice(0, 10);
    if (key in kmByDay) kmByDay[key] += t.stats?.distanceKm || 0;
  });
  const activityData = Object.entries(kmByDay).map(([ds, km]) => {
    const d = new Date(ds);
    return { km, label: `${d.getDate()}/${d.getMonth() + 1}` };
  });

  // ── Last 8 fuel fills cost trend ───────────────────────────────────────────
  const fuelTrend = [...fuelLogs]
    .filter(l => l.pricePerLiter > 0 && l.liters > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-8)
    .map(l => ({ cost: l.liters * l.pricePerLiter, label: fmtDate(l.date).slice(0, 6) }));

  // ── SVG helpers ────────────────────────────────────────────────────────────

  function svgAreaChart(data, valueKey, W, H, color, gradId, labelKey) {
    const vals   = data.map(d => d[valueKey]);
    const maxVal = Math.max(...vals, 0.01);
    const hasData = vals.some(v => v > 0);

    const padL = 4, padR = 4, padT = 14, padB = 22;
    const cW = W - padL - padR;
    const cH = H - padT - padB;

    const pts = data.map((d, i) => ({
      x: padL + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW),
      y: padT + cH - (d[valueKey] / maxVal) * cH,
    }));

    // smooth cubic bezier
    let linePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
      linePath += ` C ${cx} ${pts[i].y.toFixed(1)} ${cx} ${pts[i + 1].y.toFixed(1)} ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
    }
    const areaBase = padT + cH;
    const areaPath = linePath
      + ` L ${pts[pts.length - 1].x.toFixed(1)} ${areaBase}`
      + ` L ${pts[0].x.toFixed(1)} ${areaBase} Z`;

    const xLabels = data.map((d, i) => {
      if (data.length > 10 && i % 2 !== 0) return '';
      return `<text x="${pts[i].x.toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="9" fill="var(--muted)">${d[labelKey]}</text>`;
    }).join('');

    const noDataMsg = !hasData
      ? `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="11" fill="var(--muted)">No data yet</text>`
      : '';

    return `
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.45"/>
          <stop offset="85%" stop-color="${color}" stop-opacity="0.03"/>
        </linearGradient>
      </defs>
      ${hasData ? `<path d="${areaPath}" fill="url(#${gradId})"/>` : ''}
      ${hasData ? `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${xLabels}
      ${noDataMsg}
    `;
  }

  function svgDonut(val, total, color, size = 70) {
    const r    = (size - 14) / 2;
    const c    = size / 2;
    const circ = 2 * Math.PI * r;
    const pct  = total > 0 ? Math.max(0.04, val / total) : 0;
    const dash = (pct * circ).toFixed(1);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${dash} ${circ.toFixed(1)}" stroke-linecap="round"/>
    </svg>`;
  }

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Active Vehicles', value: activeVehicles, sub: `of ${vehicles.length} registered`,   color: 'var(--accent)',   icon: IC.vehicle  },
    { label: 'Active Drivers',  value: activeDrivers,  sub: `of ${drivers.length} registered`,    color: '#22c55e',         icon: IC.driver   },
    { label: 'Needs Attention',  value: critCount + maintCritCount, sub: `${critCount} docs · ${maintCritCount} maintenance overdue`, color: (critCount + maintCritCount) > 0 ? 'var(--warning)' : 'var(--muted)', icon: IC.document },
    { label: 'Total Trips',     value: trips.length,    sub: `${fmtNum(Math.round(totalKm))} km total`, color: '#a78bfa',   icon: IC.route    },
  ];
  const kpiHtml = kpis.map(k => `
    <div class="kpi-card" style="border-left:3px solid ${k.color}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div class="kpi-label">${k.label}</div>
        <div style="color:${k.color};opacity:0.45;transform:scale(1.3)">${k.icon}</div>
      </div>
      <div class="kpi-value" style="color:${k.color === 'var(--muted)' ? 'var(--text)' : k.color}">${k.value}</div>
      <div class="kpi-sub" style="margin-top:6px">${k.sub}</div>
    </div>`).join('');

  // ── Trip activity chart ────────────────────────────────────────────────────
  const tripChartSvg = `<svg viewBox="0 0 500 130" width="100%" height="130" preserveAspectRatio="none">
    ${svgAreaChart(activityData, 'km', 500, 130, '#4f7af8', 'grad-trip', 'label')}
  </svg>`;

  // ── Fuel trend chart ───────────────────────────────────────────────────────
  const fuelChartSvg = fuelTrend.length >= 2
    ? `<svg viewBox="0 0 500 90" width="100%" height="90" preserveAspectRatio="none">
        ${svgAreaChart(fuelTrend, 'cost', 500, 90, '#f59e0b', 'grad-fuel', 'label')}
       </svg>`
    : `<div style="padding:18px 0;text-align:center;color:var(--muted);font-size:12px">Add ≥ 2 fuel entries to see trend</div>`;

  // ── Fleet status rings ─────────────────────────────────────────────────────
  function ringRow(donutSvg, val, total, label, color) {
    return `<div style="display:flex;align-items:center;gap:14px">
      <div style="position:relative;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center">
        ${donutSvg}
        <div style="position:absolute;font-size:15px;font-weight:700;color:${color}">${val}</div>
      </div>
      <div>
        <div style="font-size:13px;font-weight:600">${val} / ${total}</div>
        <div style="font-size:11px;color:var(--muted)">${label}</div>
      </div>
    </div>`;
  }

  // ── Maintenance alerts HTML ────────────────────────────────────────────────
  const maintHtml = maintAlerts.length === 0
    ? `<div style="padding:12px 0;text-align:center;color:var(--muted);font-size:13px">All maintenance on schedule</div>`
    : maintAlerts.slice(0, 4).map(m => {
        const accent  = m.overdue ? 'var(--danger)' : 'var(--warning)';
        const detail  = m.daysLeft !== null
          ? (m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d overdue` : `${m.daysLeft}d left`)
          : (m.kmLeft < 0  ? `${Math.abs(m.kmLeft)} km overdue` : `${m.kmLeft} km left`);
        const badge   = m.overdue
          ? `<span class="badge badge-danger">Overdue</span>`
          : `<span class="badge badge-warning">${detail}</span>`;
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-left:3px solid ${accent};border-radius:6px;margin-bottom:6px">
          <div>
            <div style="font-size:13px;font-weight:500">${esc(m.label)} <span style="color:var(--muted);font-weight:400">— ${esc(m.sub)}</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">${detail}</div>
          </div>
          ${badge}
        </div>`;
      }).join('');

  // ── Document alerts ────────────────────────────────────────────────────────
  const alertsHtml = allDocs.length === 0
    ? `<div style="padding:12px 0;text-align:center;color:var(--muted);font-size:13px">All documents are valid</div>`
    : allDocs.slice(0, 4).map(d => {
        const dd     = daysUntil(d.expiry);
        const accent = dd < 0 ? 'var(--danger)' : dd <= 14 ? 'var(--danger)' : dd <= 30 ? 'var(--warning)' : 'rgba(79,122,248,0.4)';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-left:3px solid ${accent};border-radius:6px;margin-bottom:6px">
          <div>
            <div style="font-size:13px;font-weight:500">${esc(d.label)} <span style="color:var(--muted);font-weight:400">— ${esc(d.sub)}</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">Valid until ${fmtDate(d.expiry)}</div>
          </div>
          ${expiryBadge(d.expiry)}
        </div>`;
      }).join('');

  // ── Recent trips ───────────────────────────────────────────────────────────
  const tripsHtml = recentTrips.length === 0
    ? `<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:13px">No saved trips</div>`
    : recentTrips.map(t => {
        const veh  = vehicles.find(v => v.id === t.vehicleId);
        const dist = t.stats ? Number(t.stats.distanceKm).toFixed(1) : null;
        const ra = t.ridingAnalysis;
        const scoreBadge = ra?.hasGearData
          ? `<span style="font-size:10px;font-weight:700;color:${ra.scoreColor}">${ra.score}</span>`
          : '';
        return `<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;cursor:pointer"
                     onclick="window._pendingTripId='${t.id}'; navigate('tracking')">
          <div style="color:var(--accent);flex-shrink:0">${IC.route}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">${esc(veh ? veh.plate : 'No vehicle assigned')}${dist ? ' · ' + dist + ' km' : ''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;color:var(--muted)">${fmtDate(t.date || t.savedAt)}</div>
            ${scoreBadge}
          </div>
        </div>`;
      }).join('');

  el.innerHTML = `<div class="page" style="max-width:1400px">

    <!-- Header -->
    <div style="margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em">${greeting}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:4px">${dateStr}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="navigate('tracking')">${IC.map} Tracking</button>
        <button class="btn btn-primary btn-sm" onclick="navigate('fuelLog')">${IC.plus} Fuel Log</button>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="kpi-grid" style="margin-bottom:20px">${kpiHtml}</div>

    <!-- Charts row -->
    <div style="display:grid;grid-template-columns:1fr 260px;gap:16px;margin-bottom:20px">

      <!-- Left: stacked charts -->
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div class="section-title" style="margin-bottom:0">Trip Activity — Last 14 Days</div>
            <span style="font-size:11px;color:var(--muted)">km / day</span>
          </div>
          ${tripChartSvg}
        </div>
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div class="section-title" style="margin-bottom:0">Fuel Cost Trend</div>
            <span style="font-size:11px;color:var(--muted)">Rp / fill</span>
          </div>
          ${fuelChartSvg}
        </div>
      </div>

      <!-- Right: fleet status -->
      <div class="card" style="display:flex;flex-direction:column;gap:18px">
        <div class="section-title" style="margin-bottom:0">Fleet Status</div>
        ${ringRow(svgDonut(activeVehicles, vehicles.length, 'var(--accent)'), activeVehicles, vehicles.length, 'Vehicles active', 'var(--accent)')}
        ${ringRow(svgDonut(activeDrivers, drivers.length, '#22c55e'), activeDrivers, drivers.length, 'Drivers active', '#22c55e')}
        <div style="margin-top:auto;padding-top:14px;border-top:1px solid var(--border)">
          <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Total Distance</div>
          <div style="font-size:22px;font-weight:700">${fmtNum(Math.round(totalKm))} <span style="font-size:13px;color:var(--muted)">km</span></div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Fuel Fills</div>
          <div style="font-size:22px;font-weight:700">${fuelLogs.length}<span style="font-size:13px;color:var(--muted)"> records</span></div>
        </div>
      </div>
    </div>

    <!-- Alerts + Trips -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <!-- Maintenance Due -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="section-title" style="margin-bottom:0">Maintenance Due</div>
          ${maintCritCount > 0 ? `<span class="badge badge-danger">${maintCritCount} overdue</span>` : maintAlerts.length > 0 ? `<span class="badge badge-warning">${maintAlerts.length} upcoming</span>` : ''}
        </div>
        ${maintHtml}
        ${maintAlerts.length > 0 ? `<div style="margin-bottom:4px"><button class="btn btn-ghost btn-sm" onclick="navigate('maintenance')" style="font-size:11px;color:var(--muted)">Go to Maintenance →</button></div>` : ''}

        <!-- Document Alerts -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;margin-bottom:8px">
          <div class="section-title" style="margin-bottom:0">Document Alerts</div>
          ${critCount > 0 ? `<span class="badge badge-warning">${critCount} urgent</span>` : ''}
        </div>
        ${alertsHtml}
        ${allDocs.length > 0 ? `<div style="margin-top:4px">
          <button class="btn btn-ghost btn-sm" onclick="navigate('vehicleLicenses')" style="font-size:11px;color:var(--muted)">Registration →</button>
          <button class="btn btn-ghost btn-sm" onclick="navigate('driverLicenses')" style="font-size:11px;color:var(--muted)">Licenses →</button>
        </div>` : ''}
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="section-title" style="margin-bottom:0">Recent Trips</div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('tripLog')" style="font-size:11px;color:var(--muted)">View all →</button>
        </div>
        ${tripsHtml}
      </div>
    </div>
  </div>`;
}

PAGES.dashboard = pageDashboard;
