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

// Sumber icon resmi Lucide SVG (tanpa emoji, koordinat path asli dari direktori lokal)
const SVG_PACKAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/></svg>`;
const SVG_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;
const SVG_MINUS = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`;
const SVG_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const SVG_SPARKLES = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>`;
const SVG_SEARCH = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>`;

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
    if (pulled.products > 0 || pulled.updatedProducts > 0 || pulled.sales > 0) {
      console.log(`Menarik ${pulled.products} produk baru, ${pulled.updatedProducts} produk diperbarui & ${pulled.sales} penjualan dari Firestore.`);
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

// --- Kasir: State & Fungsi ---
const cart = new Map(); // productId -> qty
let currentCartTotal = 0;
let searchQuery = '';

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// Komponen Pencarian Produk
const searchInput = document.getElementById('product-search');
const searchClearBtn = document.getElementById('search-clear-btn');
const catalogCountBadge = document.getElementById('catalog-count');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    if (searchClearBtn) {
      searchClearBtn.style.display = searchQuery ? 'flex' : 'none';
    }
    renderProducts();
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    renderProducts();
  });
}

// Tombol Kosongkan Keranjang
const clearCartBtn = document.getElementById('clear-cart-btn');
if (clearCartBtn) {
  clearCartBtn.addEventListener('click', () => {
    if (cart.size === 0) return;
    if (confirm('Kosongkan keranjang belanja?')) {
      cart.clear();
      renderCart();
  updatePaySpelled(0);
      renderProducts();
    }
  });
}

// Render Katalog Produk dalam Bentuk Card Modern
async function renderProducts() {
  const list = document.getElementById('product-list');
  const allProducts = await listProducts();

  // Jika toko masih kosong sama sekali
  if (allProducts.length === 0) {
    if (catalogCountBadge) catalogCountBadge.textContent = '0 Produk';
    list.innerHTML = `
      <div class="catalog-empty-state">
        <div class="catalog-empty-icon">${SVG_PACKAGE}</div>
        <p class="empty" style="padding: 0; margin: 0;">Belum ada produk di etalase toko.</p>
        <button id="quick-seed-btn" type="button" class="btn-secondary">
          ${SVG_SPARKLES}
          <span>Muat 15 Produk Contoh Warung</span>
        </button>
      </div>
    `;
    const quickSeedBtn = document.getElementById('quick-seed-btn');
    if (quickSeedBtn) {
      quickSeedBtn.addEventListener('click', handleSeedProducts);
    }
    return;
  }

  // Filter berdasarkan search query
  const filteredProducts = searchQuery
    ? allProducts.filter((p) => p.name.toLowerCase().includes(searchQuery))
    : allProducts;

  if (catalogCountBadge) {
    catalogCountBadge.textContent = searchQuery
      ? `${filteredProducts.length} dari ${allProducts.length} Produk`
      : `${allProducts.length} Produk`;
  }

  // Jika hasil pencarian tidak ditemukan
  if (filteredProducts.length === 0) {
    list.innerHTML = `
      <div class="catalog-empty-state">
        <div class="catalog-empty-icon">${SVG_SEARCH}</div>
        <p class="empty" style="padding: 0; margin: 0;">Tidak ada barang yang cocok dengan kata "${searchQuery}".</p>
        <button id="reset-search-btn" type="button" class="btn-secondary">
          Tampilkan Semua Produk
        </button>
      </div>
    `;
    const resetBtn = document.getElementById('reset-search-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        renderProducts();
      });
    }
    return;
  }

  list.innerHTML = '';
  filteredProducts.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const inCartQty = cart.get(p.id) || 0;
    if (inCartQty > 0) {
      card.classList.add('has-cart');
    }

    const isOutOfStock = p.stock <= 0;
    if (isOutOfStock) {
      card.classList.add('disabled');
    }

    let stockBadgeHtml = '';
    if (isOutOfStock) {
      stockBadgeHtml = `<span class="card-badge-stock empty">Habis</span>`;
    } else if (p.stock <= LOW_STOCK_THRESHOLD) {
      stockBadgeHtml = `<span class="card-badge-stock low">Sisa ${p.stock}!</span>`;
    } else {
      stockBadgeHtml = `<span class="card-badge-stock">Stok ${p.stock}</span>`;
    }

    const cartBadgeHtml = inCartQty > 0
      ? `<span class="card-cart-qty">${inCartQty}x</span>`
      : '';

    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${SVG_PACKAGE}</div>
        ${stockBadgeHtml}
      </div>
      <div class="card-name" title="${p.name}">${p.name}</div>
      <div class="card-bottom">
        <span class="card-price">${formatRupiah(p.price)}</span>
        ${cartBadgeHtml}
      </div>
    `;

    const handleCardClick = () => {
      if (isOutOfStock) return;
      const currentQty = cart.get(p.id) || 0;
      if (currentQty < p.stock) {
        cart.set(p.id, currentQty + 1);
        renderCart();
  updatePaySpelled(0);
        renderProducts();
      } else {
        alert(`Stok ${p.name} tidak mencukupi (sisa ${p.stock}).`);
      }
    };

    card.addEventListener('click', handleCardClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick();
      }
    });

    list.appendChild(card);
  });
}

// Konversi angka nominal ke ejaan kalimat dalam Bahasa Indonesia (Terbilang)
export function terbilang(n) {
  const nilaiBulat = Math.floor(Math.abs(Number(n) || 0));
  if (nilaiBulat === 0) return 'Nol rupiah';

  const angka = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

  function sebut(nilai) {
    if (nilai < 12) return angka[nilai];
    if (nilai < 20) return sebut(nilai - 10) + ' belas';
    if (nilai < 100) return sebut(Math.floor(nilai / 10)) + ' puluh ' + sebut(nilai % 10);
    if (nilai < 200) return 'seratus ' + sebut(nilai - 100);
    if (nilai < 1000) return sebut(Math.floor(nilai / 100)) + ' ratus ' + sebut(nilai % 100);
    if (nilai < 2000) return 'seribu ' + sebut(nilai - 1000);
    if (nilai < 1000000) return sebut(Math.floor(nilai / 1000)) + ' ribu ' + sebut(nilai % 1000);
    if (nilai < 1000000000) return sebut(Math.floor(nilai / 1000000)) + ' juta ' + sebut(nilai % 1000000);
    if (nilai < 1000000000000) return sebut(Math.floor(nilai / 1000000000)) + ' miliar ' + sebut(nilai % 1000000000);
    return '';
  }

  const hasil = sebut(nilaiBulat).replace(/\s+/g, ' ').trim();
  return hasil ? hasil.charAt(0).toUpperCase() + hasil.slice(1) + ' rupiah' : 'Nol rupiah';
}

function getPaidAmount() {
  const payInput = document.getElementById('pay-amount');
  if (!payInput) return 0;
  const digits = String(payInput.value || '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function updatePaySpelled(amount) {
  const paySpelled = document.getElementById('pay-spelled');
  if (paySpelled) {
    paySpelled.textContent = terbilang(amount);
  }
}

function updateChangeAmount() {
  const paid = getPaidAmount();
  const changeBox = document.getElementById('change-box');
  const changeAmountEl = document.getElementById('change-amount');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (cart.size === 0 || currentCartTotal === 0) {
    if (changeBox) changeBox.classList.remove('shortage');
    if (changeAmountEl) changeAmountEl.textContent = 'Rp 0';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (paid === 0 && currentCartTotal > 0) {
    if (changeBox) changeBox.classList.remove('shortage');
    if (changeAmountEl) changeAmountEl.textContent = 'Rp 0';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (paid < currentCartTotal) {
    const shortage = currentCartTotal - paid;
    if (changeBox) changeBox.classList.add('shortage');
    if (changeAmountEl) changeAmountEl.textContent = `Kurang ${formatRupiah(shortage)}`;
    if (checkoutBtn) checkoutBtn.disabled = true;
  } else {
    const change = paid - currentCartTotal;
    if (changeBox) changeBox.classList.remove('shortage');
    if (changeAmountEl) changeAmountEl.textContent = formatRupiah(change);
    if (checkoutBtn) checkoutBtn.disabled = false;
  }
}

// Format input dengan pemisah ribuan titik (.) saat kasir mengetik nominal
const payInputElement = document.getElementById('pay-amount');
if (payInputElement) {
  payInputElement.addEventListener('input', (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      e.target.value = '';
      updatePaySpelled(0);
      updateChangeAmount();
      return;
    }
    const num = Number(rawDigits);
    e.target.value = num.toLocaleString('id-ID');
    updatePaySpelled(num);
    updateChangeAmount();
  });
}

// Tombol Uang Cepat (Quick Cash Presets)
document.querySelectorAll('.btn-quick-cash').forEach((btn) => {
  btn.addEventListener('click', () => {
    const amountType = btn.dataset.amount;
    const payInput = document.getElementById('pay-amount');
    let amount = 0;
    if (amountType === 'exact') {
      amount = currentCartTotal;
    } else {
      amount = Number(amountType);
    }
    if (payInput) {
      payInput.value = amount ? amount.toLocaleString('id-ID') : '';
    }
    updatePaySpelled(amount);
    updateChangeAmount();
  });
});

async function renderCart() {
  const ul = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');
  const cartCountEl = document.getElementById('cart-item-count');
  const clearBtn = document.getElementById('clear-cart-btn');
  const checkoutBtn = document.getElementById('checkout-btn');

  ul.innerHTML = '';
  const products = await listProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  currentCartTotal = 0;
  let totalDistinctItems = 0;
  let totalPieces = 0;

  if (cart.size === 0) {
    ul.innerHTML = '<li class="empty">Keranjang masih kosong.<br><small style="color:#94a3b8;">Klik kartu barang di katalog untuk menambahkan.</small></li>';
    if (cartTotalEl) cartTotalEl.textContent = 'Rp 0';
    if (cartCountEl) cartCountEl.textContent = '0 item';
    if (clearBtn) clearBtn.style.display = 'none';
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<span>Simpan Penjualan</span>';
    }
    updateChangeAmount();
    return;
  }

  if (clearBtn) clearBtn.style.display = 'inline-flex';

  cart.forEach((qty, id) => {
    const p = byId.get(id);
    if (!p) return;
    totalDistinctItems += 1;
    totalPieces += qty;

    const itemTotal = p.price * qty;
    currentCartTotal += itemTotal;

    const li = document.createElement('li');
    li.className = 'cart-item-row';

    const info = document.createElement('div');
    info.className = 'cart-item-info';
    info.innerHTML = `
      <div class="cart-item-title" title="${p.name}">${p.name}</div>
      <div class="cart-item-subtext">${formatRupiah(p.price)} × ${qty} = <strong>${formatRupiah(itemTotal)}</strong></div>
    `;

    const controls = document.createElement('div');
    controls.className = 'cart-item-controls';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'btn-cart-qty';
    minusBtn.innerHTML = SVG_MINUS;
    minusBtn.title = 'Kurangi 1';
    minusBtn.addEventListener('click', () => {
      if (qty > 1) {
        cart.set(id, qty - 1);
      } else {
        cart.delete(id);
      }
      renderCart();
  updatePaySpelled(0);
      renderProducts();
    });

    const qtySpan = document.createElement('span');
    qtySpan.className = 'cart-item-qty';
    qtySpan.textContent = String(qty);

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'btn-cart-qty';
    plusBtn.innerHTML = SVG_PLUS;
    plusBtn.title = 'Tambah 1';
    plusBtn.disabled = qty >= p.stock;
    plusBtn.addEventListener('click', () => {
      if (qty < p.stock) {
        cart.set(id, qty + 1);
        renderCart();
  updatePaySpelled(0);
        renderProducts();
      }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-cart-del';
    delBtn.innerHTML = SVG_TRASH;
    delBtn.title = 'Hapus item ini';
    delBtn.addEventListener('click', () => {
      cart.delete(id);
      renderCart();
  updatePaySpelled(0);
      renderProducts();
    });

    controls.appendChild(minusBtn);
    controls.appendChild(qtySpan);
    controls.appendChild(plusBtn);
    controls.appendChild(delBtn);

    li.appendChild(info);
    li.appendChild(controls);
    ul.appendChild(li);
  });

  if (cartTotalEl) cartTotalEl.textContent = formatRupiah(currentCartTotal);
  if (cartCountEl) cartCountEl.textContent = `${totalPieces} pcs (${totalDistinctItems} jenis)`;
  if (checkoutBtn) {
    checkoutBtn.innerHTML = `<span>Simpan Penjualan (${formatRupiah(currentCartTotal)})</span>`;
  }
  updateChangeAmount();
}


document.getElementById('checkout-btn').addEventListener('click', async () => {
  if (cart.size === 0) {
    alert('Keranjang masih kosong!');
    return;
  }
  const paid = getPaidAmount();
  if (paid < currentCartTotal) {
    alert(`Uang pembayaran kurang Rp ${Number(currentCartTotal - paid).toLocaleString('id-ID')}.`);
    return;
  }

  try {
    const sale = await recordSale([...cart.entries()], paid);
    cart.clear();
    await renderCart();
  updatePaySpelled(0);
    const payInput = document.getElementById('pay-amount');
    if (payInput) payInput.value = '';
    updatePaySpelled(0);
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
    alert(`Berhasil menarik ${pulled.products} produk baru, ${pulled.updatedProducts} produk diperbarui, dan ${pulled.sales} penjualan dari cloud.`);
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
  updatePaySpelled(0);
})();
