# VMS — Vehicle Monitoring System

Aplikasi monitoring kendaraan berbasis web, single-file, tanpa instalasi. Buka langsung di browser.

## Fitur

**Master Data**
- Kendaraan — plat, brand, model, tahun, CC, konsumsi BBM teoritis (km/L)
- Driver — data pengemudi, status aktif/nonaktif
- Driver License (SIM) — nomor, tipe, tanggal expired, alert mendekati expired
- Vehicle License (STNK) — nomor, tanggal expired, pajak
- Geofence Library — polygon area pada peta (draw langsung di map)

**Operasional**
- **Dashboard** — KPI cards, alert maintenance due (date & km-based), peringatan dokumen expired, trip terbaru, infografis aktivitas perjalanan & konsumsi BBM, fleet status
- **Tracking** — upload GPX/KML, visualisasi rute 3 mode (Speed / Gear / Harshness), satellite/street map toggle, simpan ke Trip Log
- **Riding Analysis** — estimasi gear, akselerasi harshness, riding score 0–100 (Excellent/Good/Fair/Poor) per trip; distribusi gear & smoothness
- **Trip Log** — riwayat semua perjalanan + riding score badge per trip, klik untuk replay di peta
- **Fuel Log** — catatan pengisian BBM dengan timestamp, odometer, harga per liter
- **Fuel Report** — grafik konsumsi aktual vs teoritis (km/L), analisis hemat/boros dalam liter dan rupiah, deteksi periode berlangsung
- **Maintenance Log** — catatan servis multi-jenis dalam satu entri, auto-suggest tanggal & odometer next due
- **Spare Parts** — tracking penggantian komponen, estimasi pemakaian (km), status OK/Soon/Replace!

## Cara Pakai

1. Clone atau download repo ini
2. Buka `vms.html` langsung di **Chrome** atau **Edge**
3. Tidak perlu install, build, atau server

```
# Opsional: serve lokal jika butuh akses dari perangkat lain
npx serve .
# atau
python -m http.server 8080
```

> Firefox tidak didukung — fitur upload GPX/KML bergantung pada File API yang optimal di Chromium.

## Penyimpanan Data

Semua data disimpan di **localStorage** browser. Data tidak dikirim ke server manapun.

**Backup & Restore** — tombol *Export Data* dan *Import Data* tersedia di bagian bawah sidebar:
- Export → menghasilkan file `vms-backup-YYYY-MM-DD.json`
- Import → pulihkan data dari file backup tersebut

Lakukan export secara berkala untuk menghindari kehilangan data jika browser cache dibersihkan.

## Tech Stack

| | |
|---|---|
| UI | Vanilla HTML + CSS + JavaScript (no framework) |
| Peta | [Leaflet.js](https://leafletjs.com/) 1.9.4 — CDN, lazy-loaded |
| Map search | Nominatim geocoder (gratis, tanpa API key) |
| Satellite tiles | ESRI World Imagery (gratis, tanpa API key) |
| Storage | `localStorage` (prefix `vms_`) + optional File System Access API |
| Format GPS | GPX, KML |
| Build | Tidak ada — buka dengan local server |

## File

| File | Keterangan |
|------|------------|
| `vms.html` | App shell — HTML structure + CSS |
| `js/store.js` | Data layer — localStorage + File System API dual-write |
| `js/core.js` | Router, sidebar, utils, Leaflet loader, riding analysis algorithm |
| `js/pages/dashboard.js` | Dashboard — KPI, charts, alerts |
| `js/pages/master.js` | Vehicle, Driver, Licenses, Geofences |
| `js/pages/tracking.js` | GPS tracking + riding analysis visualization |
| `js/pages/trips.js` | Trip Log + Fuel Log |
| `js/pages/fuel-report.js` | Fuel efficiency report |
| `js/pages/maintenance.js` | Maintenance Log + Spare Parts |
| `gps-tracker.html` | Legacy — GPS viewer dengan geofencing |
| `index.html` | Legacy — GPS track viewer sederhana |
