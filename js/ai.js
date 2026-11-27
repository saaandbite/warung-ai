// Warung AI — lapisan AI (Firebase AI Logic, hybrid inference).
//
// Satu model hybrid (InferenceMode.PREFER_ON_DEVICE):
//   - Gemini Nano di perangkat bila Chrome desktop mendukungnya,
//   - Gemini cloud (Flash-Lite) bila Nano tidak ada (mis. Chrome Android).
// Bila model sama sekali tidak bisa dipanggil (offline tanpa Nano, App Check
// gagal, kuota habis), jawaban dihitung lokal dari data toko — app tetap berguna.
//
// Prinsip: angka dihitung kode, model hanya merangkai jawaban dari angka itu.
//
// API yang dipakai app.js:
//   askAI(question) -> Promise<{ text: string, source: 'on_device'|'in_cloud'|'local' }>
//   dailySummary() -> Promise<string>

import { getTodaySummary, listProducts } from './db.js';
import { getFirebaseApp, FIREBASE_SDK } from './firebase.js';

const CLOUD_MODEL = 'gemini-3.5-flash-lite';
const LOW_STOCK = 5;

let modelPromise = null;

function getModel() {
  modelPromise ??= (async () => {
    const app = await getFirebaseApp();
    const { getAI, getGenerativeModel, InferenceMode } = await import(`${FIREBASE_SDK}/firebase-ai.js`);
    // Backend default = Gemini Developer API (free tier).
    return getGenerativeModel(getAI(app), {
      mode: InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: { model: CLOUD_MODEL },
    });
  })().catch((err) => {
    modelPromise = null; // coba lagi di pertanyaan berikutnya
    throw err;
  });
  return modelPromise;
}

async function buildStoreContext() {
  const [today, products] = await Promise.all([getTodaySummary(), listProducts()]);
  const sold = new Map();
  today.sales.forEach((s) =>
    s.items.forEach((it) => sold.set(it.name, (sold.get(it.name) || 0) + it.qty)),
  );
  return {
    today,
    products,
    itemsSoldToday: [...sold.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => ({ name, qty })),
    lowStock: products.filter((p) => p.stock <= LOW_STOCK),
  };
}

function buildPrompt(question, ctx) {
  const data = {
    transactionsToday: ctx.today.count,
    revenueTodayRupiah: ctx.today.total,
    itemsSoldToday: ctx.itemsSoldToday,
    products: ctx.products.map((p) => ({ name: p.name, priceRupiah: p.price, stock: p.stock })),
    lowStockItems: ctx.lowStock.map((p) => ({ name: p.name, stock: p.stock })),
    lowStockRule: `stock <= ${LOW_STOCK} counts as running low`,
  };
  return [
    'You are the assistant of a small Indonesian shop (warung).',
    'Answer ONLY from the store data below. If the data cannot answer the question, say so briefly.',
    'Use the numbers exactly as given; never calculate or invent new numbers.',
    'Answer in at most 4 short sentences, plain text.',
    '',
    `Store data (JSON): ${JSON.stringify(data)}`,
    '',
    `Question: ${question}`,
    '',
    'IMPORTANT: write your answer in the SAME language as the question above. English question -> English answer. Indonesian question -> Indonesian answer.',
  ].join('\n');
}

export async function askAI(question) {
  const ctx = await buildStoreContext();
  try {
    const model = await getModel();
    const result = await model.generateContent(buildPrompt(question, ctx));
    const text = result.response.text().trim();
    if (text) return { text, source: result.response.inferenceSource || 'in_cloud' };
  } catch (err) {
    console.warn('[Warung AI] model tidak tersedia, pakai jawaban lokal:', err);
  }
  return { text: localAnswer(question, ctx), source: 'local' };
}

// Jawaban cadangan tanpa model (offline tanpa Nano / AI Logic gagal).
function localAnswer(question, { today, itemsSoldToday, lowStock }) {
  const q = question.toLowerCase();

  if (q.includes('laris') || q.includes('best') || q.includes('top')) {
    if (itemsSoldToday.length === 0) return 'Belum ada penjualan hari ini, jadi belum bisa menentukan barang paling laris.';
    const { name, qty } = itemsSoldToday[0];
    return `Hari ini yang paling laris: ${name} (${qty} terjual).`;
  }

  if (q.includes('stok') || q.includes('stock') || q.includes('habis')) {
    if (lowStock.length === 0) return `Semua stok masih aman (di atas ${LOW_STOCK}).`;
    return 'Stok menipis: ' + lowStock.map((p) => `${p.name} (sisa ${p.stock})`).join(', ') + '.';
  }

  if (q.includes('penjualan') || q.includes('omzet') || q.includes('laku') || q.includes('sales')) {
    return `Hari ini ada ${today.count} transaksi dengan total ${today.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}.`;
  }

  return (
    'Model AI sedang tidak tersedia. Tanpa model, aku bisa jawab:\n' +
    '• "barang apa paling laris hari ini?"\n' +
    '• "stok apa yang hampir habis?"\n' +
    '• "berapa penjualan hari ini?"'
  );
}

export async function dailySummary() {
  const { today, lowStock } = await buildStoreContext();
  const lines = [
    `Ringkasan hari ini: ${today.count} transaksi, total Rp ${today.total.toLocaleString('id-ID')}.`,
  ];
  if (lowStock.length > 0) {
    lines.push('Perlu restok: ' + lowStock.map((p) => `${p.name} (sisa ${p.stock})`).join(', ') + '.');
  } else {
    lines.push('Semua stok masih aman.');
  }
  return lines.join('\n');
}
