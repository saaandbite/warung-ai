// Warung AI — sinkronisasi cloud (Firestore).
//
// CATATAN: file ini TIDAK mengimpor firebase-config.js maupun Firebase
// SDK secara statis — keduanya dimuat malas (lazy) di getDbInstance().
// Kalau config tidak ada, import statis akan membuat SELURUH aplikasi
// gagal dimuat. Tanpa config, sync/pull melempar pesan yang jelas dan
// data tetap aman di IndexedDB; kasir/stok/AI lokal tetap jalan.
import { getSyncQueue, getProduct, getSale, clearSyncItems, upsertProductFromCloud, upsertSaleFromCloud } from './db.js';

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

  // Firebase SDK modular dari CDN resmi Google — dimuat hanya saat sync/pull.
  const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
  const { getFirestore, doc, setDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  firestoreLib = { doc, setDoc, collection, getDocs };
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

// Tarik data dari Firestore ke perangkat ini (pull sync).
// Produk & penjualan baru ditambah; produk yang sudah ada diperbarui
// (nama/harga/stok) bila data cloud lebih baru — lihat
// upsertProductFromCloud di js/db.js. Mengembalikan
// { products, updatedProducts, sales } = jumlah produk baru, produk
// yang diperbarui, dan penjualan baru yang masuk.
//
// Batasan yang diketahui: ID produk/penjualan adalah nomor urut lokal
// (auto-increment). Kalau dua perangkat membuat produk berbeda sebelum
// sinkron, ID-nya bisa bertabrakan dan pull akan melewati yang
// bertabrakan itu. Untuk alur satu warung (satu perangkat menginput,
// perangkat lain membaca) ini sudah cukup; ID global (UUID) adalah
// perbaikan model data berikutnya bila diperlukan.
export async function pullFromCloud() {
  if (!navigator.onLine) {
    throw new Error('Tidak ada internet. Data cloud tidak bisa ditarik saat offline.');
  }
  const { firestore, collection, getDocs } = await getDbInstance();

  let addedProducts = 0;
  let updatedProducts = 0;
  let addedSales = 0;

  const productSnap = await getDocs(collection(firestore, 'products'));
  for (const d of productSnap.docs) {
    const data = d.data();
    if (typeof data.id === 'undefined') continue;
    const result = await upsertProductFromCloud({
      id: Number(data.id),
      name: data.name,
      price: data.price,
      stock: data.stock,
      createdAt: data.createdAt,
      syncedAt: data.syncedAt,
    });
    if (result === 'added') addedProducts += 1;
    else if (result === 'updated') updatedProducts += 1;
  }

  const saleSnap = await getDocs(collection(firestore, 'sales'));
  for (const d of saleSnap.docs) {
    const data = d.data();
    if (typeof data.id === 'undefined') continue;
    const added = await upsertSaleFromCloud({
      id: Number(data.id),
      items: data.items,
      total: data.total,
      paid: data.paid,
      change: data.change,
      date: data.date,
      createdAt: data.createdAt,
    });
    if (added) addedSales += 1;
  }

  return { products: addedProducts, updatedProducts, sales: addedSales };
}
