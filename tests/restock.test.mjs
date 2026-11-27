// Jalankan: node tests/restock.test.mjs
import assert from 'node:assert/strict';
import { buildRestockCandidates, planRestock } from '../js/ai.js';

const products = [
  { name: 'Kopiko', price: 8500, stock: 2 },
  { name: 'Aqua', price: 3500, stock: 2 },
  { name: 'Sabun', price: 3500, stock: 200 },
  { name: 'Beras', price: 16000, stock: 15 },
];
// 7 hari: Kopiko 14 (2/hari), Aqua 28 (4/hari), Sabun 7, Beras 0
const sales = [
  { items: [{ name: 'Kopiko', qty: 14 }, { name: 'aqua', qty: 28 }, { name: 'Sabun', qty: 7 }] },
];

const candidates = buildRestockCandidates(products, sales);
// Sabun & Beras tidak perlu dibeli; Aqua habis lebih cepat -> urutan pertama.
assert.deepEqual(candidates.map((c) => c.name), ['Aqua', 'Kopiko']);
assert.equal(candidates[0].suggestedQty, 26); // 4*7 - 2
assert.equal(candidates[1].suggestedQty, 12); // 2*7 - 2

// Model mengusulkan barang asing, duplikat, qty berlebih, dan melebihi budget.
const plan = planRestock(
  candidates,
  [
    { name: 'Rokok', qty: 5, reason: 'x' }, // di luar kandidat -> dibuang
    { name: 'kopiko', qty: 99, reason: 'laris' }, // dibatasi 12
    { name: 'Kopiko', qty: 1, reason: 'dup' }, // duplikat -> dibuang
    { name: 'Aqua', qty: 26, reason: 'habis' },
  ],
  150000,
);
// Budget dibagi agar keduanya bertahan seimbang: Kopiko (2+9)/2 = 5,5 hari, Aqua (2+21)/4 = 5,75 hari.
assert.deepEqual(plan.items.map((i) => [i.name, i.qty]), [['Kopiko', 9], ['Aqua', 21]]);
assert.equal(plan.total, 9 * 8500 + 21 * 3500); // 150.000
assert.equal(plan.leftover, 0);
assert.equal(plan.items[0].reason, 'laris');

// Batas jumlah dari model dihormati walau budget masih sisa.
const capped = planRestock(candidates, [{ name: 'Aqua', qty: 3, reason: '' }], 150000);
assert.deepEqual(capped.items.map((i) => [i.name, i.qty]), [['Aqua', 3]]);
assert.equal(capped.leftover, 150000 - 3 * 3500);

// Budget terlalu kecil -> tidak ada item, tidak pernah minus.
const tiny = planRestock(candidates, [{ name: 'Kopiko', qty: 1, reason: '' }], 1000);
assert.deepEqual(tiny, { items: [], total: 0, leftover: 1000 });

console.log('restock tests: ok');
