// CONTOH konfigurasi Firebase — JANGAN isi kunci asli di file ini.
// Salin file ini menjadi `firebase-config.js` (sudah di-ignore git)
// dan isi dengan konfigurasi project Firebase-mu sendiri.
// Ambil nilainya dari Firebase Console → Project settings → Your apps → Web app.

export const firebaseConfig = {
  apiKey: 'ISI_API_KEY_MU',
  authDomain: 'PROJECT_ID.firebaseapp.com',
  projectId: 'PROJECT_ID',
  storageBucket: 'PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'ISI_SENDER_ID_MU',
  appId: 'ISI_APP_ID_MU',

  // reCAPTCHA v3 site key untuk Firebase App Check (publik, aman di-commit).
  // Buat di https://www.google.com/recaptcha/admin lalu daftarkan juga di
  // Firebase Console > App Check. Jangan taruh debug token App Check di sini.
  appCheckSiteKey: 'ISI_RECAPTCHA_V3_SITE_KEY_MU',
};

// Catatan:
// - App Check: aktifkan di Firebase Console. Untuk localhost, SDK mencetak
//   debug token ke console; daftarkan token itu di Firebase Console > App Check
//   > Apps > Manage debug tokens. JANGAN commit nilai debug token.
// - Untuk override debug token lokal tanpa commit, buat js/appcheck-debug.local.js:
//     export const debugToken = 'TOKEN_DEBUG_LOKAL';
//   File itu di-ignore git.
// - Firebase AI Logic: aktifkan di Firebase Console (Build → Firebase AI Logic),
//   lalu pilih model Gemini Nano untuk on-device dan model Gemini cloud
//   untuk fallback.
