# Roadmap & Tugas Warung AI (#BuildHybridAI 2026)

Dokumen ini adalah daftar kerja tim **TDR-3000** sampai submit **1 Des 2026 05:00 WIB**. Urutan mengikuti dampak per jam kerja: gerbang utama dulu, poles tampilan belakangan. Setiap tugas mencantumkan penanggung jawab (PIC) — PIC yang tertulis adalah yang mengerjakan, bukan sekadar yang mengawasi.

**Tim:** Haris (product & UX, perbaikan sync) · Syuhada (frontend + edit video) · Agung (Firebase AI Logic) · Ahmad (model data, App Check, take video)

## 0. Keputusan yang harus diputus malam ini (23 Nov) — PIC: Haris

- [x] Sahkan wedge: Penasihat Kulakan ("kasir yang memberi tahu pemilik warung apa yang harus dibeli besok — dengan uang yang ia punya") — **DISAHKAN Haris 23 Nov 11:15 WIB.** Foto nota bukan wedge.
- [ ] Foto nota dibangun atau dicoret. (Mengikuti go/no-go 26 Nov: hanya dibangun bila Penasihat Kulakan lolos; dipotong pertama bila Agung macet.)
- [ ] Pilot: kunjungan warung atau seed dari chat warung yang dikenal (seed dinyatakan jujur sebagai data contoh).

## 1. AI Logic + App Check (gerbang utama — dikerjakan dulu)

- [ ] **1.1. Coba panggilan AI pertama (23–24 Nov, kelar jam 20.00) — Agung:** skeleton `ai.js` baru + satu panggilan cloud pertama + mulai unduh Nano di laptop perekam.
- [ ] **1.2. Q&A cloud end-to-end (24–25 Nov) — Agung:** tanya-jawab grounded dari data toko + badge `inferenceSource` yang jujur (Nano/Cloud/Template).
- [ ] **1.3. Penasihat Kulakan (26 Nov) — Agung + Ahmad:** satu panggilan model, JSON terstruktur (`responseSchema`), validasi pasca-model di JS (hitung ulang angka, potong dari bawah bila melebihi budget, buang item di luar katalog), kartu UI + angka rupiah yang dihitung kode.
- [ ] **1.4. Go/no-go AI (26 Nov malam) — Semua:** kriteria cloud-only — satu pertanyaan kulakan dijawab model dari data toko yang baru diubah, badge benar, di HP. Nano bukan kriteria go.
- [ ] **1.5. App Check + `firestore.rules` (23–24 Nov) — Ahmad (+ Agung):** MERGED ke `main` 23 Nov 18:44 (PR #1, commit ba77967) — kode App Check Fraud Defense + `firestore.rules` + site key sudah live di Vercel. Sisa: daftarkan debug token localhost di konsol (Haris), deploy `firestore.rules` (`firebase deploy --only firestore:rules`), verifikasi sync live, baru nyalakan enforcement Firestore.
- [x] **1.6. Hapus klaim palsu di UI (SELESAI 23 Nov) — Haris:** hapus "Offline: Gemini Nano 4..." + placeholder "minggu ini" → "hari ini" + badge status model yang jujur. (Hint + placeholder + teks loading sudah diperbaiki; badge model menyusul bersama penerapan AI Logic.)
- [ ] **1.7. Verifikasi kuota cloud (23–24 Nov) — Agung:** cek kuota aktual Flash-Lite di AI Studio sebelum memutuskan final.

## 2. Keamanan & kebenaran data — PIC: Syuhada

- [ ] **2.1. Stored-XSS:** render dengan `textContent` / escape HTML di semua jalur (produk, keranjang, hasil pencarian). (~1 jam)
- [ ] **2.2. Bug tanggal UTC:** pakai tanggal lokal WIB saat mencatat `date` dan `getTodaySummary()`. (<1 jam)
- [ ] **2.3. Checkout aman:** disable tombol selama `recordSale()` async; cek ulang stok di dalam transaksi tulis; validasi input + try/catch form. (~0,5 hari)

## 3. Kasir: struk + restock — PIC: Syuhada

- [ ] **3.1. Modal struk:** nomor nota, rincian barang, total, kembalian; tombol "Transaksi Baru" yang mengosongkan keranjang.
- [ ] **3.2. Cetak struk:** `window.print()` + `@media print` (thermal 58/80mm).
- [ ] **3.3. Bagikan struk via WhatsApp:** tombol salin teks nota.
- [ ] **3.4. Restock cepat:** tombol `+ Stok` per produk + ambang menipis per produk + fungsi `updateProductStock(id, addedQty)` di `js/db.js` yang mencatat ke `syncQueue`.
- [ ] **3.5. Saran pembulatan kembalian:** contoh: total Rp 23.500, dibayar Rp 50.000 → saran "minta Rp 3.500 agar kembalian genap Rp 30.000".

## 4. Sinkronisasi (perbaikan minimal) — PIC: Haris

- [x] **4.1. Pull memperbarui produk yang sudah ada (SELESAI 23 Nov, commit 75fbd01):** stok/harga/nama diperbarui bila data cloud lebih baru (`syncedAt`) dan isinya berbeda; tidak menimpa perubahan lokal yang masih antre.
- [ ] **4.2. Transaksi atomik — Haris:** penjualan + `syncQueue.add()` dalam transaksi yang sama. (~30 menit — didahulukan)
- [ ] **4.3. Karantina per-item gagal + retry count — Haris:** satu item gagal tidak boleh memblokir antrean selamanya.
- [ ] **4.4. Doc ID komposit `${deviceId}-${localId}` (27 Nov) — Haris:** pengganti migrasi UUID penuh (ditunda pasca-lomba).
- [ ] **4.5. Try/catch per dokumen saat pull — Haris:** satu dokumen korup tidak mematikan seluruh pull.

## 5. UX & kelengkapan produk — PIC: Syuhada (kecuali disebut lain)

- [ ] **5.1. Ganti `alert()` dengan toast** untuk alur demo yang kritis (sisanya boleh tetap `alert` bila waktu habis).
- [ ] **5.2. Badge sinkronisasi:** "Terakhir sinkron HH:MM" di tab Ringkasan.
- [ ] **5.3. Tab Stok:** ubah `<ul>` polos menjadi tabel/kartu (nama, harga, stok, badge status, aksi) + filter "Semua / Menipis / Habis".
- [ ] **5.4. Tab Ringkasan:** 3 kartu metrik (omzet hari ini, jumlah transaksi, antrean cloud).
- [x] **5.5. Seed 14 hari (SELESAI 23 Nov, lebih awal) — Haris:** skrip seed (`seedSampleSales()` di `js/db.js`, tombol "Isi Penjualan Contoh 14 Hari" di tab Stok) + validasi realisme seed; seed dinyatakan sebagai data contoh. Cek akhir di HP: Kopiko/Teh Botol/Aqua menipis (sisa 2), omzet contoh ~Rp 100rb/hari, tidak ada stok minus.
- [x] **5.6. Ikon PWA 192/512 (SELESAI 23 Nov) — Haris:** ikon toko hijau (`icons/icon-192.png`, `icons/icon-512.png`); 512 didaftarkan sebagai maskable di manifest.
- [ ] **5.7. Perbarui README + todo ini — Haris:** supaya statusnya jujur (sync/AI yang sebenarnya, batasan ID komposit, seed sebagai data contoh).
- [ ] **5.8. Foto nota → draf restock (27 Nov, BERSYARAT) — Agung + Syuhada:** hanya bila Penasihat Kulakan lolos go/no-go 26 Nov; dipotong pertama bila Agung macet; demo hanya nota cetak.

## 6. Video demo 3 menit + Devpost — PIC: Haris (naskah + Devpost) · Ahmad (take video) · Syuhada (edit video)

- [ ] **6.1. Naskah video (28 Nov, gladi bersih):** 0:00–0:10 hook mode pesawat + URL → 0:10–0:50 hybrid yang jujur (badge Cloud di HP, badge Nano di laptop hanya bila benar-benar terjadi) → 0:50–1:30 kasir + struk → 1:30–2:10 Penasihat Kulakan (satu angka rupiah yang dihitung kode) → 2:10–2:40 foto nota (hanya bila dibangun) → 2:40–2:50 sync + still frame App Check *Enforced* → 2:50–3:00 penutup.
- [ ] **6.2. Take video (29 Nov pagi, dari build beku) — Ahmad:** rekam pagi hari (kuota penuh); penjualan Sabun 11 pcs harus sudah tersinkron sebelum rekaman. Naskah + arahan tetap Haris (6.1).
- [ ] **6.3. Edit video presentasi 3 menit — Syuhada:** potong sesuai naskah, subtitle Inggris, pastikan badge dan angka di layar terbaca.
- [ ] **6.4. Aturan kejujuran video (tidak bisa dinegosiasikan):** tidak ada badge Nano palsu; seed dinyatakan sebagai data contoh; anomali masuk video hanya bila seed ≥ 14 hari; angka rupiah dihitung kode dan ditampilkan sebagai perkiraan ("≈").
- [ ] **6.5. Isi draft Devpost (29–30 Nov) — Haris:** deskripsi teks, repo, video, checklist; verifikasi status draft atas nama tim. (Teks draf sudah siap di `docs/devpost-draft.md`; tinggal isi tautan video + tempel ke form.)
- [ ] **6.6. Submit final (30 Nov) — Haris:** jauh sebelum 1 Des 05:00 WIB.

## 7. Daftar potong — jangan dibangun sebelum 1 Des

Foto rak → hitung stok · anomali mandiri · penasihat harga/margin (mandiri) · buku bon + draf WA · ringkasan naratif model · chat AI bebas sebagai jalur utama · Grounding Search/Maps · Auth · migrasi UUID penuh · pagination/delta sync · riwayat transaksi penuh · toast menyeluruh (kecuali alur demo kritis) · pilot kunjungan warung · PPOB/bon sebagai fitur · multi-cabang / QRIS · akuntansi penuh.

**Urutan pemotongan bila meleset:** riwayat transaksi → toast menyeluruh → doc ID komposit → anomali dari video → foto nota. **Yang tidak boleh dipotong:** AI Logic nyata, App Check, video, Penasihat Kulakan.

## Timeline harian 23 Nov – 1 Des 05:00 WIB

| Hari | Fokus | PIC |
|---|---|---|
| Sen 23 Nov (malam) | Kickoff keputusan (§0); coba panggilan AI pertama (boleh geser ke 24 Nov); App Check draft; hapus klaim palsu; XSS + tanggal WIB | Semua |
| Sel 24 Nov (malam) | Q&A cloud + badge; antrean atomik + seed 14 hari; checkout guard; ikon PWA; verifikasi kuota | Agung/Ahmad/Syuhada/Haris |
| Rab 25 Nov | LIBUR (deadline UiPath + Hari Guru). Review 30 menit: Nano sudah terunduh? Q&A jalan? Seed realistis? | Haris |
| Kam 26 Nov | Penasihat Kulakan penuh; karantina per-item; struk + restock; uji end-to-end; malam: GO/NO-GO AI | Semua |
| Jum 27 Nov | Foto nota (hanya bila go); pull-perbarui + ID komposit; uji dua perangkat #1 | Agung/Ahmad/Syuhada/Haris |
| Sab 28 Nov | Penjualan nyata + uji end-to-end penuh; BEKU BUILD 12:00 WIB; sore: bug-bash + gladi bersih video | Semua |
| Min 29 Nov | Take video 3 menit pagi; isi draft Devpost | Ahmad (take) + Haris (Devpost) + Syuhada (edit) |
| Sen 30 Nov | Buffer: tonton ulang video; perbaiki teks Devpost; submit final | Haris |
| Sel 1 Des 05:00 WIB | Deadline | — |
