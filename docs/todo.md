# Roadmap & Detail Tugas Warung AI (#BuildHybridAI 2026)

Dokumen ini memecah seluruh pekerjaan menjadi tugas-tugas kecil yang spesifik, terukur, dan siap dikerjakan oleh masing-masing anggota tim (**Haris, Syuu, Agung, Ahmad**).

---

## 1. Modul Struk Transaksi (Kasir & Struk) — [Prioritas Segera]
*Target File: `index.html`, `css/styles.css`, `js/app.js`*
*PIC yang disarankan: Syuu / Haris*

- [ ] **1.1. Modal Popup Struk Transaksi:**
  - Buat elemen `<dialog>` atau popup overlay struk yang otomatis muncul setelah tombol "Simpan Penjualan" berhasil ditekan.
  - Tampilkan header struk: Nama Toko ("Warung AI"), Nomor Nota (ID transaksi lokal), Tanggal dan Jam transaksi.
  - Tampilkan daftar rincian barang: Nama item, Qty, Harga satuan, Subtotal per item.
  - Tampilkan ringkasan pembayaran: Total Tagihan, Nominal Diterima, Nominal Kembalian.
- [ ] **1.2. Cetak Struk Fisik (Thermal Printer Ready):**
  - Pasang tombol "Cetak Struk" yang memanggil `window.print()`.
  - Buat CSS `@media print` khusus agar saat dicetak, seluruh antarmuka web (header, tab bar, tombol) disembunyikan dan hanya struk berukuran kertas kasir (58mm/80mm) yang tercetak rapi.
- [ ] **1.3. Fitur Bagikan Struk WhatsApp:**
  - Tambahkan tombol "Salin Teks Nota (WA)" yang menyalin ringkasan nota dalam format teks pesan WhatsApp (agar kasir bisa mengirim nota digital ke nomor pelanggan).
- [ ] **1.4. Tombol Transaksi Baru:**
  - Tombol "Tutup / Transaksi Baru" untuk menutup modal struk, mengosongkan keranjang, dan mengembalikan fokus kursor ke input kasir.

---

## 2. Redesign Tab Stok (Inventaris Barang)
*Target File: `index.html`, `css/styles.css`, `js/app.js`, `js/db.js`*
*PIC yang disarankan: Syuu*

- [ ] **2.1. Tabel Inventaris Modern (Gantikan format `<ul>` polos):**
  - Ubah daftar stok menjadi tabel/kartu baris yang rapi dengan kolom: Nama Barang, Harga Jual, Sisa Stok, Status Badge (Aman / Menipis / Habis), dan Aksi.
- [ ] **2.2. Tombol Restock Cepat (Tambah Stok Tanpa Buat Barang Baru):**
  - Tambahkan tombol `+ Stok` di setiap baris barang yang memunculkan input cepat untuk menambah stok (misal: tambah 10 botol).
  - Tambahkan fungsi `updateProductStock(id, addedQty)` di `js/db.js` yang juga mencatat perubahan ke `syncQueue`.
- [ ] **2.3. Form Tambah Produk Baru yang Kompak:**
  - Desain ulang `#add-product-form` menjadi card modern berbayang halus dengan field terstruktur: Nama Barang, Harga Jual (Rp), dan Stok Awal.
- [ ] **2.4. Filter Kategori / Status Stok:**
  - Tambahkan tombol filter tab kecil di atas daftar stok: "Semua", "Stok Menipis (< 5)", dan "Stok Habis (0)".

---

## 3. Redesign Tab Ringkasan (Laporan & Status Sinkronisasi Cloud)
*Target File: `index.html`, `css/styles.css`, `js/app.js`*
*PIC yang disarankan: Ahmad / Syuu*

- [ ] **3.1. Kartu Metrik Keuangan (Metric Stat Cards):**
  - Buat 3 kartu ringkasan di bagian atas:
    1. *Total Omzet Hari Ini* (Rp dengan font besar tebal).
    2. *Total Transaksi* (Jumlah nota penjualan hari ini).
    3. *Status Antrean Cloud* (Jumlah item lokal menunggu upload).
- [ ] **3.2. Panel Status Sinkronisasi Cloud Interaktif:**
  - Tampilkan indikator visual: Badge "Data Tersinkronisasi" (hijau) atau "Ada X Data Belum Diunggah" (kuning).
  - Tampilkan teks: "Terakhir sinkron: [Waktu/Jam]".
  - Tombol ganda dengan icon SVG: "Unggah ke Cloud" (`syncNow`) dan "Tarik dari Cloud" (`pullFromCloud`), lengkap dengan animasi loading saat proses berlangsung.
- [ ] **3.3. Tabel Riwayat Transaksi Hari Ini:**
  - Tampilkan daftar transaksi penjualan yang dilakukan hari ini.
  - Setiap baris transaksi memuat: Jam transaksi, ringkasan barang, total nominal, dan tombol "Lihat Struk" untuk mencetak ulang nota jika diperlukan.

---

## 4. Redesign Tab Tanya AI (Asisten Warung Hybrid)
*Target File: `index.html`, `css/styles.css`, `js/ai.js`, `js/app.js`*
*PIC yang disarankan: Agung / Haris*

- [ ] **4.1. Antarmuka Chat Percakapan (Conversation Bubble UI):**
  - Ubah area hasil AI menjadi tampilan percakapan (bubble chat pesan kasir di kanan, balasan AI di kiri).
- [ ] **4.2. Tombol Pintas Pertanyaan (Quick Prompt Chips):**
  - Sediakan tombol prompt siap klik di atas kolom input:
    - *"Barang apa paling laris hari ini?"*
    - *"Stok apa yang harus dibeli lagi?"*
    - *"Berapa perkiraan keuntungan hari ini?"*
    - *"Buatkan ringkasan tutup warung hari ini."*
- [ ] **4.3. Badge Indikator Mesin AI (On-Device vs Cloud):**
  - Tampilkan badge di pojok atas tab AI:
    - `🟢 Gemini Nano (On-Device / Offline)` jika browser mendukung.
    - `☁️ Gemini Cloud via Firebase` jika berjalan melalui cloud.
- [ ] **4.4. Efek Typing / Loading State:**
  - Tampilkan animasi titik berkedip (*typing indicator*) saat AI sedang membaca data dan memproses jawaban.

---

## 5. Fitur Kasir Tambahan (Uang Receh & Pembulatan)
*Target File: `js/app.js`, `css/styles.css`*
*PIC yang disarankan: Haris / Syuu*

- [ ] **5.1. Saran Pembulatan Uang Kembalian:**
  - Jika total belanja bernilai receh (contoh: Rp 23.500) dan pembeli memberikan uang Rp 50.000, kasir bisa melihat saran: *"Minta Rp 3.500 agar kembalian genap Rp 30.000"*.

---

## 6. Syarat Wajib Lomba & Video Submission (#BuildHybridAI)
*Target: Firebase Console, Hosting, Devpost*
*PIC yang disarankan: Haris (Video & Form), Ahmad (App Check)*

- [ ] **6.1. Inisialisasi Firebase App Check:**
  - Pasang App Check SDK dengan Debug Provider Token di `js/sync.js` atau file inisialisasi agar lolos validasi wajib juri Google.
- [ ] **6.2. Deploy Publik:**
  - Hubungkan repo GitHub ke Vercel atau Firebase Hosting (`warung-ai.web.app`).
- [ ] **6.3. Video Demo (Maksimal 3 Menit):**
  - Menit 1: Masalah warung offline & transaksi kasir + struk tanpa internet.
  - Menit 2: Tanya jawab data toko offline dengan AI on-device.
  - Menit 3: Hubungkan internet, data otomatis sinkron ke Firestore & App Check hijau.
