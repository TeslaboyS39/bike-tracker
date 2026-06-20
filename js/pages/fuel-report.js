function pageFuelReport(el) {
  const fuelTs    = l => new Date((l.date || '') + 'T' + (l.time || '00:00'));
  const fuelDtLbl = l => fmtDate(l.date) + (l.time ? ' ' + l.time : '');

  function render(vehicleId, periodIdx) {
    const vehicles    = db(KEYS.vehicles);
    const vehOpts     = vehicles.map(v => `<option value="${v.id}"${vehicleId===v.id?' selected':''}>${esc(v.plate)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join('');
    const veh         = vehicleId ? vehicles.find(v => v.id === vehicleId) : null;
    const theoretical = veh?.theoreticalConsumption ? Number(veh.theoreticalConsumption) : null;

    let chartHtml = '', summaryHtml = '', diagHtml = '', periodHtml = '';

    if (vehicleId) {
      const logs = db(KEYS.fuelLogs)
        .filter(l => l.vehicleId === vehicleId && l.odometer != null && l.liters > 0)
        .sort((a, b) => fuelTs(a) - fuelTs(b));

      const allIntervals = [];
      for (let i = 1; i < logs.length; i++) {
        const km  = Number(logs[i].odometer) - Number(logs[i-1].odometer);
        const lit = Number(logs[i].liters);
        if (km > 0 && lit > 0) allIntervals.push({
          periodLabel:   `${fuelDtLbl(logs[i-1])} → ${fuelDtLbl(logs[i])}`,
          label:         fuelDtLbl(logs[i]),
          actual:        km / lit,
          km, lit,
          pricePerLiter: logs[i].pricePerLiter ? Number(logs[i].pricePerLiter) : null,
        });
      }

      if (logs.length > 0) {
        const lastLog    = logs[logs.length - 1];
        const lastDate   = lastLog.date || '';
        const tripsAfter = db(KEYS.trips)
          .filter(t => t.vehicleId === vehicleId && (t.date || '') >= lastDate);
        const kmSince  = tripsAfter.reduce((s, t) => s + (t.stats?.distanceKm || 0), 0);
        const lastTrip = [...tripsAfter].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const endLabel = lastTrip ? fmtDate(lastTrip.date) : 'Now';
        allIntervals.push({
          isOpen: true,
          periodLabel: `${fuelDtLbl(lastLog)} → ${endLabel} ↻`,
          label: endLabel,
          actual: null, km: kmSince, lit: null,
          litTheo: theoretical && kmSince > 0 ? kmSince / theoretical : null,
          pricePerLiter: lastLog.pricePerLiter ? Number(lastLog.pricePerLiter) : null,
        });
      }

      const closedIntervals = allIntervals.filter(x => !x.isOpen);
      if (allIntervals.length >= 1) {
        const pIdx = (periodIdx !== undefined && periodIdx !== null && periodIdx !== '') ? parseInt(periodIdx) : -1;
        const periodOpts = allIntervals.map((iv, i) =>
          `<option value="${i}"${pIdx === i ? ' selected' : ''}>${esc(iv.periodLabel)}</option>`
        ).join('');
        periodHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;flex-wrap:wrap">
          <label style="color:var(--muted);font-size:12px;white-space:nowrap">Period:</label>
          <select onchange="renderFuelReport('${vehicleId}', this.value)" style="max-width:380px">
            <option value=""${pIdx === -1 ? ' selected' : ''}>All Closed Periods (${closedIntervals.length} intervals)</option>
            ${periodOpts}
          </select>
        </div>`;
      }

      const pIdx2 = (periodIdx !== undefined && periodIdx !== null && periodIdx !== '') ? parseInt(periodIdx) : -1;
      const selInterval = pIdx2 >= 0 ? allIntervals[pIdx2] : null;
      const intervals   = selInterval ? [selInterval] : closedIntervals;

      const allLogs = db(KEYS.fuelLogs).filter(l => l.vehicleId === vehicleId);
      const noOdo   = allLogs.filter(l => l.odometer == null || l.odometer === '');
      if (allLogs.length === 0) {
        diagHtml = `<div class="info-box info">No Fuel Log for this vehicle yet. Add at least 2 entries with <strong>odometer</strong> filled in.</div>`;
      } else if (closedIntervals.length === 0) {
        diagHtml = `<div class="info-box info">
          Found <strong>${allLogs.length}</strong> fuel log entries, but need at least <strong>2 entries with odometer</strong> to calculate intervals.
          ${noOdo.length > 0 ? `<br>${noOdo.length} entries have no odometer — edit them to complete.` : ''}
        </div>`;
      }

      if (selInterval?.isOpen) {
        const iv = selInterval;
        const estLit  = iv.litTheo;
        const estCost = estLit && iv.pricePerLiter ? estLit * iv.pricePerLiter : null;
        summaryHtml = `
          <div class="info-box info" style="margin-bottom:20px">
            <strong>Ongoing Period</strong> — Next fill not yet recorded.
            Actual km/L cannot be calculated. Estimate based on theoretical consumption shown below.
          </div>
          <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px">
            <div class="kpi-card" style="border-left:3px solid var(--accent)">
              <div class="kpi-label">Recorded Km</div>
              <div class="kpi-value">${iv.km > 0 ? fmtNum(Math.round(iv.km)) : '0'}<span style="font-size:13px;color:var(--muted)"> km</span></div>
              <div class="kpi-sub">from Trip Log since last fill</div>
            </div>
            <div class="kpi-card" style="border-left:3px solid #a78bfa">
              <div class="kpi-label">Estimated Fuel Used</div>
              <div class="kpi-value">${estLit ? estLit.toFixed(2) + '<span style="font-size:13px;color:var(--muted)"> L</span>' : '-'}</div>
              <div class="kpi-sub">${theoretical ? 'Based on theoretical ' + theoretical + ' km/L' : 'Set theoretical in Vehicle master'}</div>
            </div>
            <div class="kpi-card" style="border-left:3px solid var(--warning)">
              <div class="kpi-label">Estimated Fuel Cost</div>
              <div class="kpi-value" style="font-size:20px;padding-top:4px">${estCost ? fmtCur(Math.round(estCost)) : '-'}</div>
              <div class="kpi-sub">${iv.pricePerLiter ? 'Price: ' + fmtCur(iv.pricePerLiter) + '/L (last fill)' : 'Enter price/L in Fuel Log'}</div>
            </div>
          </div>`;
        chartHtml = `<div class="card" style="text-align:center;padding:32px;color:var(--muted);font-size:13px">
          km/L chart available after next fill is recorded
        </div>`;
      }

      else if (intervals.length > 0) {
        const avgActual      = intervals.reduce((s, x) => s + x.actual, 0) / intervals.length;
        const totalKm        = intervals.reduce((s, x) => s + x.km, 0);
        const totalLitActual = intervals.reduce((s, x) => s + x.lit, 0);

        const totalLitTheo = theoretical ? totalKm / theoretical : null;
        const litDiff      = totalLitTheo !== null ? totalLitTheo - totalLitActual : null;

        const pricedLogs = intervals.filter(x => x.pricePerLiter > 0);
        const avgPrice   = pricedLogs.length > 0
          ? pricedLogs.reduce((s, x) => s + x.pricePerLiter, 0) / pricedLogs.length : null;
        const costDiff   = litDiff !== null && avgPrice ? litDiff * avgPrice : null;

        const diff = theoretical ? avgActual - theoretical : null;
        const diffBadge = diff !== null
          ? `<span class="badge ${diff >= 0 ? 'badge-success' : 'badge-warning'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} km/L</span>`
          : '<span class="badge badge-muted">Set theoretical in Vehicle master</span>';

        const litBadge = litDiff !== null
          ? `<span class="badge ${litDiff >= 0 ? 'badge-success' : 'badge-warning'}">${litDiff >= 0 ? 'Saved' : 'Over'} ${Math.abs(litDiff).toFixed(2)} L</span>`
          : '<span class="badge badge-muted">-</span>';

        const costBadge = costDiff !== null
          ? `<span class="badge ${costDiff >= 0 ? 'badge-success' : 'badge-warning'}">${costDiff >= 0 ? 'Saved' : 'Over'} ${fmtCur(Math.abs(Math.round(costDiff)))}</span>`
          : avgPrice ? '<span class="badge badge-muted">-</span>' : '<span class="badge badge-muted">Enter price/L in Fuel Log</span>';

        summaryHtml = `
          <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
            <div class="kpi-card">
              <div class="kpi-label">Actual Avg</div>
              <div class="kpi-value">${avgActual.toFixed(2)}<span style="font-size:13px;color:var(--muted)"> km/L</span></div>
              <div class="kpi-sub">${intervals.length} fill intervals</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Theoretical (Spec)</div>
              <div class="kpi-value">${theoretical ? theoretical.toFixed(1) + '<span style="font-size:13px;color:var(--muted)"> km/L</span>' : '-'}</div>
              <div class="kpi-sub">from Vehicle master</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Efficiency Delta</div>
              <div class="kpi-value" style="font-size:18px;padding-top:4px">${diffBadge}</div>
            </div>
          </div>
          <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px">
            <div class="kpi-card">
              <div class="kpi-label">Total Distance</div>
              <div class="kpi-value">${fmtNum(Math.round(totalKm))}<span style="font-size:13px;color:var(--muted)"> km</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Saved / Over (Liters)</div>
              <div class="kpi-value" style="font-size:18px;padding-top:4px">${litBadge}</div>
              <div class="kpi-sub">${totalLitTheo ? 'Theoretical: ' + totalLitTheo.toFixed(2) + ' L · Actual: ' + totalLitActual.toFixed(2) + ' L' : ''}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Saved / Over (Rp)</div>
              <div class="kpi-value" style="font-size:18px;padding-top:4px">${costBadge}</div>
              <div class="kpi-sub">${avgPrice ? 'Avg price: ' + fmtCur(Math.round(avgPrice)) + '/L' : 'Enter price/L in Fuel Log'}</div>
            </div>
          </div>`;

        const maxVal = Math.max(...intervals.map(x => x.actual), theoretical || 0) * 1.25;
        const H = 160, W_bar = 36, GAP = 14;
        const totalW = Math.max(300, intervals.length * (W_bar + GAP) + GAP);
        const barHtml = intervals.map((iv, i) => {
          const bH    = Math.max(4, (iv.actual / maxVal) * H);
          const x     = GAP + i * (W_bar + GAP);
          const color = theoretical && iv.actual >= theoretical * 0.9 ? '#22c55e' : '#f59e0b';
          return `<rect x="${x}" y="${H - bH}" width="${W_bar}" height="${bH}" fill="${color}" rx="3" opacity="0.85"/>
            <text x="${x + W_bar/2}" y="${H - bH - 5}" text-anchor="middle" font-size="10" fill="#c0c4d0" font-weight="500">${iv.actual.toFixed(1)}</text>
            <text x="${x + W_bar/2}" y="${H + 15}" text-anchor="middle" font-size="9" fill="#7b8099">${iv.label.slice(0,6)}</text>
            <text x="${x + W_bar/2}" y="${H + 25}" text-anchor="middle" font-size="8" fill="#555870">${iv.km.toFixed(0)}km</text>`;
        }).join('');

        const theoLineY = theoretical ? H - (theoretical / maxVal) * H : null;
        const theoLine  = theoLineY !== null
          ? `<line x1="0" y1="${theoLineY}" x2="${totalW}" y2="${theoLineY}" stroke="#4f7af8" stroke-width="1.5" stroke-dasharray="6,4"/>
             <text x="4" y="${theoLineY - 5}" font-size="9" fill="#4f7af8">${theoretical} km/L (spec)</text>`
          : '';

        const openIv = allIntervals.find(x => x.isOpen);
        const openCard = (!selInterval && openIv) ? `
          <div class="card" style="margin-top:16px;border-left:3px solid var(--accent);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:3px">Ongoing Period (not closed)</div>
              <div style="font-size:13px;font-weight:500">${esc(openIv.periodLabel)}</div>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap">
              <div><div style="font-size:11px;color:var(--muted)">Recorded km</div><div style="font-weight:600">${openIv.km > 0 ? fmtNum(Math.round(openIv.km)) + ' km' : '0 km'}</div></div>
              <div><div style="font-size:11px;color:var(--muted)">Est. Fuel</div><div style="font-weight:600">${openIv.litTheo ? openIv.litTheo.toFixed(2) + ' L' : '-'}</div></div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="renderFuelReport('${vehicleId}', '${allIntervals.length - 1}')">View Detail</button>
          </div>` : '';

        chartHtml = `<div class="card" style="overflow-x:auto">
          <div class="section-title" style="margin-bottom:16px">Fuel Economy per Fill Interval (km/L)</div>
          <svg width="${totalW}" height="${H + 34}" style="display:block;min-width:100%">
            ${barHtml}${theoLine}
          </svg>
          <div class="chart-legend" style="margin-top:12px">
            <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>Efficient (≥ 90% of spec)</div>
            <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Below spec</div>
            ${theoretical ? `<div class="legend-item"><div style="width:16px;height:2px;background:#4f7af8;border-radius:1px"></div>Theoretical target</div>` : ''}
          </div>
        </div>${openCard}`;
      }
    } else {
      chartHtml = `<div class="empty-state"><p>Select a vehicle to view the fuel report.</p></div>`;
    }

    el.innerHTML = `<div class="page">
      <div class="page-header">
        <div><div class="page-title">Fuel Report</div><div class="page-sub">Actual vs. theoretical fuel economy analysis</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:${periodHtml ? '16px' : '24px'};flex-wrap:wrap">
        <label style="color:var(--muted);font-size:12px;white-space:nowrap">Vehicle:</label>
        <select onchange="renderFuelReport(this.value, null)" style="max-width:280px">
          <option value="">-- Select Vehicle --</option>${vehOpts}
        </select>
      </div>
      ${periodHtml}
      ${diagHtml ? `<div style="margin-bottom:20px">${diagHtml}</div>` : ''}
      ${summaryHtml}
      ${chartHtml}
    </div>`;
  }

  window.renderFuelReport = (id, pidx) => render(id, pidx);
  render();
}

PAGES.fuelReport = pageFuelReport;
