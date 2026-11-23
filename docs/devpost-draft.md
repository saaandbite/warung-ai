# Devpost draft — Warung AI (#BuildHybridAI 2026)

> DRAF. Isi ke form Devpost tanggal 29–30 Nov. Video YouTube diisi setelah
> rekaman 29 Nov pagi. Jangan submit sebelum build dibekukan (28 Nov 12:00 WIB).

## Project title

Warung AI — the cashier that tells you what to restock tomorrow

## Tagline

Offline-first cashier for Indonesian warungs, with an AI restock advisor.

## Description

In every Indonesian city there is a warung that never closes. The Madurese
ones are the most famous of all: small grocery shops run by families from
Madura, open 24 hours, selling Indomie, coffee, soap, and rice to anyone
passing by at 2 in the morning. Ask the owner what technology the shop runs
on, and the answer is usually one thing — QRIS, so customers can pay by phone.

Everything else lives in the owner's head. Which items sell out first. How
much cash is in the drawer. What to buy at the morning market, and what can
wait until tomorrow. A wrong restock is not a small mistake: for a shop
earning about Rp 1 million of profit a month, one bad buying trip can cost
close to half a month's earnings.

Warung AI is built for that owner. It works without a signal, because warungs
do not always have one. It speaks Indonesian, right down to spelling out
change in words. And it answers the one question the owner asks every night:
with the money I have, what should I buy tomorrow?

**What it does**

- Offline cashier: record a sale, count the total and the change, all stored
  on the device first. It keeps working in airplane mode.
- Stock that looks after itself: every sale reduces stock automatically,
  with a low-stock warning per product.
- Sync when you are back online: sales and products upload to Firestore,
  and pulling brings the newest stock and prices back to the device.
- Ask AI: ask about your own shop — what sold best today, what is running
  low, how today went. Answers come from your own store data.
- Restock advisor: with a limited budget, which items should you buy
  tomorrow, ranked by what actually sells.

**How it works**

- Offline-first PWA, no build step. Service Worker (network-first) +
  IndexedDB on the device.
- Firestore sync: a queue carries local changes up; pull brings cloud data
  down and updates existing products when the cloud copy is newer.
- Firebase AI Logic (hybrid): on-device Gemini Nano on desktop Chrome
  where supported, cloud Gemini on the phones warung owners actually use.
  Numbers are always computed in code; the model only reasons — it never
  does the arithmetic.
- Firebase App Check (reCAPTCHA v3) protects the AI calls.

**Honest status**

No warung runs on Warung AI yet, and the sample data in the demo is sample
data. This project is built for warung owners, and tested with realistic
sample data — not presented as a deployed product.

## Built With

Firebase AI Logic, Firestore, Firebase App Check, Vercel, JavaScript, PWA

## Try it out

https://warung-ai-rho.vercel.app

## Video

[ISI SETELAH REKAM 29 NOV — tautan YouTube publik, maks 3 menit, subtitle Inggris]

## Repo

https://github.com/saaandbite/warung-ai
