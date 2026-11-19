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
};

// Catatan:
// - App Check: aktifkan di Firebase Console. Untuk pengembangan, pakai
//   debug token (diterima untuk submission #BuildHybridAI).
// - Firebase AI Logic: aktifkan di Firebase Console (Build → Firebase AI Logic),
//   lalu pilih model Gemini Nano untuk on-device dan model Gemini cloud
//   untuk fallback.
