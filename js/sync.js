// Warung AI — sinkronisasi cloud (Firestore).
//
// TODO (Ahmad): lengkapi implementasi ini setelah project Firebase dibuat.
//   1. Salin js/firebase-config.example.js -> js/firebase-config.js, isi config.
//   2. Inisialisasi Firestore + App Check.
//   3. Kirim tiap item antrean (produk & penjualan dari IndexedDB) ke
//      koleksi Firestore, lalu hapus dari antrean lokal bila berhasil.
//   4. Panggil syncNow() otomatis saat event 'online' (di app.js).
//
// Sampai integrasi selesai, syncNow() hanya memeriksa koneksi dan
// mengembalikan 0 supaya tombol "Sinkronkan sekarang" tidak error.

import { getSyncQueue } from './db.js';

export async function syncNow() {
  if (!navigator.onLine) {
    throw new Error('Tidak ada internet. Data tetap tersimpan lokal dan akan dikirim saat online.');
  }
  const queue = await getSyncQueue();
  if (queue.length === 0) return 0;

  // TODO: kirim queue ke Firestore di sini, lalu clearSyncItems(ids).
  // Contoh alur:
  //   const db = getFirestore(firebaseApp);
  //   for (const item of queue) { ... setDoc(...) ... }
  //   await clearSyncItems(queue.map((q) => q.id));
  //   return queue.length;

  console.warn('Sinkronisasi cloud belum diimplementasikan — antrean masih tersimpan lokal:', queue.length, 'item.');
  return 0;
}
