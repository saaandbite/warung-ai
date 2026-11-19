# Brief Proyek — Warung AI (offline-first) untuk #BuildHybridAI 2026

Disusun 16 Nov 2026 ~14:05 WIB, setelah Haris memilih ide ini di WhatsApp (14:02 WIB).
Tim: TDR-3000 — Haris Sandi Purna Yudha, Ahmad Dedad, Faiz Rifki Syuhada (Syuu), Agung Dwi Pangestu.
Lomba: #BuildHybridAI 2026 (Google/Firebase, Devpost) — https://firebasehybridaihackathon.devpost.com/
Submit ditutup: 30 Nov 2026 17:00 ET = 30 Nov 14:00 PT = **1 Des 2026 05:00 WIB**. Hadiah tunai $30.000.
Eligible: Indonesia tidak dikecualikan; semua anggota 18+; jumlah anggota tidak dibatasi.

## Ide dalam satu kalimat
Kasir + stok + keuangan warung kecil yang tetap jalan tanpa internet, dengan asisten AI
yang bisa ditanya offline — lalu sinkron ke cloud saat online.

## Masalah & pengguna
Pemilik warung kecil sering jualan di tempat sinyal tidak stabil. Aplikasi kasir biasa
mati saat offline; catatan manual tercecer. Warung AI mencatat penjualan dan stok
secara lokal dulu, dan AI menjawab pertanyaan dari data toko sendiri tanpa butuh internet.

## Cara kerja hybrid-nya (ini yang dinilai)
- **On-device (Gemini Nano 4 via Firebase AI Logic, Web/Chrome):** tanya-jawab dari
  data toko ("barang apa paling laris minggu ini?", "stok apa hampir habis?") dan
  ringkasan harian otomatis — jalan offline.
- **Cloud (Gemini via Firebase AI Logic, saat online):** fallback kalau pertanyaan
  butuh model lebih besar, plus sinkronisasi data ke Firestore.
- **Firebase pendukung:** Firestore (sinkronisasi), App Check (wajib; debug token
  diterima untuk submission), Authentication.
- Platform: Web dulu (Chrome + PWA supaya bisa offline di HP), host di Vercel
  seperti proyek Space Apps kemarin.

## MVP — 4 fitur inti, jangan ditambah dulu
1. Kasir offline — catat penjualan, hitung total dan kembalian, tersimpan lokal.
2. Stok — stok berkurang otomatis tiap terjual, peringatan stok menipis.
3. AI offline (Nano 4) — tanya-jawab dari data toko + ringkasan harian otomatis.
4. Sinkronisasi cloud — data naik ke Firestore saat ada internet, plus App Check.

Bukan MVP (tahan sampai MVP jalan): akuntansi penuh, multi-cabang, pembayaran QRIS,
notifikasi pemasok, laporan pajak.

## Pembagian tugas (usulan, tim konfirmasi)
- Haris — product & UX, desain antarmuka kasir, naskah + rekaman video demo.
- Syuu — frontend PWA + kasir/stok (pengalaman bangun frontend Space Apps).
- Agung — integrasi Firebase AI Logic (on-device Nano 4 + fallback cloud).
- Ahmad — model data Firestore + sinkronisasi cloud + prompt AI.
- Semua: uji demo di HP Android + Chrome sebelum submit.

## Timeline (menghormati UiPath 16–24 Nov & deadline UiPath 25 Nov)
- **16–18 Nov:** rename draft Devpost jadi "Warung AI", undang tim via "Manage team",
  buat repo GitHub publik + lisensi + README, scaffold PWA + project Firebase.
  Tes paling awal: apakah Gemini Nano 4 jalan di Chrome yang dipakai tim — kalau
  belum tersedia, fallback cloud harus siap sejak awal.
- **19–24 Nov:** bangun kasir + stok (malam hari, sela-sela UiPath).
- **25 Nov:** hari deadline UiPath (+ upload Hari Guru) — Warung AI libur, kecuali review singkat.
- **26–28 Nov:** fitur AI offline + sinkronisasi cloud + poles.
- **29 Nov:** rekam video demo (maks 3 menit) + isi form submit sebagai draft.
- **30 Nov:** buffer. Submit final jauh sebelum 1 Des 05:00 WIB.

## Checklist submit (diverifikasi dari halaman Devpost, 16 Nov 2026)
- [ ] Aplikasi demo yang jalan (Web/Chrome), menunjukkan Firebase AI Logic saat runtime.
- [ ] Repo publik GitHub/GitLab berisi semua source, aset, dan instruksi menjalankan.
- [ ] Video demo maks 3 menit, publik di YouTube, berbahasa Inggris atau subtitle Inggris,
      memperlihatkan aplikasi berfungsi di platform yang dibangun.
- [ ] Deskripsi teks proyek di form Devpost.
- [ ] App Check aktif (debug token diterima).
- [ ] Repo + draft Devpost atas nama tim (bukan "Untitled" lagi).

## Keputusan yang tidak perlu lagi
- **Kuota Google Sprint 2 TIDAK perlu diminta** — ide ini jalan di free tier
  (Firebase AI Logic + Gemini Nano 4). Pengingat kalender "Minta kuota Sprint 2"
  (Sel 18 Nov 20:00 WIB, tenggat 19 Nov 01:00 WIB) sudah tidak relevan — tanyakan
  ke Haris apakah mau dihapus.

## Risiko utama
- Gemini Nano 4 belum tersedia di Chrome tim → uji 16–18 Nov, siapkan fallback cloud.
- Scope merayap (akuntansi penuh) → patok 4 fitur MVP.
- UiPath 16–24 Nov + judging Space Apps sampai 20 Nov → kerja Warung AI malam hari,
  target demo kasir jalan sebelum 25 Nov.
