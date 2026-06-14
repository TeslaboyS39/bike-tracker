# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step. Open either HTML file directly in Chrome or Edge:
- `index.html` — basic GPS track viewer
- `gps-tracker.html` — advanced viewer with geofencing and history

**File System Access API features require Chrome or Edge** (not Firefox). To serve locally:
```
npx serve .
# or
python -m http.server 8080
```

## Architecture

Two standalone, zero-dependency single-file HTML apps. All logic lives inside `initApp()` which is called only after Leaflet loads from CDN (3-source fallback chain: cdnjs → unpkg → jsdelivr).

### Data flow

```
User uploads GPX/KML
  → FileReader.readAsText()
  → parseGPX() / parseKML()   — DOMParser on raw XML
  → renderTrack(points, name, format)
      → Leaflet polyline on map
      → computeStats()
      → saveTrackToFile()      — File System Access API → local JSON
      → loadHistoricalTracks() — re-renders orange dashed history lines
```

### Persistence layers (gps-tracker.html)

| Data | Storage | Key/File |
|------|---------|----------|
| Folder handle | IndexedDB (`bikeTrackerDB`) | `handles['dirHandle']` |
| Track history | Local folder files | `track_YYYY-MM-DDTHH-MM-SS_Name.json` |
| Geofences | localStorage | `gps_tracker_geofences_v1` |

`index.html` uses the same IDB + folder pattern but no localStorage.

### Local JSON track format

```json
{
  "name": "string",
  "savedAt": "ISO timestamp",
  "sourceFile": "original filename",
  "format": "GPX | KML",
  "stats": { "distanceKm", "maxSpeed", "avgSpeed", "elevGain", "elevLoss", "duration" },
  "points": [{ "lat", "lon", "ele", "time", "speed" }]
}
```

`time` is ISO string or `null`; `speed` is km/h (converted from m/s at parse time for GPX; always `0` for KML).

### gps-tracker.html tab structure

Four tabs — Track, Geofence, Events, History — share a single `map` instance and the same `trackPoints` array. Geofence draw mode uses `map.on('click')` / `map.on('dblclick')` interceptors guarded by a `drawing` boolean flag. `recalculateAllEvents()` runs a full ray-casting pass over all trackpoints × all geofences whenever either changes.

## Key constraints

- KML provides only coordinates (no per-point time/speed). GPX provides full telemetry.
- `showDirectoryPicker()` requires a user gesture; it cannot be called programmatically on load. The saved `FileSystemDirectoryHandle` in IDB uses `queryPermission` (no prompt) on startup, `requestPermission` only when actually reading/writing.
- UI language is Indonesian.

## Learnings Log
- Baca .learnings/LEARNINGS.md di awal setiap session
- Setiap kali dikoreksi user, catat di .learnings/LEARNINGS.md
- Format:
yaml
- date: YYYY-MM-DD
  cat: kategori singkat
  误: apa yang salah
  正: apa yang benar
  则: aturan ke depan

- Jangan duplicate entry
- Maksimal 2 baris per field

## Memory
- Semua file memory disimpan di folder memory/ di root project ini (C:\Users\fatah\OneDrive\Desktop\343gs\bike-tracker\memory\) — *bukan* di path .claude/projects/
- Di awal session: baca memory/MEMORY.md dulu (current state + standing decisions), lalu buka file session terbaru untuk detail
- memory/MEMORY.md adalah orchestrator — berisi: (1) tabel status modul terkini, (2) standing decisions yang berlaku lintas sesi, (3) session log dengan link ke file individual
- Di tengah session setelah selesai task besar, tawarkan user untuk checkpoint
- Saat menulis memory baru: (a) buat file memory/memory-YYYY-MM-DD.md, (b) update tabel Current State dan Session Log di memory/MEMORY.md, (c) carry forward semua *unresolved items dan open decisions* — update statusnya; jangan hanya tulis progress baru