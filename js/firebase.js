// Warung AI — bootstrap Firebase (app + App Check + Firestore).
//
// Satu titik inisialisasi supaya sync.js, ai.js, dan modul lain berbagi
// instance app yang sama. Firebase SDK dimuat malas (lazy) dari CDN resmi,
// sama seperti pola sync.js sebelumnya: tanpa config/SDK, fitur lokal tetap
// jalan dan pemanggil mendapat error yang jelas.
//
// App Check (tugas 1.5):
// - Produksi/live: Fraud Defense (reCAPTCHA Enterprise) via ReCaptchaEnterpriseProvider.
// - Localhost/dev: debug provider. SDK mencetak debug token ke console saat
//   pertama jalan; daftarkan token itu di Firebase Console > App Check >
//   Apps > Manage debug tokens. Token debug TIDAK boleh di-commit.
// - Site key dibaca dari firebaseConfig.appCheckSiteKey (isi di
//   js/firebase-config.js; nilai site key Fraud Defense itu publik).
//
// Enforcement App Check diaktifkan di Firebase Console (Firestore +
// Firebase AI Logic) setelah klien siap — itu langkah manual, bukan kode.

let app = null;
let db = null;
let appCheck = null;
let firestoreLib = null;

function isLocalhost() {
  const host = globalThis.location?.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

async function loadFirebaseConfig() {
  try {
    const mod = await import('./firebase-config.js');
    return mod.firebaseConfig;
  } catch {
    throw new Error(
      'Firebase belum dikonfigurasi di deployment ini. Data tetap tersimpan lokal dan akan dikirim setelah konfigurasi ditambahkan.',
    );
  }
}

async function initAppCheck(firebaseApp, firebaseConfig, appCheckMod) {
  if (appCheck) return appCheck;
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = appCheckMod;

  if (isLocalhost()) {
    // Mode debug: SDK akan log token debug ke console. Daftarkan token itu
    // di Firebase Console, jangan tulis nilai token di file yang di-commit.
    // Untuk override lokal yang tidak di-commit, buat js/appcheck-debug.local.js
    // yang mengekspor { debugToken: '...' } dan tambahkan file itu ke .gitignore.
    let debugToken = true;
    try {
      const local = await import('./appcheck-debug.local.js');
      if (typeof local.debugToken === 'string' && local.debugToken.length > 0) {
        debugToken = local.debugToken;
      }
    } catch {
      // Tidak ada override lokal — pakai `true` agar SDK mencetak token.
    }
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  const siteKey = firebaseConfig.appCheckSiteKey;
  if (!siteKey && !isLocalhost()) {
    throw new Error(
      'App Check site key belum diisi (firebaseConfig.appCheckSiteKey). Isi Fraud Defense site key untuk deployment live.',
    );
  }

  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey || 'MISSING_APPCHECK_SITE_KEY'),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}

export async function getFirebaseApp() {
  if (app) return app;
  const firebaseConfig = await loadFirebaseConfig();
  const { initializeApp, getApps, getApp } = await import(
    'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'
  );
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  // App Check diinisialisasi bersama app agar sync dan AI Logic (nanti)
  // memakai perlindungan yang sama.
  const appCheckMod = await import(
    'https://www.gstatic.com/firebasejs/11.0.1/firebase-app-check.js'
  );
  await initAppCheck(app, firebaseConfig, appCheckMod);
  return app;
}

export async function getFirestoreDb() {
  if (db && firestoreLib) return { firestore: db, ...firestoreLib };

  const firebaseApp = await getFirebaseApp();
  const { getFirestore, doc, setDoc, collection, getDocs } = await import(
    'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js'
  );

  db = getFirestore(firebaseApp);
  firestoreLib = { doc, setDoc, collection, getDocs };
  return { firestore: db, ...firestoreLib };
}

// Berguna untuk pengujian manual / verifikasi App Check token.
export async function getAppCheckToken(forceRefresh = false) {
  await getFirebaseApp();
  if (!appCheck) throw new Error('App Check belum terinisialisasi.');
  const { getToken } = await import(
    'https://www.gstatic.com/firebasejs/11.0.1/firebase-app-check.js'
  );
  return getToken(appCheck, forceRefresh);
}
