// Warung AI — lapisan AI (Firebase AI Logic).
//
// TODO (Agung): lengkapi implementasi ini setelah project Firebase dibuat.
//   1. Salin js/firebase-config.example.js -> js/firebase-config.js, isi config.
//   2. npm i firebase (atau pakai CDN modul Firebase di index.html).
//   3. getGenerativeModel({ model: 'gemini-2.5-nano' }) untuk on-device,
//      dengan fallback ke model cloud saat Nano tidak tersedia / offline gagal.
//   4. Aktifkan App Check (debug token untuk pengembangan).
//
// Sampai integrasi selesai, fungsi di bawah memakai ringkasan berbasis data
// lokal (tanpa model) supaya tab "Tanya AI" tetap berguna saat demo awal.
//
// API yang dipakai app.js — jangan ubah namanya:
//   askAI(question: string) -> Promise<string>
//   dailySummary() -> Promise<string>

import { getTodaySummary, listProducts } from './db.js';

// Cek kasar ketersediaan Nano on-device di Chrome ini.
// Pemeriksaan asli memakai Firebase AI Logic; ini placeholder yang
// mengembalikan false sampai integrasi selesai.
export async function isNanoAvailable() {
  return false; // TODO: ganti dengan pengecekan Firebase AI Logic.
}

function buildStoreContext() {
  return Promise.all([getTodaySummary(), listProducts()]).then(
    ([today, products]) => ({
      today,
      products: products.map((p) => ({ name: p.name, price: p.price, stock: p.stock })),
    }),
  );
}

// Tanya-jawab sederhana dari data toko (fallback lokal).
// TODO: ganti badannya dengan panggilan model (Nano on-device dulu,
// lalu cloud kalau Nano tidak tersedia), dengan konteks data toko.
export async function askAI(question) {
  const q = question.toLowerCase();
  const { today, products } = await buildStoreContext();

  if (q.includes('laris')) {
    const sold = new Map();
    today.sales.forEach((s) =>
      s.items.forEach((it) => sold.set(it.name, (sold.get(it.name) || 0) + it.qty)),
    );
    if (sold.size === 0) return 'Belum ada penjualan hari ini, jadi belum bisa menentukan barang paling laris.';
    const [name, qty] = [...sold.entries()].sort((a, b) => b[1] - a[1])[0];
    return `Hari ini yang paling laris: ${name} (${qty} terjual).`;
  }

  if (q.includes('stok') && (q.includes('habis') || q.includes('menipis') || q.includes('sedikit'))) {
    const low = products.filter((p) => p.stock <= 5);
    if (low.length === 0) return 'Semua stok masih aman (di atas 5).';
    return 'Stok menipis: ' + low.map((p) => `${p.name} (sisa ${p.stock})`).join(', ') + '.';
  }

  if (q.includes('penjualan') || q.includes('omzet') || q.includes('laku')) {
    return `Hari ini ada ${today.count} transaksi dengan total ${today.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}.`;
  }

  return (
    'Aku bisa jawab dari data tokomu, misalnya:\n' +
    '• "barang apa paling laris hari ini?"\n' +
    '• "stok apa yang hampir habis?"\n' +
    '• "berapa penjualan hari ini?"\n' +
    '(Mode AI penuh — Gemini Nano on-device — masih disiapkan.)'
  );
}

export async function dailySummary() {
  const { today, products } = await buildStoreContext();
  const low = products.filter((p) => p.stock <= 5);
  const lines = [
    `Ringkasan hari ini: ${today.count} transaksi, total Rp ${today.total.toLocaleString('id-ID')}.`,
  ];
  if (low.length > 0) {
    lines.push('Perlu restok: ' + low.map((p) => `${p.name} (sisa ${p.stock})`).join(', ') + '.');
  } else {
    lines.push('Semua stok masih aman.');
  }
  // TODO: minta model (Nano/cloud) merangkai ringkasan naratif dari konteks ini.
  return lines.join('\n');
}
