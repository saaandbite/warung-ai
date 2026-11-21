# Ringkasan TODO Warung AI (#BuildHybridAI 2026)

Fokus utama: 4 Fitur Inti MVP + Syarat Wajib Lomba. Jangan tambah fitur berlebih sebelum ini tuntas.

---

## 1. Desain & Rombak Total UI (Prioritas Tinggi - Tampilan Kasir Modern)
- [ ] **Rombak Total UI/UX Kasir & PWA:**
  - Desain modern kasir POS (Point of Sale): clean typography, kartu produk berbayang halus, rounded corner konsisten, dan palet warna profesional (hijau warung modern + netral abu-abu).
  - Layout desktop responsif 2 kolom: sisi kiri katalog produk + search bar, sisi kanan panel keranjang/struk checkout yang sticky.
  - Tampilan mobile jempol-friendly (bottom-sheet / sticky checkout bar).
  - Tampilan kartu produk yang jelas (nama, badge kategori/stok, harga tebal, foto/ikon rapi tanpa emoji).
  - Panel ringkasan & status koneksi yang elegan.

## 2. Kasir & Stok (Offline)
- [x] Keranjang belanja real-time (kalkulasi harga, +/- qty, kembalian dinamis).
- [x] Tombol "Muat 15 Produk Contoh Warung" (Indomie, Kopiko, Nabati, Sembako).
- [x] Tombol Uang Cepat / Uang Pas (Exact, 10rb, 20rb, 50rb, 100rb).
- [ ] Live search / pencarian nama barang di kasir.
- [ ] Tombol tambah stok cepat (restock barang yang sudah ada).
- [ ] Skenario bayar uang besar & pembulatan kembalian: kalau uang yang dibayar jauh lebih besar dari total dan kembaliannya receh/ribet, kasir bisa tanya pembeli "punya Rp X?" supaya kembalian dibulatkan (mis. ke ribuan terdekat) — tampilkan saran nominal pembulatan + kembalian setelah dibulatkan, dan catat selisih pembulatan di struk/ringkasan.

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
