// Warung AI — sinkronisasi cloud (Firestore).
import { getSyncQueue, getProduct, getSale, clearSyncItems } from './db.js';
import { firebaseConfig } from './firebase-config.js';

// Import Firebase SDK modular dari CDN resmi Google
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

let app;
let db;

function getDbInstance() {
  if (!db) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

export async function syncNow() {
  if (!navigator.onLine) {
    throw new Error('Tidak ada internet. Data tetap tersimpan lokal dan akan dikirim saat online.');
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) return 0;

  const firestore = getDbInstance();
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
