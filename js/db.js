// Warung AI — penyimpanan lokal (IndexedDB).
// Semua data toko tinggal di perangkat dulu (offline-first).
// Setiap perubahan juga masuk antrean `syncQueue` untuk dikirim ke
// Firestore saat online (js/sync.js).

const DB_NAME = 'warung-ai';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sales')) {
        const sales = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        sales.createIndex('by-date', 'date');
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeNames, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeNames, mode);
        const result = fn(transaction);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}

// --- Produk ---
export async function addProduct({ name, price, stock }) {
  const id = await tx(['products', 'syncQueue'], 'readwrite', (t) => {
    const req = t.objectStore('products').add({ name, price, stock, createdAt: Date.now() });
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result);
    });
  });
  await tx(['syncQueue'], 'readwrite', (t) => {
    t.objectStore('syncQueue').add({ type: 'product', refId: id, at: Date.now() });
  });
  return id;
}

export function listProducts() {
  return tx(['products'], 'readonly', (t) => {
    return new Promise((resolve) => {
      const req = t.objectStore('products').getAll();
      req.onsuccess = () => resolve(req.result);
    });
  });
}

export function getProduct(id) {
  return tx(['products'], 'readonly', (t) => {
    return new Promise((resolve) => {
      const req = t.objectStore('products').get(id);
      req.onsuccess = () => resolve(req.result);
    });
  });
}

// Muat produk contoh (kombinasi produk global kebanggaan Indonesia & sembako harian)
export const SAMPLE_PRODUCTS = [
  // Produk Indonesia Terkenal Global
  { name: 'Indomie Goreng Original', price: 3500, stock: 40 },
  { name: 'Kopiko Coffee Candy (Zak)', price: 8500, stock: 25 },
  { name: 'Tolak Angin SidoMuncul (Sachet)', price: 4000, stock: 30 },
  { name: 'Richeese Nabati Wafer Keju', price: 2500, stock: 35 },
  { name: 'Kacang Dua Kelinci Sukro', price: 6000, stock: 20 },
  { name: 'Teh Botol Sosro Kotak 250ml', price: 4500, stock: 24 },
  { name: 'Kopi Kapal Api Special Mix', price: 2000, stock: 50 },
  { name: 'SilverQueen Chocolate Milk 58g', price: 16000, stock: 15 },
  { name: 'Indomie Kuah Ayam Bawang', price: 3500, stock: 30 },
  { name: 'Sari Roti Sobek Coklat', price: 11000, stock: 8 },
  // Sembako & Kebutuhan Harian Warung
  { name: 'Beras Premium 1 kg', price: 16000, stock: 15 },
  { name: 'Minyak Goreng Kita 1 Liter', price: 17500, stock: 12 },
  { name: 'Telur Ayam 1/2 kg (~8 butir)', price: 15000, stock: 10 },
  { name: 'Gula Pasir Gulaku 1 kg', price: 18000, stock: 14 },
  { name: 'Air Mineral Aqua 600ml', price: 3500, stock: 24 }
];

export async function seedSampleProducts() {
  const existing = await listProducts();
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
  
  const toAdd = SAMPLE_PRODUCTS.filter((p) => !existingNames.has(p.name.toLowerCase()));
  if (toAdd.length === 0) return 0;

  for (const item of toAdd) {
    await addProduct(item);
  }
  return toAdd.length;
}

// --- Penjualan ---
// items: array [productId, qty]. Mengurangi stok, menyimpan penjualan,
// dan mengantrekan penjualan untuk sinkronisasi cloud.
export async function recordSale(items, paid) {
  const products = await listProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  for (const [id, qty] of items) {
    const p = byId.get(id);
    if (!p) throw new Error(`Produk #${id} tidak ditemukan.`);
    if (p.stock < qty) throw new Error(`Stok ${p.name} tidak cukup (sisa ${p.stock}).`);
    total += p.price * qty;
  }
  if (paid < total) throw new Error(`Uang yang dibayar kurang Rp ${total - paid}.`);

  const sale = {
    items: items.map(([id, qty]) => ({
      productId: id,
      name: byId.get(id).name,
      price: byId.get(id).price,
      qty,
    })),
    total,
    paid,
    change: paid - total,
    date: new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  };

  const saleId = await tx(['products', 'sales', 'syncQueue'], 'readwrite', (t) => {
    const productsStore = t.objectStore('products');
    for (const [id, qty] of items) {
      const p = byId.get(id);
      productsStore.put({ ...p, stock: p.stock - qty });
    }
    const saleReq = t.objectStore('sales').add(sale);
    return new Promise((resolve) => {
      saleReq.onsuccess = () => resolve(saleReq.result);
    });
  });
  await tx(['syncQueue'], 'readwrite', (t) => {
    t.objectStore('syncQueue').add({ type: 'sale', refId: saleId, at: Date.now() });
  });
  return { ...sale, id: saleId };
}

export function getSale(id) {
  return tx(['sales'], 'readonly', (t) => {
    return new Promise((resolve) => {
      const req = t.objectStore('sales').get(id);
      req.onsuccess = () => resolve(req.result);
    });
  });
}

export async function getTodaySummary() {
  const today = new Date().toISOString().slice(0, 10);
  const sales = await tx(['sales'], 'readonly', (t) => {
    return new Promise((resolve) => {
      const req = t.objectStore('sales').index('by-date').getAll(today);
      req.onsuccess = () => resolve(req.result);
    });
  });
  return {
    total: sales.reduce((sum, s) => sum + s.total, 0),
    count: sales.length,
    sales,
  };
}

// --- Tarik dari cloud (pull) ---
// Menyimpan data dari Firestore ke IndexedDB TANPA masuk antrean
// sinkronisasi (datanya memang sudah ada di cloud). Produk baru ditambah;
// produk yang sudah ada DIPERBARUI (nama/harga/stok) bila data cloud lebih
// baru (syncedAt lebih besar) dan isinya berbeda — tapi tidak pernah menimpa
// produk yang punya perubahan lokal yang masih antre di syncQueue.
// Mengembalikan 'added' (produk baru), 'updated' (produk lama diperbarui
// dari cloud), atau false (dilewati — cloud tidak lebih baru / tidak ada
// perubahan / ada perubahan lokal yang belum terkirim).
export async function upsertProductFromCloud(product) {
  const existing = await getProduct(product.id);
  if (!existing) {
    await tx(['products'], 'readwrite', (t) => {
      t.objectStore('products').put({
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        createdAt: product.createdAt || Date.now(),
        syncedAt: product.syncedAt || Date.now(),
      });
    });
    return 'added';
  }

  // Jangan timpa perubahan lokal yang belum terkirim ke cloud.
  const pending = await hasPendingProductSync(product.id);
  if (pending) return false;

  // Perbarui hanya bila cloud lebih baru DAN isinya memang berbeda.
  // Produk lokal lama tidak punya syncedAt (dianggap 0) sehingga tarikan
  // pertama sesudah perbaikan ini tetap memperbarui bila isinya berbeda.
  const cloudNewer = (product.syncedAt || 0) > (existing.syncedAt || 0);
  const differs =
    existing.name !== product.name ||
    existing.price !== product.price ||
    existing.stock !== product.stock;
  if (!cloudNewer || !differs) return false;

  await tx(['products'], 'readwrite', (t) => {
    t.objectStore('products').put({
      ...existing,
      name: product.name,
      price: product.price,
      stock: product.stock,
      syncedAt: product.syncedAt || existing.syncedAt || Date.now(),
    });
  });
  return 'updated';
}

// Apakah produk ini punya perubahan lokal yang masih antre di syncQueue
// (belum terkirim ke Firestore)? Dipakai pull agar tidak menimpa edit lokal.
export async function hasPendingProductSync(productId) {
  const queue = await getSyncQueue();
  return queue.some((item) => item.type === 'product' && item.refId === productId);
}

export async function upsertSaleFromCloud(sale) {
  const existing = await getSale(sale.id);
  if (existing) return false;
  await tx(['sales'], 'readwrite', (t) => {
    t.objectStore('sales').put({
      id: sale.id,
      items: sale.items || [],
      total: sale.total,
      paid: sale.paid,
      change: sale.change,
      date: sale.date,
      createdAt: sale.createdAt || Date.now(),
    });
  });
  return true;
}

// --- Antrean sinkronisasi ---
export function getPendingSyncCount() {
  return tx(['syncQueue'], 'readonly', (t) => {
    return new Promise((resolve) => {
      const req = t.objectStore('syncQueue').count();
      req.onsuccess = () => resolve(req.result);
    });
  });
}

export function getSyncQueue() {
  return tx(['syncQueue'], 'readonly', (t) => {
    return new Promise((resolve) => {
      const req = t.objectStore('syncQueue').getAll();
      req.onsuccess = () => resolve(req.result);
    });
  });
}

export function clearSyncItems(ids) {
  return tx(['syncQueue'], 'readwrite', (t) => {
    const store = t.objectStore('syncQueue');
    ids.forEach((id) => store.delete(id));
  });
}
