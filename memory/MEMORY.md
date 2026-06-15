# MEMORY INDEX

## Current State (per 2026-06-15)

| Modul | File | Status |
|-------|------|--------|
| VMS App | `vms.html` | ✅ Complete — ~2200 lines |
| Legacy tracker | `gps-tracker.html` | Tidak diubah |
| Legacy viewer | `index.html` | Tidak diubah |

**Features shipped (vms.html):**
- Master: Vehicle, Driver, SIM, STNK, Geofence Library
- Transactional: Dashboard, Tracking, Trip Log, Fuel Log, Fuel Report, Maintenance Log, Spare Parts
- Export/Import JSON (sidebar footer)

**Open items / backlog:**
- Dashboard: spare parts overdue bisa masuk ke alert section
- Fuel Report: filter by date range
- Trip Log: filter by vehicle / date range

---

## Standing Decisions

- **Single-file HTML** — no build step, buka langsung di Chrome/Edge
- **Storage: localStorage** — prefix `vms_`, 9 keys (vehicles, drivers, driverLicenses, vehicleLicenses, geofences, trips, fuelLogs, maintenance, spareParts)
- **Dark theme** — design tokens di CSS `:root`
- **No emoji** — SVG icons di `IC` object
- **Language:** UI Bahasa Indonesia
- **Map:** Leaflet 1.9.4 via CDN (3-source fallback), lazy-loaded
- **Export format:** `vms-backup-YYYY-MM-DD.json` — semua KEYS dalam satu file
- **Cross-page data:** `window._pendingTripId` pattern, bukan fungsi lintas-page
- **Odometer estimasi:** `Math.max` dari semua fuel log per vehicle
- **Open interval date compare:** string `t.date >= lastDate`, bukan datetime (trip tidak punya field waktu)

---

## Session Log

| Tanggal | Sesi | File Detail | Ringkasan |
|---------|------|-------------|-----------|
| 2026-06-15 | 1 | — | Initial VMS build: skeleton + semua 11 halaman (7-step, token limit workaround) |
| 2026-06-15 | 2 | [memory-2026-06-15.md](memory-2026-06-15.md) | Dashboard redesign, Fuel Report open interval, Maintenance multi-type, Spare Parts, Export/Import |
