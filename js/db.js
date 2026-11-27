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
  // Jajanan & minuman (nama generik: video/demo tidak boleh menampilkan merek pihak ketiga)
  { name: 'Mi Goreng Instan', price: 3500, stock: 40 },
  { name: 'Permen Kopi (Bungkus)', price: 8500, stock: 25 },
  { name: 'Jamu Masuk Angin (Sachet)', price: 4000, stock: 30 },
  { name: 'Wafer Keju', price: 2500, stock: 35 },
  { name: 'Kacang Atom', price: 6000, stock: 20 },
  { name: 'Teh Kotak 250ml', price: 4500, stock: 24 },
  { name: 'Kopi Susu Sachet', price: 2000, stock: 50 },
  { name: 'Cokelat Batang 58g', price: 16000, stock: 15 },
  { name: 'Mi Kuah Ayam Bawang', price: 3500, stock: 30 },
  { name: 'Roti Sobek Cokelat', price: 11000, stock: 8 },
  // Sembako & Kebutuhan Harian Warung
  { name: 'Beras Premium 1 kg', price: 16000, stock: 15 },
  { name: 'Minyak Goreng 1 Liter', price: 17500, stock: 12 },
  { name: 'Telur Ayam 1/2 kg (~8 butir)', price: 15000, stock: 10 },
  { name: 'Gula Pasir 1 kg', price: 18000, stock: 14 },
  { name: 'Air Mineral 600ml', price: 3500, stock: 24 }
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

// --- Penjualan contoh 14 hari ---
// Mengisi riwayat penjualan CONTOH untuk 14 hari terakhir (tidak termasuk
// hari ini, supaya penjualan nyata hari ini tetap bersih). Data ini murni
// contoh — AI butuh riwayat beberapa hari supaya pertanyaan "barang apa
// paling laris" dan Penasihat Kulakan bisa dijawab dengan masuk akal.
// Penjualan contoh ikut masuk antrean sync, jadi terunggah ke Firestore
// seperti penjualan biasa. Sekali isi, tidak bisa digandakan: bila sudah
// ada penjualan di jendela 14 hari, fungsi ini mengembalikan 0.
const SAMPLE_DAILY_RATE = [
  { name: 'Mi Goreng Instan', rate: 3 },
  { name: 'Permen Kopi (Bungkus)', rate: 2 },
  { name: 'Jamu Masuk Angin (Sachet)', rate: 1 },
  { name: 'Wafer Keju', rate: 2 },
  { name: 'Kacang Atom', rate: 1 },
  { name: 'Teh Kotak 250ml', rate: 2 },
  { name: 'Kopi Susu Sachet', rate: 4 },
  { name: 'Cokelat Batang 58g', rate: 1 },
  { name: 'Mi Kuah Ayam Bawang', rate: 2 },
  { name: 'Roti Sobek Cokelat', rate: 1 },
  { name: 'Beras Premium 1 kg', rate: 0.4 },
  { name: 'Minyak Goreng 1 Liter', rate: 0.3 },
  { name: 'Telur Ayam 1/2 kg (~8 butir)', rate: 0.5 },
  { name: 'Gula Pasir 1 kg', rate: 0.3 },
  { name: 'Air Mineral 600ml', rate: 3 },
];

// PRNG deterministik (mulberry32) supaya data contoh stabil antar-jalan.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tanggal lokal (WIB) — JANGAN pakai toISOString, itu UTC dan bisa geser hari.
export function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function seedSampleSales(days = 14) {
  const products = await listProducts();
  if (products.length === 0) return 0;
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));

  // Jendela 14 hari terakhir, TIDAK termasuk hari ini.
  const today = new Date();
  const windowDates = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    windowDates.push(localDateString(d));
  }
  const windowSet = new Set(windowDates);

  // Sudah ada riwayat di jendela ini? Jangan gandakan.
  const existing = await tx(['sales'], 'readonly', (t) => new Promise((resolve) => {
    const req = t.objectStore('sales').getAll();
    req.onsuccess = () => resolve(req.result);
  }));
  if (existing.some((s) => windowSet.has(s.date))) return 0;

  // Rencana total per produk selama 14 hari, dibatasi stok-2 (sisakan 2).
  const stockLeft = new Map(products.map((p) => [p.id, p.stock]));
  const plan = new Map(); // productId -> total qty
  for (const { name, rate } of SAMPLE_DAILY_RATE) {
    const p = byName.get(name.toLowerCase());
    if (!p) continue;
    const total = Math.round(rate * days * (0.85 + mulberry32(p.id * 7 + 3)() * 0.3));
    plan.set(p.id, Math.max(0, Math.min(total, Math.max(0, p.stock - 2))));
  }

  // Sebar total per produk ke hari-hari (acak deterministik per hari+produk).
  const dayItems = windowDates.map(() => []); // per hari: [[productId, qty], ...]
  for (const [id, total] of plan) {
    let remaining = total;
    const order = windowDates.map((_, i) => i);
    const rnd = mulberry32(id * 31 + 11);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const di of order) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, 1 + Math.floor(mulberry32(id * 97 + di * 13 + 5)() * 3));
      dayItems[di].push([id, qty]);
      remaining -= qty;
    }
  }

  // Tulis sebagai transaksi penjualan (1–3 nota per hari): stok berkurang,
  // tiap penjualan masuk antrean sync — satu transaksi per nota.
  let created = 0;
  for (let di = 0; di < windowDates.length; di++) {
    const items = dayItems[di];
    if (items.length === 0) continue;
    const rnd = mulberry32(1000 + di);
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const noteCount = Math.min(3, Math.max(1, Math.ceil(shuffled.length / 3)));
    const notes = Array.from({ length: noteCount }, () => []);
    shuffled.forEach(([id, qty], idx) => notes[idx % noteCount].push([id, qty]));

    for (const noteItems of notes) {
      if (noteItems.length === 0) continue;
      const byId = new Map(products.map((p) => [p.id, p]));
      const saleItems = noteItems.map(([id, qty]) => ({
        productId: id,
        name: byId.get(id).name,
        price: byId.get(id).price,
        qty,
      }));
      const total = saleItems.reduce((sum, it) => sum + it.price * it.qty, 0);
      const paid = Math.ceil(total / 5000) * 5000;
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - di));
      const hour = 7 + Math.floor(rnd() * 14); // 07:00–20:59
      const minute = Math.floor(rnd() * 60);
      const createdAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).getTime();
      const sale = {
        items: saleItems,
        total,
        paid,
        change: paid - total,
        date: windowDates[di],
        createdAt,
      };
      const saleId = await tx(['products', 'sales'], 'readwrite', (t) => {
        const productsStore = t.objectStore('products');
        for (const [id, qty] of noteItems) {
          const p = byId.get(id);
          const left = (stockLeft.get(id) ?? p.stock) - qty;
          stockLeft.set(id, left);
          productsStore.put({ ...p, stock: left });
        }
        const saleReq = t.objectStore('sales').add(sale);
        return new Promise((resolve) => {
          saleReq.onsuccess = () => resolve(saleReq.result);
        });
      });
      await tx(['syncQueue'], 'readwrite', (t) => {
        t.objectStore('syncQueue').add({ type: 'sale', refId: saleId, at: Date.now() });
      });
      created++;
    }
  }
  return created;
}

// --- Restock cepat (Quick Restock) ---
// Menambah atau mengurangi stok produk dan mencatat ke syncQueue untuk cloud.
export async function updateProductStock(id, addedQty) {
  const numAdded = Number(addedQty);
  if (isNaN(numAdded) || numAdded === 0) {
    throw new Error('Jumlah perubahan stok harus berupa angka bukan nol.');
  }

  const updated = await tx(['products', 'syncQueue'], 'readwrite', (t) => {
    const productsStore = t.objectStore('products');
    const syncStore = t.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const getReq = productsStore.get(Number(id));
      getReq.onsuccess = () => {
        const product = getReq.result;
        if (!product) {
          reject(new Error(`Produk #${id} tidak ditemukan.`));
          return;
        }
        const newStock = Math.max(0, (product.stock || 0) + numAdded);
        const updatedProduct = {
          ...product,
          stock: newStock,
          updatedAt: Date.now(),
        };
        const putReq = productsStore.put(updatedProduct);
        putReq.onsuccess = () => {
          syncStore.add({ type: 'product', refId: product.id, at: Date.now() });
          resolve(updatedProduct);
        };
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  });

  return updated;
}

// --- Penjualan ---
// items: array [productId, qty]. Mengurangi stok, menyimpan penjualan,
// dan mengantrekan penjualan untuk sinkronisasi cloud dalam SATU transaksi atomik.
export async function recordSale(items, paid) {
  if (!items || items.length === 0) {
    throw new Error('Keranjang belanja kosong.');
  }

  const products = await listProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  for (const [id, qty] of items) {
    const p = byId.get(Number(id));
    if (!p) throw new Error(`Produk #${id} tidak ditemukan.`);
    if (p.stock < qty) throw new Error(`Stok ${p.name} tidak cukup (sisa ${p.stock}).`);
    total += p.price * qty;
  }
  if (paid < total) throw new Error(`Uang yang dibayar kurang Rp ${(total - paid).toLocaleString('id-ID')}.`);

  const sale = {
    items: items.map(([id, qty]) => ({
      productId: Number(id),
      name: byId.get(Number(id)).name,
      price: byId.get(Number(id)).price,
      qty,
    })),
    total,
    paid,
    change: paid - total,
    date: localDateString(), // Gunakan tanggal lokal (WIB), bukan UTC toISOString
    createdAt: Date.now(),
  };

  const saleId = await tx(['products', 'sales', 'syncQueue'], 'readwrite', (t) => {
    const productsStore = t.objectStore('products');
    const salesStore = t.objectStore('sales');
    const syncStore = t.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      // Validasi dan cek ulang stok aktual langsung di dalam transaksi tulis
      let pendingReads = items.length;
      const productsToUpdate = [];

      for (const [id, qty] of items) {
        const getReq = productsStore.get(Number(id));
        getReq.onsuccess = () => {
          const currentProd = getReq.result;
          if (!currentProd) {
            reject(new Error(`Produk #${id} tidak ditemukan di database.`));
            return;
          }
          if (currentProd.stock < qty) {
            reject(new Error(`Stok ${currentProd.name} tidak mencukupi (tersisa ${currentProd.stock}, diminta ${qty}).`));
            return;
          }
          productsToUpdate.push({
            product: currentProd,
            newStock: currentProd.stock - qty,
          });
          pendingReads--;

          if (pendingReads === 0) {
            // Semua stok valid, simpan perubahan stok
            for (const { product, newStock } of productsToUpdate) {
              productsStore.put({ ...product, stock: newStock });
            }
            // Simpan catatan penjualan
            const saleReq = salesStore.add(sale);
            saleReq.onsuccess = () => {
              const newSaleId = saleReq.result;
              // Masuk syncQueue dalam transaksi atomik yang sama persis
              syncStore.add({ type: 'sale', refId: newSaleId, at: Date.now() });
              resolve(newSaleId);
            };
            saleReq.onerror = () => reject(saleReq.error);
          }
        };
        getReq.onerror = () => reject(getReq.error);
      }
    });
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

// Semua penjualan sejak tanggal fromDate ('YYYY-MM-DD', inklusif).
export function getSalesSince(fromDate) {
  return tx(['sales'], 'readonly', (t) => {
    return new Promise((resolve) => {
      const req = t.objectStore('sales').index('by-date').getAll(IDBKeyRange.lowerBound(fromDate));
      req.onsuccess = () => resolve(req.result);
    });
  });
}

export async function getTodaySummary() {
  const today = localDateString(); // Gunakan tanggal lokal WIB
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
