# Ringkasan TODO Warung AI (#BuildHybridAI 2026)

Fokus utama: 4 Fitur Inti MVP + Syarat Wajib Lomba. Jangan tambah fitur berlebih sebelum ini tuntas.

---

## 1. Kasir & Stok (Offline) — Prioritas Saat Ini
- [x] Keranjang belanja real-time (kalkulasi harga, +/- qty, kembalian dinamis).
- [x] Tombol "Muat 15 Produk Contoh Warung" (Indomie, Kopiko, Nabati, Sembako).
- [x] Tombol Uang Cepat / Uang Pas (Exact, 10rb, 20rb, 50rb, 100rb).
- [ ] Live search / pencarian nama barang di kasir.
- [ ] Tombol tambah stok cepat (restock barang yang sudah ada).

## 2. Sinkronisasi Cloud (Firebase Firestore)
- [x] Inisialisasi Firebase & upload antrean `syncQueue` (produk & penjualan) ke Firestore.
- [ ] Indikator status sinkronisasi yang jelas di UI ("Tersinkron 2 menit lalu").

## 3. Hybrid AI Layer (Firebase AI Logic) — Kunci Hackathon
- [ ] Hubungkan tab "Tanya AI" ke model Gemini via Firebase AI Logic saat online (Cloud fallback).
- [ ] Pengecekan Gemini Nano on-device (`isNanoAvailable()`) untuk Chrome yang mendukung.
- [ ] Context generator: rangkum ringkas penjualan & stok toko untuk prompt AI.

## 4. Syarat Lomba & Demo Final
- [ ] Pasang Firebase App Check (debug token untuk localhost).
- [ ] Deploy web ke Vercel atau Firebase Hosting.
- [ ] Rekam video demo (maksimal 3 menit).
