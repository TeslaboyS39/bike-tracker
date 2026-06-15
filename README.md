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
- **Dashboard** — KPI cards, peringatan dokumen mendekati expired, trip terbaru
- **Tracking** — upload GPX/KML, visualisasi rute dengan warna berdasarkan kecepatan, simpan ke Trip Log
- **Trip Log** — riwayat semua perjalanan, klik untuk replay di peta
- **Fuel Log** — catatan pengisian BBM dengan timestamp, odometer, harga per liter
- **Fuel Report** — grafik konsumsi aktual vs teoritis (km/L), analisis hemat/boros dalam liter dan rupiah, deteksi periode berlangsung (sejak isi bensin terakhir)
- **Maintenance Log** — catatan servis multi-jenis dalam satu entri, auto-suggest tanggal & odometer next due
- **Spare Parts** — tracking penggantian komponen, estimasi pemakaian (km), status OK/Segera/Ganti!

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
| Storage | `localStorage` (prefix `vms_`) |
| Format GPS | GPX, KML |
| Build | Tidak ada — single file |

## File

| File | Keterangan |
|------|------------|
| `vms.html` | Aplikasi utama — Vehicle Monitoring System |
| `gps-tracker.html` | Legacy — GPS viewer dengan geofencing |
| `index.html` | Legacy — GPS track viewer sederhana |
