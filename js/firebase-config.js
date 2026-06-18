// ============================================================
// Firebase Configuration
// ============================================================
// SETUP INSTRUCTIONS:
//   1. Go to https://console.firebase.google.com/
//   2. Click "Add project" and follow the steps
//   3. In the project, click "Add app" → Web (</>)
//   4. Copy the firebaseConfig object and paste the values below
//   5. Go to Authentication → Sign-in method → Enable "Google"
//   6. Go to Firestore Database → Create database (start in test mode)
//   7. (Optional) Apply these Firestore security rules:
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /users/{uid}/{document=**} {
//            allow read, write: if request.auth != null && request.auth.uid == uid;
//          }
//          match /community/{postId} { /* ... existing rules ... */ }
//          match /feedback/{id} {
//            allow create: if true;
//            allow read, update, delete: if request.auth != null
//              && request.auth.token.email == 'mr.tomcat16789@gmail.com';
//          }
//        }
//      }
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBRGgxtcYvMOHKBSXoJXvvwky8TIEIXKTs",
  authDomain:        "lightsticks.firebaseapp.com",
  projectId:         "lightsticks",
  storageBucket:     "lightsticks.firebasestorage.app",
  messagingSenderId: "11494483443",
  appId:             "1:11494483443:web:e0379c5ead50c738561e86",
  measurementId:     "G-126E721W50"
};

// Returns true if the config has been filled in
function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

// ── App Check (reCAPTCHA v3) ─────────────────────────────────
// Paste your reCAPTCHA v3 SITE KEY here (from google.com/recaptcha/admin)
// Leave empty to disable App Check (e.g. during local development)
const RECAPTCHA_SITE_KEY = "6LcbwhAtAAAADPkcRSdT-o9SFpeIqSdMvrmALcm";

// Initialize Firebase once (safe to call multiple times)
function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.warn("[LightStickWaves] Firebase not configured — fill in js/firebase-config.js");
    return false;
  }
  if (typeof firebase === 'undefined') {
    console.error("[LightStickWaves] Firebase SDK not loaded — check the CDN <script> tags");
    return false;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    console.log("[LightStickWaves] Firebase initialized OK");
  } catch(e) {
    if (e.code !== "app/duplicate-app") { console.error("[Firebase]", e); return false; }
  }

  // Activate App Check (compat SDK v9)
  if (RECAPTCHA_SITE_KEY) {
    try {
      const appCheck = firebase.appCheck();
      appCheck.activate(
        new firebase.appCheck.ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        true   // auto-refresh tokens
      );
      console.log("[LightStickWaves] App Check activated ✓");
    } catch(e) {
      // ReCaptchaV3Provider not available in this build — skip App Check
      console.warn("[LightStickWaves] App Check not available:", e.message);
    }
  }

  return true;
}
