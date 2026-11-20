# Master TODO List — Warung AI (#BuildHybridAI 2026)

Dokumen ini adalah roadmap komprehensif pengembangan Warung AI, mencakup Frontend, Backend, Business Logic, Hybrid AI, dan persiapan submission kompetisi.

---

## 1. Logic Bisnis & Alur Toko (Core Offline)

### Transaksi Kasir
- [ ] **Kalkulasi & Validasi Harga Beli (Modal) vs Harga Jual:**
  - Tambahkan atribut `costPrice` (harga modal) pada produk agar kasir bisa menghitung keuntungan kotor (*gross profit*).
- [ ] **Quick Cash Presets (Tombol Uang Pas):**
  - Tombol nominal cepat: "Uang Pas", "Rp 10.000", "Rp 20.000", "Rp 50.000", "Rp 100.000".
- [ ] **Pencarian & Filter Cepat:**
  - Input pencarian barang real-time (nama / SKU).
  - Filter kategori produk (Sembako, Minuman, Makanan Ringan, Rokok, Pulsa/Lainnya).
- [ ] **Pembatalan Transaksi (Void / Refund):**
  - Fitur pembatalan transaksi yang mengembalikan jumlah stok ke IndexedDB dan mencatat status `void` ke antrean sinkronisasi.
- [ ] **Cetak / Ekspor Struk Transaksi:**
  - Integrasi pencetakan nota sederhana (Web Print / thermal receipt styling).
  - Opsi simpan struk digital (tampilan teks rapi untuk dikirim via WhatsApp pembeli).

### Manajemen Inventaris & Stok
- [ ] **Restock (Kulakan / Stok Masuk):**
  - Form pencatatan stok masuk (tambah stok tanpa mengubah harga jual atau memperbarui harga modal terbaru).
- [ ] **Batas Minimum Stok Fleksibel per Produk:**
  - Mengganti ambang batas *hardcoded* (5) dengan field `minStock` dinamis per masing-masing barang.
- [ ] **Riwayat Pergerakan Stok (Audit Trail):**
  - Pencatatan log setiap kali stok bertambah (kulakan) atau berkurang (terjual / rusak / susut).
- [ ] **Katalog Barang Default / Sample Data:**
  - Tombol "Muat Data Awal Warung" untuk memuat ~15 produk umum warung kelontong Indonesia (Indomie, Kopi Kapal Api, Beras, dsb.) agar demo langsung terasa hidup.

### Keuangan & Analitik Ringan
- [ ] **Laba Kotor Harian:**
  - Formula: $\text{Laba} = \sum (\text{Harga Jual} - \text{Harga Beli}) \times \text{Qty}$.
- [ ] **Filter Rentang Waktu:**
  - Tampilkan data: Hari Ini, Kemarin, 7 Hari Terakhir, Bulan Ini.
- [ ] **Backup & Restore Lokal:**
  - Tombol Ekspor JSON database lokal (IndexedDB) dan Impor JSON untuk cadangan manual jika perangkat offline total dalam waktu lama.

---

## 2. Frontend & Pengalaman Pengguna (PWA Mobile-First)

### Desain & Ergonomi Kasir
- [ ] **Mobile-First Layout & Touch Ergonomics:**
  - Layout jempol-friendly untuk layar smartphone Android.
  - Tampilan split untuk desktop/tablet (kiri: katalog produk bertombol besar, kanan: keranjang belanja statis).
- [ ] **Visual Feedback & Haptics:**
  - Haptic feedback getaran lembut (`navigator.vibrate(50)`) saat tombol produk diklik.
  - Animasi transisi saat item masuk ke keranjang.
  - Badge kuantitas yang sudah ada di keranjang pada tombol produk.
- [ ] **Status Bar Jaringan & Sinkronisasi:**
  - Indikator koneksi yang jelas: Badge "Offline (Tersimpan Lokal)" vs "Online (Tersinkron)".
  - Animasi status: *Syncing*, *Success*, *Error (Retry)*.
  - Info waktu terakhir sinkron (*"Terakhir sinkron: 5 menit lalu"*).

### PWA & Service Worker
- [ ] **Add to Home Screen (A2HS):**
  - Tangani event `beforeinstallprompt` dengan tombol pasang aplikasi kustom di header.
- [ ] **Ikon & Splash Screen Lengkap:**
  - Siapkan ikon PWA resolusi lengkap (`192x192`, `512x512`, `maskable`) di `manifest.json`.
- [ ] **Handling Update Service Worker:**
  - Notifikasi toast saat ada versi aplikasi baru: *"Pembaruan aplikasi tersedia. [Muat Ulang]"*.

---

## 3. Backend & Sinkronisasi Cloud (Firebase / Firestore)

### Model Data Firestore & Sinkronisasi Dua Arah
- [ ] **Multi-Store Isolation:**
  - Gunakan struktur koleksi: `stores/{storeId}/products/{productId}` dan `stores/{storeId}/sales/{saleId}` agar siap menampung akun warung berbeda.
- [ ] **Two-Way Synchronization (Unduh Perubahan dari Cloud):**
  - Selain kirim data lokal ke cloud, ambil pembaruan produk dari Firestore saat pertama kali login atau saat online.
- [ ] **Konflik Stok (Conflict Resolution):**
  - Implementasi aturan jika ada perbedaan data antara lokal dan cloud (prioritaskan timestamp terbaru `updatedAt`).

### Keamanan & App Check (Kunci Penilaian #BuildHybridAI)
- [ ] **Firebase Authentication:**
  - Mode *Anonymous Sign-In* di awal agar pengguna tidak dipaksa registrasi saat pertama kali pakai warung offline.
  - Opsi *Link to Google Account* untuk menghubungkan data toko ke akun pemilik warung.
- [ ] **Firestore Security Rules:**
  - Perketat aturan akses Firestore dari `test mode` menjadi *authenticated store owner only*.
- [ ] **Integrasi App Check:**
  - Inisialisasi App Check SDK (`initializeAppCheck`).
  - Pasang **Debug Provider Token** untuk pengujian di `localhost` (diterima resmi oleh panitia Google/Devpost).
  - Pasang **reCAPTCHA v3 Provider** untuk hosting production di Vercel/Firebase Hosting.

---

## 4. Hybrid AI Layer (Firebase AI Logic: Nano + Cloud Fallback)

### Context Engineering (Penyusunan Data Toko)
- [ ] **Prompt Context Aggregator:**
  - Fungsi untuk merangkum data penjualan 7 hari terakhir, daftar stok saat ini, item terlaris, dan jam ramai ke dalam format teks ringkas yang hemat token.
- [ ] **System Prompt Persona:**
  - Persona asisten warung: ramah, ringkas, memakai Bahasa Indonesia yang natural, dan fokus memberikan wawasan bisnis praktis untuk pedagang kecil.

### On-Device Model (Gemini Nano via Firebase AI Logic / Prompt API)
- [ ] **Deteksi Hardware & Ketersediaan Model:**
  - Pengecekan kapabilitas browser secara anggun (`isNanoAvailable()`).
  - Indikator UI: label *"Model: On-Device (Gemini Nano)"* vs *"Model: Cloud (Gemini)"*.
- [ ] **Streaming Output:**
  - Tampilkan teks jawaban AI secara *streaming/typewriter* agar pengguna tidak menunggu lama saat model berpikir.
- [ ] **Skenario Tanya-Jawab Khas Warung:**
  - *"Barang apa yang paling laku 3 hari ini?"*
  - *"Stok apa yang harus saya beli lagi besok?"*
  - *"Berapa perkiraan omzet saya hari ini dibanding kemarin?"*

### Cloud Fallback & Fitur Cerdas Tambahan
- [ ] **Automatic Fallback:**
  - Jika perangkat kasir tidak mendukung Nano (misal HP atau laptop low-spec), secara otomatis alihkan query ke Gemini Cloud via Firebase AI Logic saat online.
- [ ] **Prediksi Kulakan (Restock Recommendation):**
  - AI menganalisis laju penurunan stok dan menyarankan jumlah kulakan untuk akhir pekan.
- [ ] **Ringkasan Naratif Harian Otomatis:**
  - Tombol satu klik: *"Buatkan laporan tutup toko hari ini"* yang menghasilkan narasi evaluasi penjualan.

---

## 5. Submission & Demo Hackathon (#BuildHybridAI)

### Video Demo (Maksimal 3 Menit — Krusial)
- [ ] **Penyusunan Naskah Video (Bahasa Inggris / Subtitle Inggris):**
  - Menit 0:00–0:45: Masalah nyata warung di Indonesia (sinyal hilang, kasir biasa mati, catatan manual hilang).
  - Menit 0:45–1:45: **Demo Offline (Mode Pesawat):** Kasir mencatat penjualan, stok terpotong, tanya Gemini Nano on-device tanpa internet.
  - Menit 1:45–2:30: **Demo Online & Hybrid:** Sambungkan internet, data otomatis tersinkron ke Firestore, App Check terverifikasi hijau, query kompleks dialihkan ke Gemini Cloud.
  - Menit 2:30–3:00: Kesimpulan nilai bisnis & arsitektur hybrid.
- [ ] **Perekaman Layar & Suara:**
  - Rekam runtime aplikasi di Chrome yang mendukung demo.
  - Tampilkan DevTools / Firebase Console untuk membuktikan transaksi masuk secara real-time.

### Dokumen & Form Devpost
- [ ] **Public GitHub Repository:**
  - Pastikan README rapi, menyertakan arsitektur diagram hybrid, tangkapan layar, dan cara menjalankan.
- [ ] **Deployment Production:**
  - Deploy ke Vercel atau Firebase Hosting (`https://warung-ai.web.app` atau `https://warung-ai.vercel.app`).
- [ ] **Pengisian Form Devpost:**
  - Deskripsi cerita proyek, teknologi yang dipakai (Firebase AI Logic, Gemini Nano, Firestore, PWA, App Check), tantangan, dan pelajaran yang didapat.
  - Submit sebelum **1 Desember 2026 05:00 WIB**.
