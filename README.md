# Warung AI — Kasir warung offline-first dengan AI on-device

> Offline-first cashier, stock & finance for small warungs, with an on-device AI
> assistant. Built for **#BuildHybridAI 2026** (Google / Firebase, Devpost).

Tim **TDR-3000**: Haris Sandi Purna Yudha, Ahmad Dedad, Faiz Rifki Syuhada (Syuu),
Agung Dwi Pangestu.

## Ide dalam satu kalimat

Kasir + stok + keuangan warung kecil yang tetap jalan tanpa internet, dengan
asisten AI yang bisa ditanya offline — lalu sinkron ke cloud saat online.

## Masalah

Pemilik warung kecil sering jualan di tempat sinyal tidak stabil. Aplikasi kasir
biasa mati saat offline; catatan manual tercecer. Warung AI mencatat penjualan
dan stok secara lokal dulu, dan AI menjawab pertanyaan dari data toko sendiri
tanpa butuh internet.

## Cara kerja hybrid-nya

- **On-device (Gemini Nano 4 via Firebase AI Logic):** tanya-jawab dari data toko
  ("barang apa paling laris minggu ini?", "stok apa hampir habis?") dan ringkasan
  harian otomatis — jalan offline, di Chrome desktop.
- **Cloud (Gemini via Firebase AI Logic, saat online):** fallback kalau pertanyaan
  butuh model lebih besar, plus sinkronisasi data ke Firestore.
- **Firebase pendukung:** Firestore (sinkronisasi), App Check (wajib untuk
  submission), Authentication.

Platform: Web (PWA — Service Worker + IndexedDB — supaya bisa offline di HP),
host di Vercel.

## MVP — 4 fitur inti

1. **Kasir offline** — catat penjualan, hitung total dan kembalian, tersimpan lokal.
2. **Stok** — stok berkurang otomatis tiap terjual, peringatan stok menipis.
3. **AI offline (Nano 4)** — tanya-jawab dari data toko + ringkasan harian otomatis.
4. **Sinkronisasi cloud** — data naik ke Firestore saat ada internet, plus App Check.

Bukan MVP (tahan sampai MVP jalan): akuntansi penuh, multi-cabang, pembayaran
QRIS, notifikasi pemasok, laporan pajak.

## Struktur proyek

```
index.html            # App shell PWA (Kasir / Stok / AI / Ringkasan)
manifest.json         # Manifest PWA
sw.js                 # Service Worker (cache-first app shell)
css/styles.css        # Styling dasar, mobile-first
js/app.js             # Entry point: navigasi tab, status online/offline
js/db.js              # IndexedDB lokal: produk, penjualan, antrean sinkronisasi
js/ai.js              # Firebase AI Logic: Nano on-device + fallback cloud (TODO)
js/sync.js            # Sinkronisasi antrean lokal ke Firestore saat online (TODO)
js/firebase-config.example.js  # Contoh konfigurasi Firebase (isi dengan punyamu)
docs/brief.md         # Brief proyek lengkap (ide, timeline, checklist submit)
```

## Menjalankan secara lokal

Tidak ada build step. Jalankan dari folder proyek dengan server statis apa saja:

```sh
npx serve .
# lalu buka http://localhost:3000
```

Service Worker hanya aktif lewat `http://localhost` atau HTTPS.

## Konfigurasi Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com).
2. Aktifkan **Firestore**, **Authentication**, **App Check**, dan **Firebase AI Logic**.
3. `js/firebase-config.js` berisi konfigurasi web app project Firebase-mu dan
   sudah di-commit — ini public client config (bukan rahasia server), jadi
   deployment Vercel langsung bisa sync ke Firestore. Jangan pernah commit
   service account JSON atau kunci privat ke repo ini.
4. Untuk pengembangan, App Check boleh memakai debug token (diterima untuk
   submission hackathon).

## Tes paling awal (critical path)

Sebelum membangun jauh, uji apakah **Gemini Nano 4 jalan di Chrome yang dipakai
tim** (Chrome desktop v139+, butuh ~22 GB ruang kosong + GPU >4 GB VRAM atau
RAM 16 GB). Nano tidak jalan di Chrome HP — di HP aplikasi fallback ke cloud
(butuh internet). Kalau Nano belum tersedia, fallback cloud harus siap sejak awal.

## Pembagian tugas

- **Haris** — product & UX, desain antarmuka kasir, naskah + rekaman video demo.
- **Syuu** — frontend PWA + kasir/stok.
- **Agung** — integrasi Firebase AI Logic (Nano on-device + fallback cloud).
- **Ahmad** — model data Firestore + sinkronisasi cloud + prompt AI.

## Timeline

- **16–18 Nov:** repo + scaffold PWA + project Firebase; tes Nano 4.
- **19–24 Nov:** kasir + stok (malam hari, sela-sela UiPath).
- **25 Nov:** libur (deadline UiPath).
- **26–28 Nov:** AI offline + sinkronisasi cloud + poles.
- **29 Nov:** rekam video demo (maks 3 menit) + isi form submit sebagai draft.
- **30 Nov:** buffer. Submit final sebelum **1 Des 2026 05:00 WIB**.

## Checklist submit

- [ ] Aplikasi demo yang jalan (Web/Chrome), menunjukkan Firebase AI Logic saat runtime.
- [ ] Repo publik berisi semua source, aset, dan instruksi menjalankan.
- [ ] Video demo maks 3 menit, publik di YouTube, berbahasa Inggris atau subtitle Inggris.
- [ ] Deskripsi teks proyek di form Devpost.
- [ ] App Check aktif (debug token diterima).
- [ ] Repo + draft Devpost atas nama tim (bukan "Untitled" lagi).

## Lisensi

MIT — lihat [LICENSE](LICENSE).
