// Warung AI — entry point.
// Menangani navigasi tab, status online/offline, dan registrasi Service Worker.

import { listProducts, recordSale, getTodaySummary, getPendingSyncCount, seedSampleProducts } from './db.js';
import { askAI, dailySummary } from './ai.js';

// sync.js dimuat malas (lazy): modul itu butuh firebase-config.js +
// Firebase CDN — import statis di sini akan membuat SELURUH aplikasi
// gagal dimuat kalau config/SDK tidak bisa dimuat. Sinkronisasi hanya
// dimuat saat benar-benar dipanggil (auto-sync saat online / tombol).
async function syncNow() {
  const { syncNow: doSync } = await import('./sync.js');
  return doSync();
}

// Sama seperti syncNow, tapi untuk menarik data dari cloud.
async function pullFromCloud() {
  const { pullFromCloud: doPull } = await import('./sync.js');
  return doPull();
}

const LOW_STOCK_THRESHOLD = 5;

// --- Navigasi tab ---
document.querySelectorAll('.tab-bar button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-bar button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'ringkasan') renderSummary();
    if (btn.dataset.tab === 'stok') renderStock();
    if (btn.dataset.tab === 'kasir') renderProducts();
  });
});

// --- Status online/offline ---
const netStatus = document.getElementById('net-status');
function updateNetStatus() {
  const online = navigator.onLine;
  netStatus.textContent = online ? 'Online' : 'Offline';
  netStatus.classList.toggle('online', online);
  netStatus.classList.toggle('offline', !online);
}

window.addEventListener('online', async () => {
  updateNetStatus();
  try {
    const pulled = await pullFromCloud();
    if (pulled.products > 0 || pulled.sales > 0) {
      console.log(`Menarik ${pulled.products} produk & ${pulled.sales} penjualan dari Firestore.`);
      await renderProducts();
      await renderStock();
    }
  } catch (err) {
    console.warn('Auto-pull status:', err.message);
  }
  try {
    const n = await syncNow();
    if (n > 0) {
      console.log(`Auto-synced ${n} item ke Firestore.`);
    }
  } catch (err) {
    console.warn('Auto-sync status:', err.message);
  }
  renderSummary();
});

window.addEventListener('offline', updateNetStatus);
updateNetStatus();

// --- Service Worker (hanya di localhost / HTTPS) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => {
    console.warn('Service Worker gagal didaftarkan:', err);
  });
}

// --- Kasir: render produk + keranjang ---
const cart = new Map(); // productId -> qty
let currentCartTotal = 0;

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

async function renderProducts() {
  const list = document.getElementById('product-list');
  const products = await listProducts();
  if (products.length === 0) {
    list.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 24px 12px; background: #fff; border-radius: 8px; border: 1px dashed #cbd5e1;">
        <p class="empty" style="margin-bottom: 12px;">Belum ada produk di etalase toko.</p>
        <button id="quick-seed-btn" type="button" class="btn-secondary" style="font-size: 0.95rem; padding: 8px 16px;">
          ✨ Muat 15 Produk Contoh Warung
        </button>
      </div>
    `;
    const quickSeedBtn = document.getElementById('quick-seed-btn');
    if (quickSeedBtn) {
      quickSeedBtn.addEventListener('click', handleSeedProducts);
    }
    return;
  }
  list.innerHTML = '';
  products.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `
      <span style="font-weight: 600;">${p.name}</span>
      <span style="font-size: 0.9rem; color: #bbf7d0;">${formatRupiah(p.price)} <small style="color:#f1f5f9;">(stok ${p.stock})</small></span>
    `;
    btn.disabled = p.stock <= 0;
    btn.addEventListener('click', () => {
      const currentQty = cart.get(p.id) || 0;
      if (currentQty < p.stock) {
        cart.set(p.id, currentQty + 1);
        renderCart();
      } else {
        alert(`Stok ${p.name} tidak mencukupi (sisa ${p.stock}).`);
      }
    });
    list.appendChild(btn);
  });
}

function updateChangeAmount() {
  const payInput = document.getElementById('pay-amount');
  const paid = Number(payInput.value) || 0;
  const change = Math.max(0, paid - currentCartTotal);
  document.getElementById('change-amount').textContent = formatRupiah(change);
}

// Tombol Uang Cepat (Quick Cash Presets)
document.querySelectorAll('.btn-quick-cash').forEach((btn) => {
  btn.addEventListener('click', () => {
    const amountType = btn.dataset.amount;
    const payInput = document.getElementById('pay-amount');
    if (amountType === 'exact') {
      payInput.value = currentCartTotal;
    } else {
      payInput.value = Number(amountType);
    }
    updateChangeAmount();
  });
});

async function renderCart() {
  const ul = document.getElementById('cart-items');
  ul.innerHTML = '';
  const products = await listProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  currentCartTotal = 0;

  if (cart.size === 0) {
    ul.innerHTML = '<li class="empty">Keranjang masih kosong.</li>';
    document.getElementById('cart-total').textContent = 'Rp 0';
    updateChangeAmount();
    return;
  }

  cart.forEach((qty, id) => {
    const p = byId.get(id);
    if (!p) return;
    const itemTotal = p.price * qty;
    currentCartTotal += itemTotal;

    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.margin = '6px 0';

    const info = document.createElement('span');
    info.textContent = `${p.name} (${qty} × ${formatRupiah(p.price)}) = ${formatRupiah(itemTotal)}`;
    li.appendChild(info);

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '6px';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.textContent = '−';
    minusBtn.style.padding = '2px 8px';
    minusBtn.addEventListener('click', () => {
      if (qty > 1) {
        cart.set(id, qty - 1);
      } else {
        cart.delete(id);
      }
      renderCart();
    });

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.textContent = '+';
    plusBtn.style.padding = '2px 8px';
    plusBtn.disabled = qty >= p.stock;
    plusBtn.addEventListener('click', () => {
      if (qty < p.stock) {
        cart.set(id, qty + 1);
        renderCart();
      }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '✕';
    delBtn.style.padding = '2px 8px';
    delBtn.style.background = '#dc2626';
    delBtn.addEventListener('click', () => {
      cart.delete(id);
      renderCart();
    });

    btnGroup.appendChild(minusBtn);
    btnGroup.appendChild(plusBtn);
    btnGroup.appendChild(delBtn);
    li.appendChild(btnGroup);
    ul.appendChild(li);
  });

  document.getElementById('cart-total').textContent = formatRupiah(currentCartTotal);
  updateChangeAmount();
}

document.getElementById('pay-amount').addEventListener('input', updateChangeAmount);

document.getElementById('checkout-btn').addEventListener('click', async () => {
  if (cart.size === 0) {
    alert('Keranjang masih kosong!');
    return;
  }
  const paid = Number(document.getElementById('pay-amount').value) || 0;
  if (paid < currentCartTotal) {
    alert(`Uang pembayaran kurang Rp ${Number(currentCartTotal - paid).toLocaleString('id-ID')}.`);
    return;
  }

  try {
    const sale = await recordSale([...cart.entries()], paid);
    cart.clear();
    await renderCart();
    document.getElementById('pay-amount').value = '';
    document.getElementById('change-amount').textContent = 'Rp 0';
    await renderProducts();
    await renderStock();
    alert(`Penjualan berhasil disimpan! Total: ${formatRupiah(sale.total)}, Kembalian: ${formatRupiah(sale.change)}.`);
  } catch (err) {
    alert(`Gagal menyimpan penjualan: ${err.message}`);
  }
});

// Handler Muat Data Contoh
async function handleSeedProducts() {
  const seedBtn = document.getElementById('seed-sample-btn');
  if (seedBtn) seedBtn.disabled = true;
  try {
    const addedCount = await seedSampleProducts();
    if (addedCount > 0) {
      alert(`Berhasil menambahkan ${addedCount} produk contoh warung khas Indonesia!`);
    } else {
      alert('Semua produk contoh sudah ada di daftar stok.');
    }
    await renderStock();
    await renderProducts();
  } catch (err) {
    alert(`Gagal memuat produk contoh: ${err.message}`);
  } finally {
    if (seedBtn) seedBtn.disabled = false;
  }
}

const seedSampleBtn = document.getElementById('seed-sample-btn');
if (seedSampleBtn) {
  seedSampleBtn.addEventListener('click', handleSeedProducts);
}

// --- Stok: tambah produk + daftar stok ---
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const { addProduct } = await import('./db.js');
  await addProduct({
    name: form.name.value.trim(),
    price: Number(form.price.value),
    stock: Number(form.stock.value),
  });
  form.reset();
  await renderStock();
  await renderProducts();
});

async function renderStock() {
  const ul = document.getElementById('stock-list');
  const products = await listProducts();
  ul.innerHTML = '';
  if (products.length === 0) {
    ul.innerHTML = '<li class="empty">Belum ada barang di stok.</li>';
    return;
  }
  products.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.name} — ${formatRupiah(p.price)} — stok ${p.stock}`;
    if (p.stock <= LOW_STOCK_THRESHOLD) {
      const warn = document.createElement('span');
      warn.className = 'low-stock';
      warn.textContent = ' — stok menipis!';
      li.appendChild(warn);
    }
    ul.appendChild(li);
  });
}

// --- AI: tanya-jawab + ringkasan harian ---
document.getElementById('ask-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('ask-input');
  const out = document.getElementById('ai-answer');
  out.textContent = 'Memikirkan jawaban…';
  try {
    out.textContent = await askAI(input.value.trim());
  } catch (err) {
    out.textContent = `AI belum bisa menjawab: ${err.message}`;
  }
  input.value = '';
});

document.getElementById('summary-btn').addEventListener('click', async () => {
  const out = document.getElementById('daily-summary');
  out.textContent = 'Menyusun ringkasan…';
  try {
    out.textContent = await dailySummary();
  } catch (err) {
    out.textContent = `Ringkasan gagal dibuat: ${err.message}`;
  }
});

// --- Ringkasan + sinkronisasi ---
async function renderSummary() {
  const { total, count } = await getTodaySummary();
  document.getElementById('today-total').textContent = formatRupiah(total);
  document.getElementById('today-count').textContent = String(count);
  document.getElementById('pending-sync').textContent = String(await getPendingSyncCount());
}

document.getElementById('sync-now-btn').addEventListener('click', async () => {
  const btn = document.getElementById('sync-now-btn');
  btn.disabled = true;
  btn.textContent = 'Menyinkronkan…';
  try {
    const n = await syncNow();
    alert(`${n} item berhasil disinkronkan ke Firestore.`);
  } catch (err) {
    alert(`Sinkronisasi gagal: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sinkronkan sekarang';
    await renderSummary();
  }
});

document.getElementById('pull-btn').addEventListener('click', async () => {
  const btn = document.getElementById('pull-btn');
  btn.disabled = true;
  btn.textContent = 'Menarik data…';
  try {
    const pulled = await pullFromCloud();
    alert(`Berhasil menarik ${pulled.products} produk dan ${pulled.sales} penjualan dari cloud.`);
    await renderProducts();
    await renderStock();
  } catch (err) {
    alert(`Tarik data gagal: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Tarik data dari cloud';
    await renderSummary();
  }
});

// --- Muat awal ---
// Saat dibuka dan online, tarik dulu data dari cloud supaya perangkat
// baru / origin baru (mis. URL Vercel) langsung berisi data toko.
(async () => {
  if (navigator.onLine) {
    try {
      await pullFromCloud();
    } catch (err) {
      console.warn('Pull awal dilewati:', err.message);
    }
  }
  renderProducts();
  renderStock();
  renderCart();
})();
