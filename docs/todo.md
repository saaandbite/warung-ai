# Ringkasan TODO Warung AI (#BuildHybridAI 2026)

Fokus utama: 4 Fitur Inti MVP + Syarat Wajib Lomba. Jangan tambah fitur berlebih sebelum ini tuntas.

---

## 1. Desain & Rombak UI POS Kasir (Prioritas Utama)
- [x] **Rombak Total UI/UX Kasir POS:**
  - Layout responsif 2 kolom: sisi kiri katalog produk + search bar, sisi kanan panel keranjang belanja & kasir pembayaran yang sticky di desktop.
  - Kartu produk modern (Product Cards): icon barang Lucide SVG, nama produk, badge stok dinamis (hijau aman, merah menipis, abu-abu habis), harga kontras tebal, dan badge kuantitas di keranjang.
  - Komponen Live Search di atas katalog: filter pencarian real-time, badge jumlah produk hasil pencarian, tombol clear search.
  - Panel Keranjang POS: list item dengan kontrol quantity `+` / `−` dan tombol hapus, badge jumlah item, tombol kosongkan keranjang, total tagihan besar, quick cash presets, dan validasi kembalian / kekurangan pembayaran real-time.
- [ ] Tombol tambah stok cepat (restock barang yang sudah ada di tab Stok).

## 2. Kasir & Stok (Offline Core)
- [x] Keranjang belanja real-time (kalkulasi harga, +/- qty, kembalian dinamis).
- [x] Tombol "Muat 15 Produk Contoh Warung" (Indomie, Kopiko, Nabati, Sembako).
- [x] Tombol Uang Cepat / Uang Pas (Exact, 10rb, 20rb, 50rb, 100rb).
- [x] Live search / pencarian nama barang di kasir.
- [ ] Skenario bayar uang besar & pembulatan kembalian: kalau uang yang dibayar jauh lebih besar dari total dan kembaliannya receh/ribet, kasir bisa tanya pembeli "punya Rp X?" supaya kembalian dibulatkan (mis. ke ribuan terdekat) — tampilkan saran nominal pembulatan + kembalian setelah dibulatkan, dan catat selisih pembulatan di struk/ringkasan.
- [ ] Cetak struk: setelah penjualan berhasil, tampilkan struk (nama warung, daftar barang, total, bayar, kembalian, tanggal) dengan tombol cetak via window.print() + gaya print CSS supaya hanya struk yang tercetak.

## 3. Sinkronisasi Cloud (Firebase Firestore)
- [x] Inisialisasi Firebase & upload antrean `syncQueue` (produk & penjualan) ke Firestore.
- [x] Tarik data dari Firestore ke perangkat (pull sync saat dibuka/online + tombol "Tarik data dari cloud") — hanya menambah yang belum ada, tidak menimpa data lokal.
- [ ] Indikator status sinkronisasi yang jelas di UI ("Tersinkron 2 menit lalu").

## 4. Hybrid AI Layer (Firebase AI Logic) — Kunci Hackathon
- [ ] Hubungkan tab "Tanya AI" ke model Gemini via Firebase AI Logic saat online (Cloud fallback).
- [ ] Pengecekan Gemini Nano on-device (`isNanoAvailable()`) untuk Chrome yang mendukung.
- [ ] Context generator: rangkum ringkas penjualan & stok toko untuk prompt AI.

## 5. Syarat Lomba & Demo Final
- [ ] Pasang Firebase App Check (debug token untuk localhost).
- [ ] Deploy web ke Vercel atau Firebase Hosting.
- [ ] Rekam video demo (maksimal 3 menit).
