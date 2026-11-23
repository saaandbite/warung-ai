# Warung AI — the cashier that tells you what to restock tomorrow

> An offline-first cashier for Indonesian warungs, with an AI that advises what to buy next — built with Firebase AI Logic for **#BuildHybridAI 2026** (Google / Firebase, Devpost).

Live demo: https://warung-ai-rho.vercel.app
Team **TDR-3000**: Haris Sandi Purna Yudha, Ahmad Dedad, Faiz Rifki Syuhada, Agung Dwi Pangestu.

## The story

In every Indonesian city there is a warung that never closes. The Madurese ones are the most famous of all: small grocery shops run by families from Madura, open 24 hours, selling Indomie, coffee, soap, and rice to anyone passing by at 2 in the morning. Ask the owner what technology the shop runs on, and the answer is usually one thing — QRIS, so customers can pay by phone.

Everything else lives in the owner's head. Which items sell out first. How much cash is in the drawer. What to buy at the morning market, and what can wait until tomorrow. A wrong restock is not a small mistake: for a shop earning about Rp 1 million of profit a month, one bad buying trip can cost close to half a month's earnings.

Warung AI is built for that owner. It works without a signal, because warungs do not always have one. It speaks Indonesian, right down to spelling out change in words ("lima puluh ribu rupiah"). And it answers the one question the owner asks every night: with the money I have, what should I buy tomorrow?

This is not a story about a shop that already uses the app — no warung runs on Warung AI yet, and the sample data in the demo is sample data. It is a story about who the app is for, and why it is built the way it is.

## What it does

1. **Offline cashier** — record a sale, count the total and the change, all stored on the device first. It keeps working in airplane mode.
2. **Stock that looks after itself** — every sale reduces stock automatically, with a low-stock warning per product.
3. **Sync when you are back online** — sales and products upload to Firestore, and pulling brings the newest stock and prices from the cloud back to the device.
4. **Ask AI** — ask about your own shop: what sold best today, what is running low, how today went. Answers come from your own store data. The Firebase AI Logic integration is in progress: on-device Gemini Nano where supported, cloud Gemini on the phones warung owners actually use. The restock advisor — what to buy next under a limited budget — is being built now; see Status below.

What it deliberately does not do: full accounting, multiple branches, QRIS payments, supplier notifications, tax reports. Those are not the warung owner's problem at 2 in the morning.

## How it works

- **Offline-first PWA, no build step.** Service Worker (network-first) + IndexedDB (`products`, `sales`, `syncQueue`). Open it, sell, close it — the data is on the device.
- **Sync (Firestore).** A queue carries local changes up; pull brings cloud data down. Pull adds new products and updates existing ones when the cloud copy is newer (compared by `syncedAt`), and never overwrites a local change that has not been uploaded yet.
- **Hybrid AI (Firebase AI Logic).** One call through Firebase AI Logic: on-device Gemini Nano on desktop Chrome where supported, cloud Gemini (Flash-Lite) on phones. Nano does not exist on Chrome for Android or iOS, so the app is honest about that and shows which model actually answered. Numbers are always computed in code; the model only reasons about priorities — it never does the arithmetic.
- **App Check.** Firebase AI Logic requires App Check. This project uses reCAPTCHA v3 (free, no billing) for the live URL and debug tokens for local development. A debug token is never committed.
- **Hosting.** Static site, auto-deployed to Vercel on every push to `main`.

## Project structure

```
index.html            # App shell PWA (Kasir / Stok / Tanya AI / Ringkasan)
manifest.json         # PWA manifest
sw.js                 # Service Worker (network-first)
css/styles.css        # Styling, mobile-first
js/app.js             # Entry point: tabs, online/offline status, pull & sync buttons
js/db.js              # IndexedDB: products, sales, sync queue
js/ai.js              # AI answers from local store data; Firebase AI Logic integration in progress
js/sync.js            # Queue upload + pull from Firestore
js/firebase-config.js # Public web config of the Firebase project (not a server secret)
docs/brief.md         # Full project brief (idea, timeline, submission checklist)
docs/todo.md          # What is being built next, in order, with owners (in Indonesian)
```

## Run it locally

No build step. Serve the folder with any static server:

```sh
npx serve .
# then open http://localhost:3000
```

The Service Worker only activates over `http://localhost` or HTTPS.

## Firebase setup

1. Create a project in [Firebase Console](https://console.firebase.google.com).
2. Enable **Firestore**, **Firebase AI Logic**, and **App Check**.
3. `js/firebase-config.js` holds the project's public web config and is committed on purpose — it is client config, not a server secret. Never commit a service account JSON or a private key to this repo.
4. For App Check on the live URL, register a reCAPTCHA v3 key (free) at google.com/recaptcha/admin and set it in the Firebase Console under App Check. For local development, use a debug token — never commit the token value.

## Status — what is done, what is next

Done:

- Offline cashier with Indonesian thousand separators and change spelled out in words
- Stock tracking, live search, quick-cash buttons
- Sync upload + pull (pull updates existing products from the cloud)
- 14-day sample sales history (clearly labelled as sample data)
- PWA icons (192/512, maskable)
- Live on Vercel with CI/CD (every push to `main` deploys)

In progress (before 1 Dec 2026):

- Firebase AI Logic: real model calls (cloud first), restock advisor, honest model badge
- App Check (reCAPTCHA v3) + Firestore rules + enforcement
- Receipts, quick restock, security and data fixes

Next: 3-minute demo video, Devpost submission.

## Timeline

- **23 Nov:** AI Logic spike + App Check (tonight).
- **24 Nov:** cloud Q&A end-to-end, seed data for 14 days.
- **25 Nov:** rest day (UiPath deadline + Teachers' Day).
- **26 Nov:** full restock advisor; go/no-go on the AI (cloud-only criteria).
- **27 Nov:** photo receipt (only if the advisor passes go/no-go); minimal sync fixes; two-device test.
- **28 Nov:** freeze the build at 12:00 WIB; video rehearsal.
- **29 Nov:** record the 3-minute demo video in the morning; fill in the Devpost draft.
- **30 Nov:** buffer; submit well before the deadline.
- **1 Dec 2026, 05:00 WIB:** submission deadline.

## Team

- **Haris** — product & UX, store data, demo script + recording, Devpost.
- **Syuhada** — frontend (cashier & stock), receipts, video editing.
- **Agung** — Firebase AI Logic integration.
- **Ahmad** — Firestore data model, sync, App Check.

## Submission checklist

- [ ] Working demo app (web/Chrome) showing Firebase AI Logic at runtime.
- [ ] Public repo with all source, assets, and run instructions.
- [ ] Demo video, max 3 minutes, public on YouTube, in English or with English subtitles.
- [ ] Project description in the Devpost form.
- [ ] App Check active (reCAPTCHA v3 or debug token).
- [ ] Repo + Devpost draft under the team name.

## License

MIT — see [LICENSE](LICENSE).
