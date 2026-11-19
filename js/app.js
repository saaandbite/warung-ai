// Warung AI — entry point.
// Menangani navigasi tab, status online/offline, dan registrasi Service Worker.

import { listProducts, recordSale, getTodaySummary, getPendingSyncCount } from './db.js';
import { askAI, dailySummary } from './ai.js';
import { syncNow } from './sync.js';

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
window.addEventListener('online', updateNetStatus);
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

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

async function renderProducts() {
  const list = document.getElementById('product-list');
  const products = await listProducts();
  if (products.length === 0) {
    list.innerHTML = '<p class="empty">Belum ada produk. Tambah produk dulu di tab Stok.</p>';
    return;
  }
  list.innerHTML = '';
  products.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${p.name} — ${formatRupiah(p.price)} (stok ${p.stock})`;
    btn.disabled = p.stock <= 0;
    btn.addEventListener('click', () => {
      cart.set(p.id, (cart.get(p.id) || 0) + 1);
      renderCart();
    });
    list.appendChild(btn);
  });
}

function renderCart() {
  const ul = document.getElementById('cart-items');
  ul.innerHTML = '';
  let total = 0;
  // Harga diambil dari daftar produk saat checkout (recordSale memvalidasi stok).
  cart.forEach((qty, id) => {
    const li = document.createElement('li');
    li.textContent = `${id} × ${qty}`;
    ul.appendChild(li);
  });
  document.getElementById('cart-total').textContent = formatRupiah(total);
}

document.getElementById('pay-amount').addEventListener('input', (e) => {
  const total = 0; // dihitung ulang saat checkout dari harga produk
  const paid = Number(e.target.value) || 0;
  document.getElementById('change-amount').textContent = formatRupiah(Math.max(0, paid - total));
});

document.getElementById('checkout-btn').addEventListener('click', async () => {
  if (cart.size === 0) return;
  const paid = Number(document.getElementById('pay-amount').value) || 0;
  try {
    const sale = await recordSale([...cart.entries()], paid);
    cart.clear();
    renderCart();
    document.getElementById('pay-amount').value = '';
    document.getElementById('change-amount').textContent = 'Rp 0';
    await renderProducts();
    await renderStock();
    alert(`Penjualan tersimpan. Total ${formatRupiah(sale.total)}, kembalian ${formatRupiah(sale.change)}.`);
  } catch (err) {
    alert(`Gagal menyimpan penjualan: ${err.message}`);
  }
});

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
  try {
    const n = await syncNow();
    alert(`${n} item berhasil disinkronkan ke cloud.`);
  } catch (err) {
    alert(`Sinkronisasi gagal: ${err.message}`);
  }
  await renderSummary();
});

// --- Muat awal ---
renderProducts();
renderStock();
