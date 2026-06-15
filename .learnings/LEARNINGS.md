- date: 2026-06-15
  cat: date-comparison
  误: Filter trip pakai `new Date(t.date + 'T00:00') >= lastTs` — trip di hari yg sama dgn fill-up (tapi berbeda jam) jadi ter-exclude
  正: Bandingkan date string langsung: `(t.date || '') >= lastDate` — karena trip hanya simpan YYYY-MM-DD tanpa jam
  则: Kalau salah satu sisi perbandingan tidak punya komponen waktu, jangan convert ke Date object — pakai string comparison

- date: 2026-06-15
  cat: array-subset-check
  误: Setelah menambah open interval ke `allIntervals`, check `allIntervals.length === 0` untuk kondisi "belum ada data" masih pakai total array
  正: Pisah dulu `closedIntervals = allIntervals.filter(x => !x.isOpen)`, lalu check `closedIntervals.length === 0`
  则: Kalau array di-augment dengan sentinel/virtual items (open interval, placeholder, dll), selalu buat subset filtered sebelum logic check

- date: 2026-06-15
  cat: global-function-scope
  误: `viewTrip()` didefinisikan sbg `window.viewTrip` di dalam `pageTripLog` — dipanggil dari Dashboard sebelum Trip Log page pernah di-render, jadi undefined
  正: Gunakan pola `window._pendingTripId = id; navigate('tracking')` yang tidak bergantung pada page lain sudah di-render
  则: Fungsi yang dipakai lintas-page harus didefinisikan di scope global (luar semua page function), atau gunakan data-passing pattern via `window._` property
