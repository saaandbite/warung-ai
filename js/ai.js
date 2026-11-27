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

import { getTodaySummary, listProducts, getSalesSince, localDateString } from './db.js';
import { getFirebaseApp, FIREBASE_SDK } from './firebase.js';

const CLOUD_MODEL = 'gemini-3.5-flash-lite';
const LOW_STOCK = 5;

// ?cloud di URL: paksa jalur cloud, untuk menguji/menunjukkan perilaku di
// perangkat tanpa Gemini Nano (mis. Chrome Android) dari laptop yang punya Nano.
const FORCE_CLOUD = new URLSearchParams(globalThis.location?.search ?? '').has('cloud');

const models = new Map();

// Satu model hybrid per konfigurasi (Q&A teks biasa, Kulakan berformat JSON).
function getModel(kind = 'text', jsonSchema = null, preferCloud = false) {
  if (!models.has(kind)) {
    const promise = (async () => {
      const app = await getFirebaseApp();
      const { getAI, getGenerativeModel, InferenceMode } = await import(`${FIREBASE_SDK}/firebase-ai.js`);
      const inCloudParams = { model: CLOUD_MODEL };
      const onDeviceParams = {};
      if (jsonSchema) {
        inCloudParams.generationConfig = { responseMimeType: 'application/json', responseJsonSchema: jsonSchema };
        onDeviceParams.promptOptions = { responseConstraint: jsonSchema };
      }
      // Backend default = Gemini Developer API (free tier).
      return getGenerativeModel(getAI(app), {
        mode: FORCE_CLOUD
          ? InferenceMode.ONLY_IN_CLOUD
          : preferCloud ? InferenceMode.PREFER_IN_CLOUD : InferenceMode.PREFER_ON_DEVICE,
        inCloudParams,
        onDeviceParams,
      });
    })().catch((err) => {
      models.delete(kind); // coba lagi di permintaan berikutnya
      throw err;
    });
    models.set(kind, promise);
  }
  return models.get(kind);
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
  // Perbandingan (termahal, stok terbanyak, dst.) dihitung kode: model kecil
  // seperti Nano sering salah membandingkan angka sendiri.
  const byPrice = [...ctx.products].sort((a, b) => b.price - a.price);
  const byStock = [...ctx.products].sort((a, b) => b.stock - a.stock);
  const rp = (n) => `Rp ${n.toLocaleString('id-ID')}`;
  const desc = (p) => `${p.name} (price ${rp(p.price)}, stock ${p.stock})`;
  const facts = [
    `Transactions today: ${ctx.today.count}. Revenue today: ${rp(ctx.today.total)}.`,
    ctx.itemsSoldToday.length
      ? `Best seller today: ${ctx.itemsSoldToday[0].name} (${ctx.itemsSoldToday[0].qty} sold).`
      : 'No sales yet today, so there is no best seller today.',
    byPrice.length && `Most expensive product: ${desc(byPrice[0])}. Cheapest product: ${desc(byPrice.at(-1))}.`,
    byStock.length && `Most stock: ${desc(byStock[0])}. Least stock: ${desc(byStock.at(-1))}.`,
    ctx.lowStock.length
      ? `Running low (stock ${LOW_STOCK} or less): ${ctx.lowStock.map(desc).join(', ')}.`
      : `Running low: NONE. Every product has more than ${LOW_STOCK} in stock, so nothing needs restocking urgently.`,
  ].filter(Boolean);
  return [
    'You are the assistant of a small Indonesian shop (warung).',
    'Answer ONLY from the facts and data below. The facts are already computed and correct; repeat them, do not reinterpret them.',
    'If the data cannot answer the question, say so briefly.',
    'Never calculate, compare, or invent numbers yourself.',
    'Answer in at most 2 short sentences, plain text.',
    '',
    'Facts:',
    ...facts.map((f) => `- ${f}`),
    '',
    `Items sold today (JSON): ${JSON.stringify(ctx.itemsSoldToday)}`,
    `All products (JSON): ${JSON.stringify(ctx.products.map((p) => ({ name: p.name, priceRupiah: p.price, stock: p.stock })))}`,
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

// --- Penasihat Kulakan: "dengan uang Rp X, besok beli apa?" ---
// Kode menghitung kandidat (laku per hari, sisa hari stok, jumlah yang perlu
// dibeli) dan menyusun daftar belanja dalam budget. Model (Nano/cloud) hanya
// menulis alasan per barang. Semua rupiah dihitung kode.
//
// shortcut: harga kulakan belum dicatat, jadi pakai harga jual sebagai
// perkiraan atas (belanja nyata lebih murah); ganti bila produk punya harga modal.

const HISTORY_DAYS = 7;
const COVER_DAYS = 7; // beli cukup untuk sekitar seminggu

const RESTOCK_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['name', 'reason'],
      },
    },
  },
  required: ['items'],
};

// products: [{name, price, stock}], sales: [{items:[{name, qty}]}]
export function buildRestockCandidates(products, sales, days = HISTORY_DAYS) {
  const sold = new Map();
  sales.forEach((s) =>
    s.items.forEach((it) => {
      const key = it.name.toLowerCase();
      sold.set(key, (sold.get(key) || 0) + it.qty);
    }),
  );
  return products
    .map((p) => {
      const perDay = (sold.get(p.name.toLowerCase()) || 0) / days;
      return {
        name: p.name,
        stock: p.stock,
        unitPrice: p.price,
        soldPerDay: Math.round(perDay * 10) / 10,
        daysLeft: perDay > 0 ? Math.round((p.stock / perDay) * 10) / 10 : null,
        suggestedQty: Math.ceil(perDay * COVER_DAYS) - p.stock,
      };
    })
    .filter((c) => c.suggestedQty > 0)
    .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
}

// Validasi pasca-model. picks: [{name, qty, reason}] urut prioritas.
// Model memilih barang + batas jumlah; kode membagi budget satu per satu ke
// barang yang stoknya paling cepat habis, supaya satu barang tidak memborong
// seluruh budget. Seri -> ikut urutan prioritas model.
export function planRestock(candidates, picks, budget) {
  const byName = new Map(candidates.map((c) => [c.name.toLowerCase(), c]));
  const entries = [];
  for (const pick of picks) {
    const c = byName.get(String(pick.name ?? '').toLowerCase());
    if (!c) continue; // di luar katalog/kandidat, atau duplikat
    byName.delete(c.name.toLowerCase());
    const cap = Math.min(Math.max(1, Math.floor(Number(pick.qty) || 0)), c.suggestedQty);
    entries.push({ c, cap, qty: 0, reason: String(pick.reason ?? '').slice(0, 160) });
  }

  let total = 0;
  for (;;) {
    let best = null;
    let bestCover = Infinity;
    for (const e of entries) {
      if (e.qty >= e.cap || total + e.c.unitPrice > budget) continue;
      const cover = (e.c.stock + e.qty) / e.c.soldPerDay; // hari sampai habis
      if (cover < bestCover) [best, bestCover] = [e, cover];
    }
    if (!best) break;
    best.qty += 1;
    total += best.c.unitPrice;
  }

  const items = entries
    .filter((e) => e.qty > 0)
    .map((e) => ({ name: e.c.name, qty: e.qty, unitPrice: e.c.unitPrice, subtotal: e.qty * e.c.unitPrice, reason: e.reason }));
  return { items, total, leftover: budget - total };
}

function localPicks(candidates) {
  return candidates.map((c) => ({
    name: c.name,
    qty: c.suggestedQty,
    reason: c.daysLeft !== null
      ? `Laku ±${c.soldPerDay}/hari, stok habis dalam ±${c.daysLeft} hari.`
      : 'Stok menipis.',
  }));
}

function buildRestockPrompt(plan, candidates) {
  const facts = plan.items.map((it) => {
    const c = candidates.find((x) => x.name === it.name);
    return { nama: it.name, jumlahBeli: it.qty, stokSekarang: c.stock, lakuPerHari: c.soldPerDay, habisDalamHari: c.daysLeft };
  });
  return [
    'You help the owner of a small Indonesian shop (warung) understand the shopping list for tomorrow.',
    'The list and all numbers are already decided. Do not change them.',
    'For EACH item, write one short reason in Indonesian (max 12 words) why it should be bought.',
    'The reason MUST use its lakuPerHari or habisDalamHari numbers, written with digits like the example (never write the field names). Do not guess about taste, weather, or customers.',
    'Example reason: "Laku 2 per hari, stok habis besok."',
    'Return every item with name = its nama, same order.',
    '',
    `Shopping list (JSON): ${JSON.stringify(facts)}`,
  ].join('\n');
}

function parseJson(text) {
  return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
}

// Kode menyusun daftar + semua angka; model hanya menulis alasan per barang.
// -> { items, total, leftover, source, candidatesCount }
export async function adviseRestock(budget) {
  const from = new Date();
  from.setDate(from.getDate() - HISTORY_DAYS);
  const [products, sales] = await Promise.all([listProducts(), getSalesSince(localDateString(from))]);
  const candidates = buildRestockCandidates(products, sales);
  const plan = planRestock(candidates, localPicks(candidates), budget);
  const base = { ...plan, source: 'local', candidatesCount: candidates.length };
  if (plan.items.length === 0) return base;

  try {
    // Online: cloud (alasan lebih akurat). Offline: SDK jatuh ke Nano.
    const model = await getModel('restock', RESTOCK_SCHEMA, true);
    const result = await model.generateContent(buildRestockPrompt(plan, candidates));
    const reasons = new Map(
      (parseJson(result.response.text()).items ?? [])
        .filter((r) => typeof r.reason === 'string' && r.reason.trim())
        .map((r) => [String(r.name).toLowerCase(), r.reason.trim().slice(0, 160)]),
    );
    const items = plan.items.map((it) => ({ ...it, reason: reasons.get(it.name.toLowerCase()) ?? it.reason }));
    // Badge model hanya bila alasan model benar-benar dipakai.
    if (items.some((it) => reasons.has(it.name.toLowerCase()))) {
      return { ...base, items, source: result.response.inferenceSource || 'in_cloud' };
    }
  } catch (err) {
    console.warn('[Warung AI] Kulakan: model tidak tersedia, pakai alasan lokal:', err);
  }
  return base;
}
