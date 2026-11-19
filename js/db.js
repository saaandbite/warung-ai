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
