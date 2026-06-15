# MEMORY INDEX

## Current State (per 2026-06-15)

| Modul | File | Status |
|-------|------|--------|
| VMS App | `vms.html` | ✅ Complete — ~2100 lines |
| Legacy tracker | `gps-tracker.html` | Tetap ada, tidak diubah |
| Legacy viewer | `index.html` | Tetap ada, tidak diubah |

**Features shipped:**
- Master: Vehicle, Driver, Driver License (SIM), Vehicle License (STNK), Geofence Library
- Transactional: Dashboard, Tracking (GPX/KML), Trip Log, Fuel Log, Fuel Report, Maintenance Log, Spare Parts
- Export/Import JSON (sidebar footer) untuk backup data localStorage

---

## Standing Decisions

- **Single-file HTML** — no build step, buka langsung di browser
- **Storage: localStorage** — semua data master + transactional di localStorage dengan prefix `vms_`
- **Dark theme** — design tokens defined in CSS `:root`
- **No emoji** di UI, gunakan SVG icons (defined di `IC` object)
- **Language:** UI dalam Bahasa Indonesia
- **Map:** Leaflet 1.9.4 via CDN (3-source fallback), lazy-loaded hanya saat dibutuhkan
- **Export format:** semua KEYS di-dump ke satu JSON file `vms-backup-YYYY-MM-DD.json`

---

## Session Log

- **2026-06-15** — Redesign lengkap dari gps-tracker.html → vms.html
  - Master: Vehicle, Driver, Driver License (SIM), Vehicle License (STNK), Geofence Library
  - Transactional: Dashboard (KPI), Tracking (GPX/KML + map), Trip Log, Fuel Log, Fuel Report (chart SVG), Maintenance Log
  - Dibangun step-by-step (7 steps) untuk menghindari token limit

- **2026-06-15 (session 2)** — Fitur tambahan:
  - Dashboard redesign: welcome header + greeting, KPI card berwarna dengan icon, layout 2-kolom (alerts | trips)
  - Fuel Report: open interval (pengisian terakhir → sekarang), period dropdown, estimasi BBM dari teoritis
  - Bug fix: trip filter open interval pakai date string comparison, bukan datetime (same-day trips terikut)
  - Maintenance: multi-type checkbox + auto-suggest next due date/odometer
  - Spare Parts: halaman baru, tracking lifetime komponen (wearable/permanen), auto-suggest, status badge
  - Export/Import JSON via sidebar footer
