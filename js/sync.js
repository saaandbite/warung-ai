// Warung AI — sinkronisasi cloud (Firestore).
//
// CATATAN DEPLOY: file ini sengaja TIDAK mengimpor firebase-config.js
// maupun Firebase SDK secara statis. firebase-config.js di-ignore git
// (lihat .gitignore) sehingga tidak ada di repo / deployment Vercel —
// import statis akan membuat SELURUH aplikasi gagal dimuat (app.js
// mengimpor modul ini). Karena itu config + SDK dimuat malas (lazy)
// di dalam getDbInstance(), hanya saat sinkronisasi benar-benar
// dipanggil. Tanpa config, syncNow() melempar pesan yang jelas dan
// data tetap aman di IndexedDB; kasir/stok/AI lokal tetap jalan.
import { getSyncQueue, getProduct, getSale, clearSyncItems } from './db.js';

let db = null;
let firestoreLib = null;

async function getDbInstance() {
  if (db) return { firestore: db, ...firestoreLib };

  let firebaseConfig;
  try {
    ({ firebaseConfig } = await import('./firebase-config.js'));
  } catch {
    throw new Error('Firebase belum dikonfigurasi di deployment ini. Data tetap tersimpan lokal dan akan dikirim setelah konfigurasi ditambahkan.');
  }

  // Firebase SDK modular dari CDN resmi Google — dimuat hanya saat sync.
  const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
  const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  firestoreLib = { doc, setDoc };
  return { firestore: db, ...firestoreLib };
}

export async function syncNow() {
  if (!navigator.onLine) {
    throw new Error('Tidak ada internet. Data tetap tersimpan lokal dan akan dikirim saat online.');
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) return 0;

  const { firestore, doc, setDoc } = await getDbInstance();
  const syncedIds = [];

  for (const item of queue) {
    try {
      if (item.type === 'product') {
        const product = await getProduct(item.refId);
        if (product) {
          // Simpan atau perbarui data produk di Firestore
          await setDoc(doc(firestore, 'products', String(product.id)), {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            createdAt: product.createdAt || Date.now(),
            syncedAt: Date.now(),
          }, { merge: true });
        }
      } else if (item.type === 'sale') {
        const sale = await getSale(item.refId);
        if (sale) {
          // Simpan data transaksi penjualan di Firestore
          await setDoc(doc(firestore, 'sales', String(sale.id)), {
            id: sale.id,
            items: sale.items,
            total: sale.total,
            paid: sale.paid,
            change: sale.change,
            date: sale.date,
            createdAt: sale.createdAt || Date.now(),
            syncedAt: Date.now(),
          }, { merge: true });
        }
      }
      syncedIds.push(item.id);
    } catch (err) {
      console.error('Gagal sinkron item antrean:', item, err);
      throw new Error(`Gagal sinkronisasi: ${err.message}`);
    }
  }

  if (syncedIds.length > 0) {
    await clearSyncItems(syncedIds);
  }

  return syncedIds.length;
}
