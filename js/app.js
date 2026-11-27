// Warung AI — entry point.
// Menangani navigasi tab, status online/offline, dan registrasi Service Worker.

import { listProducts, recordSale, getTodaySummary, getPendingSyncCount, seedSampleProducts, seedSampleSales, updateProductStock, addProduct } from './db.js';
import { askAI, dailySummary } from './ai.js';

// Helper sanitasi HTML untuk mencegah Stored-XSS & reflected-XSS
export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Sistem Notifikasi Toast Modern (menggantikan alert() yang memblokir alur demo)
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    alert(message);
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
  } else {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>`;
  }

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-text">${escapeHtml(message)}</span>
  `;

  toast.addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

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
      recordLastSyncTime();
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

// Render Katalog Produk dalam Bentuk Card Modern (Aman dari Stored-XSS)
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

  // Jika hasil pencarian tidak ditemukan (XSS-safe via escapeHtml)
  if (filteredProducts.length === 0) {
    list.innerHTML = `
      <div class="catalog-empty-state">
        <div class="catalog-empty-icon">${SVG_SEARCH}</div>
        <p class="empty" style="padding: 0; margin: 0;">Tidak ada barang yang cocok dengan kata "${escapeHtml(searchQuery)}".</p>
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
      <div class="card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
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
        showToast(`Stok ${p.name} tidak mencukupi (sisa ${p.stock}).`, 'warning');
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

// Saran Pembulatan Kembalian (3.5)
function updateChangeSuggestion(total, paid) {
  const suggestionEl = document.getElementById('change-suggestion');
  if (!suggestionEl) return;

  if (total <= 0 || paid <= total) {
    suggestionEl.style.display = 'none';
    suggestionEl.textContent = '';
    return;
  }

  const change = paid - total;

  // Jika kembalian sudah berupa pecahan bersih bulat 10.000 / 50.000, tidak perlu saran
  if (change % 10000 === 0) {
    suggestionEl.style.display = 'none';
    suggestionEl.textContent = '';
    return;
  }

  // Hitung pembulatan ke atas terdekat (kelipatan 5.000 atau 10.000)
  let targetChange = Math.ceil(change / 5000) * 5000;
  if (targetChange === change) {
    targetChange = Math.ceil(change / 10000) * 10000;
  }

  const extraNeeded = targetChange - change;
  if (extraNeeded > 0 && extraNeeded <= 5000) {
    suggestionEl.innerHTML = `
      <span>💡</span>
      <span><strong>Saran Kasir:</strong> Minta tambahan <strong>${formatRupiah(extraNeeded)}</strong> dari pembeli agar kembalian genap <strong>${formatRupiah(targetChange)}</strong>.</span>
    `;
    suggestionEl.style.display = 'flex';
  } else {
    suggestionEl.style.display = 'none';
    suggestionEl.textContent = '';
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
    updateChangeSuggestion(0, 0);
    return;
  }

  if (paid === 0 && currentCartTotal > 0) {
    if (changeBox) changeBox.classList.remove('shortage');
    if (changeAmountEl) changeAmountEl.textContent = 'Rp 0';
    if (checkoutBtn) checkoutBtn.disabled = true;
    updateChangeSuggestion(currentCartTotal, 0);
    return;
  }

  if (paid < currentCartTotal) {
    const shortage = currentCartTotal - paid;
    if (changeBox) changeBox.classList.add('shortage');
    if (changeAmountEl) changeAmountEl.textContent = `Kurang ${formatRupiah(shortage)}`;
    if (checkoutBtn) checkoutBtn.disabled = true;
    updateChangeSuggestion(currentCartTotal, paid);
  } else {
    const change = paid - currentCartTotal;
    if (changeBox) changeBox.classList.remove('shortage');
    if (changeAmountEl) changeAmountEl.textContent = formatRupiah(change);
    if (checkoutBtn) checkoutBtn.disabled = false;
    updateChangeSuggestion(currentCartTotal, paid);
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
      <div class="cart-item-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
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

// --- MODAL STRUK TRANSAKSI & CETAK THERMAL ---
let currentActiveSale = null;

function showReceiptModal(sale) {
  currentActiveSale = sale;
  const modal = document.getElementById('receipt-modal');
  if (!modal) return;

  const receiptNoEl = document.getElementById('receipt-no');
  if (receiptNoEl) {
    receiptNoEl.textContent = `#NOTA-${String(sale.id).padStart(4, '0')}`;
  }

  const d = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const datetimeEl = document.getElementById('receipt-datetime');
  if (datetimeEl) {
    datetimeEl.textContent = `${dateStr}, ${timeStr}`;
  }

  const itemsContainer = document.getElementById('receipt-items-list');
  if (itemsContainer) {
    itemsContainer.innerHTML = '';
    (sale.items || []).forEach((item) => {
      const line = document.createElement('div');
      line.className = 'receipt-item-line';
      line.innerHTML = `
        <div class="receipt-item-title-row">
          <span>${escapeHtml(item.name)}</span>
          <span>${formatRupiah(item.price * item.qty)}</span>
        </div>
        <div class="receipt-item-detail">
          <span>${item.qty} × ${formatRupiah(item.price)}</span>
        </div>
      `;
      itemsContainer.appendChild(line);
    });
  }

  const elTotal = document.getElementById('receipt-total');
  const elPaid = document.getElementById('receipt-paid');
  const elChange = document.getElementById('receipt-change');
  const elSpelled = document.getElementById('receipt-change-spelled');

  if (elTotal) elTotal.textContent = formatRupiah(sale.total);
  if (elPaid) elPaid.textContent = formatRupiah(sale.paid);
  if (elChange) elChange.textContent = formatRupiah(sale.change);
  if (elSpelled) elSpelled.textContent = terbilang(sale.change);

  modal.style.display = 'flex';
}

function buildReceiptText(sale) {
  if (!sale) return '';
  const d = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const dateStr = d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const divider = '--------------------------------';
  const lines = [
    '*WARUNG AI*',
    'Kasir Offline-First Warung Indonesia',
    `No: #NOTA-${String(sale.id).padStart(4, '0')}`,
    `Waktu: ${dateStr}`,
    divider,
  ];
  (sale.items || []).forEach((it) => {
    lines.push(`${it.name}`);
    lines.push(`  ${it.qty} x ${formatRupiah(it.price)} = ${formatRupiah(it.price * it.qty)}`);
  });
  lines.push(divider);
  lines.push(`Total Tagihan : ${formatRupiah(sale.total)}`);
  lines.push(`Uang Diterima : ${formatRupiah(sale.paid)}`);
  lines.push(`Kembalian     : ${formatRupiah(sale.change)} (${terbilang(sale.change)})`);
  lines.push(divider);
  lines.push('Terima kasih sudah belanja di Warung kami!');
  return lines.join('\n');
}

// Cetak Struk (Thermal 58/80mm)
document.getElementById('print-receipt-btn')?.addEventListener('click', () => {
  window.print();
});

// Salin Teks Nota
document.getElementById('copy-receipt-btn')?.addEventListener('click', async () => {
  if (!currentActiveSale) return;
  const text = buildReceiptText(currentActiveSale);
  try {
    await navigator.clipboard.writeText(text);
    showToast('Teks nota berhasil disalin ke clipboard!', 'success');
  } catch (err) {
    showToast('Gagal menyalin nota: ' + err.message, 'error');
  }
});

// Bagikan via WhatsApp
document.getElementById('wa-receipt-btn')?.addEventListener('click', () => {
  if (!currentActiveSale) return;
  const text = buildReceiptText(currentActiveSale);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
});

// Tombol Transaksi Baru di Struk
document.getElementById('close-receipt-btn')?.addEventListener('click', () => {
  const modal = document.getElementById('receipt-modal');
  if (modal) modal.style.display = 'none';
  currentActiveSale = null;
  if (searchInput) searchInput.focus();
});

// Checkout Aman (2.3)
document.getElementById('checkout-btn').addEventListener('click', async () => {
  if (cart.size === 0) {
    showToast('Keranjang masih kosong!', 'warning');
    return;
  }
  const paid = getPaidAmount();
  if (paid < currentCartTotal) {
    showToast(`Uang pembayaran kurang ${formatRupiah(currentCartTotal - paid)}.`, 'error');
    return;
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = '<span>Menyimpan Transaksi...</span>';

  try {
    const sale = await recordSale([...cart.entries()], paid);

    // Tampilkan modal struk
    showReceiptModal(sale);

    // Reset keranjang & input kasir
    cart.clear();
    await renderCart();
    const payInput = document.getElementById('pay-amount');
    if (payInput) payInput.value = '';
    updatePaySpelled(0);
    updateChangeAmount();

    await renderProducts();
    await renderStock();
    await renderSummary();

    showToast(`Penjualan berhasil disimpan! Kembalian: ${formatRupiah(sale.change)}`, 'success');
  } catch (err) {
    showToast(`Gagal menyimpan penjualan: ${err.message}`, 'error');
  } finally {
    checkoutBtn.disabled = false;
    updateChangeAmount();
  }
});

// Handler Muat Data Contoh
async function handleSeedProducts() {
  const seedBtn = document.getElementById('seed-sample-btn');
  if (seedBtn) seedBtn.disabled = true;
  try {
    const addedCount = await seedSampleProducts();
    if (addedCount > 0) {
      showToast(`Berhasil menambahkan ${addedCount} produk contoh warung khas Indonesia!`, 'success');
    } else {
      showToast('Semua produk contoh sudah ada di daftar stok.', 'info');
    }
    await renderStock();
    await renderProducts();
    await renderSummary();
  } catch (err) {
    showToast(`Gagal memuat produk contoh: ${err.message}`, 'error');
  } finally {
    if (seedBtn) seedBtn.disabled = false;
  }
}

const seedSampleBtn = document.getElementById('seed-sample-btn');
if (seedSampleBtn) {
  seedSampleBtn.addEventListener('click', handleSeedProducts);
}

// Handler Isi Penjualan Contoh 14 Hari
async function handleSeedSales() {
  const seedSalesBtn = document.getElementById('seed-sales-btn');
  if (seedSalesBtn) seedSalesBtn.disabled = true;
  try {
    const createdCount = await seedSampleSales();
    if (createdCount > 0) {
      showToast(`Berhasil mengisi ${createdCount} penjualan contoh untuk 14 hari terakhir.`, 'success');
    } else {
      showToast('Penjualan contoh 14 hari sudah ada, atau belum ada produk.', 'info');
    }
    await renderStock();
    await renderProducts();
    await renderSummary();
  } catch (err) {
    showToast(`Gagal mengisi penjualan contoh: ${err.message}`, 'error');
  } finally {
    if (seedSalesBtn) seedSalesBtn.disabled = false;
  }
}

const seedSalesBtn = document.getElementById('seed-sales-btn');
if (seedSalesBtn) {
  seedSalesBtn.addEventListener('click', handleSeedSales);
}

// --- Stok: filter bar, tambah produk aman, quick restock & daftar stok modern ---
let currentStockFilter = 'all';

document.querySelectorAll('.stock-filter-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.stock-filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentStockFilter = chip.dataset.filter || 'all';
    renderStock();
  });
});

// Form Tambah Produk (Aman & Tervalidasi)
document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = document.getElementById('add-product-btn');
  const name = form.name.value.trim();
  const price = Number(form.price.value);
  const stock = Number(form.stock.value);

  if (!name) {
    showToast('Nama barang tidak boleh kosong!', 'warning');
    return;
  }
  if (isNaN(price) || price <= 0) {
    showToast('Harga jual harus berupa angka lebih dari 0!', 'warning');
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showToast('Stok awal tidak boleh negatif!', 'warning');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  try {
    await addProduct({ name, price, stock });
    form.reset();
    showToast(`Produk "${name}" berhasil ditambahkan ke etalase!`, 'success');
    await renderStock();
    await renderProducts();
    await renderSummary();
  } catch (err) {
    showToast('Gagal menambah produk: ' + err.message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

async function renderStock() {
  const container = document.getElementById('stock-list');
  if (!container) return;
  const products = await listProducts();

  // Hitung jumlah untuk filter chips
  const countAll = products.length;
  const countLow = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
  const countEmpty = products.filter((p) => p.stock <= 0).length;

  const elAll = document.getElementById('stock-count-all');
  const elLow = document.getElementById('stock-count-low');
  const elEmpty = document.getElementById('stock-count-empty');
  if (elAll) elAll.textContent = String(countAll);
  if (elLow) elLow.textContent = String(countLow);
  if (elEmpty) elEmpty.textContent = String(countEmpty);

  // Filter list
  let filtered = products;
  if (currentStockFilter === 'low') {
    filtered = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
  } else if (currentStockFilter === 'empty') {
    filtered = products.filter((p) => p.stock <= 0);
  }

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty" style="background:#fff; border-radius:10px; padding:24px; border:1px solid var(--border);">Tidak ada barang pada kategori ini.</div>';
    return;
  }

  filtered.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'stock-item-row';

    let badgeClass = 'safe';
    let badgeText = `Stok: ${p.stock}`;
    if (p.stock <= 0) {
      badgeClass = 'empty';
      badgeText = 'Habis';
    } else if (p.stock <= LOW_STOCK_THRESHOLD) {
      badgeClass = 'low';
      badgeText = `Menipis (${p.stock})`;
    }

    row.innerHTML = `
      <div class="stock-item-main">
        <div class="card-icon">${SVG_PACKAGE}</div>
        <div class="stock-item-info">
          <div class="stock-item-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
          <div class="stock-item-price">${formatRupiah(p.price)}</div>
        </div>
      </div>
      <div class="stock-item-status-col">
        <span class="stock-badge-pill ${badgeClass}">${badgeText}</span>
      </div>
      <div class="stock-quick-actions">
        <button type="button" class="btn-stock-qty" data-id="${p.id}" data-add="1" title="Tambah 1 stok">+1</button>
        <button type="button" class="btn-stock-qty" data-id="${p.id}" data-add="5" title="Tambah 5 stok">+5</button>
        <button type="button" class="btn-stock-qty" data-id="${p.id}" data-add="10" title="Tambah 10 stok">+10</button>
        <button type="button" class="btn-stock-custom" data-id="${p.id}" title="Input jumlah stok manual">+ Stok</button>
      </div>
    `;

    // Handler tombol cepat +1, +5, +10
    row.querySelectorAll('.btn-stock-qty').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const addQty = Number(btn.dataset.add);
        btn.disabled = true;
        try {
          const updated = await updateProductStock(p.id, addQty);
          showToast(`Stok ${updated.name} berhasil ditambah +${addQty} (kini ${updated.stock})`, 'success');
          await renderStock();
          await renderProducts();
          await renderSummary();
        } catch (err) {
          showToast('Gagal update stok: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Handler tombol + Stok manual
    const customBtn = row.querySelector('.btn-stock-custom');
    if (customBtn) {
      customBtn.addEventListener('click', async () => {
        const input = prompt(`Tambah stok untuk "${p.name}" (sisa stok: ${p.stock}):`, '5');
        if (!input) return;
        const num = parseInt(input, 10);
        if (isNaN(num) || num <= 0) {
          showToast('Masukkan jumlah penambahan stok yang valid!', 'warning');
          return;
        }
        customBtn.disabled = true;
        try {
          const updated = await updateProductStock(p.id, num);
          showToast(`Stok ${updated.name} berhasil ditambah +${num} (kini ${updated.stock})`, 'success');
          await renderStock();
          await renderProducts();
          await renderSummary();
        } catch (err) {
          showToast('Gagal update stok: ' + err.message, 'error');
        } finally {
          customBtn.disabled = false;
        }
      });
    }

    container.appendChild(row);
  });
}

// --- AI: tanya-jawab + ringkasan harian ---
// Badge jujur: model mana yang benar-benar menjawab.
const AI_SOURCE_LABEL = {
  on_device: 'Dijawab oleh Gemini Nano (di perangkat, tanpa internet)',
  in_cloud: 'Dijawab oleh Gemini (cloud)',
  local: 'Dihitung lokal: model AI sedang tidak tersedia',
};

document.getElementById('ask-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('ask-input');
  const out = document.getElementById('ai-answer');
  const sourceBadge = document.getElementById('ai-source');
  out.textContent = 'Mencari di data toko…';
  sourceBadge.hidden = true;
  try {
    const { text, source } = await askAI(input.value.trim());
    out.textContent = text;
    sourceBadge.textContent = AI_SOURCE_LABEL[source];
    sourceBadge.dataset.source = source;
    sourceBadge.hidden = false;
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

// --- Ringkasan Toko + Sinkronisasi (5.2 & 5.4) ---
function updateLastSyncDisplay() {
  const badge = document.getElementById('last-sync-badge');
  if (!badge) return;
  const lastSync = localStorage.getItem('warung_last_sync');
  if (lastSync) {
    badge.textContent = `Terakhir sinkron: ${lastSync}`;
    badge.style.color = '#15803d';
  } else {
    badge.textContent = 'Terakhir sinkron: Belum pernah';
    badge.style.color = '#64748b';
  }
}

function recordLastSyncTime() {
  const d = new Date();
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  localStorage.setItem('warung_last_sync', timeStr);
  updateLastSyncDisplay();
}

async function renderSummary() {
  const { total, count } = await getTodaySummary();
  const pendingCount = await getPendingSyncCount();

  const elTotal = document.getElementById('today-total');
  const elCount = document.getElementById('today-count');
  const elPending = document.getElementById('pending-sync');

  if (elTotal) elTotal.textContent = formatRupiah(total);
  if (elCount) elCount.textContent = `${count} nota`;
  if (elPending) elPending.textContent = `${pendingCount} item`;

  updateLastSyncDisplay();
}

document.getElementById('sync-now-btn').addEventListener('click', async () => {
  const btn = document.getElementById('sync-now-btn');
  btn.disabled = true;
  const prevText = btn.innerHTML;
  btn.innerHTML = '<span>Menyinkronkan…</span>';
  try {
    const n = await syncNow();
    recordLastSyncTime();
    showToast(`${n} item berhasil disinkronkan ke Firestore!`, 'success');
  } catch (err) {
    showToast(`Sinkronisasi gagal: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = prevText;
    await renderSummary();
  }
});

document.getElementById('pull-btn').addEventListener('click', async () => {
  const btn = document.getElementById('pull-btn');
  btn.disabled = true;
  const prevText = btn.innerHTML;
  btn.innerHTML = '<span>Menarik data…</span>';
  try {
    const pulled = await pullFromCloud();
    recordLastSyncTime();
    showToast(`Berhasil menarik ${pulled.products} produk baru, ${pulled.updatedProducts} produk diperbarui, dan ${pulled.sales} penjualan dari cloud!`, 'success');
    await renderProducts();
    await renderStock();
  } catch (err) {
    showToast(`Tarik data gagal: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = prevText;
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
  renderSummary();
})();
