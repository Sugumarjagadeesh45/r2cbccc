const admin = require('firebase-admin');
const path = require('path');

try {
  let firebaseConfig = null;
  
  // 1. FIRST TRY: Check for Render.com environment variables
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log('✅ Firebase: Initializing from Render.com environment variables');
    
    firebaseConfig = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // CRITICAL FIX
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
    };
    
    console.log('✅ Firebase Config loaded from env vars');
    console.log(`✅ Project: ${firebaseConfig.project_id}`);
    console.log(`✅ Client Email: ${firebaseConfig.client_email}`);
    
  } 
  // 2. FALLBACK: Try local JSON file for development
  else {
    try {
      console.log('⚠️ Firebase: No env vars found, trying local JSON file...');
      firebaseConfig = require('./serviceAccountKey.json');
      console.log('✅ Firebase: Initialized from local serviceAccountKey.json');
    } catch (jsonError) {
      throw new Error('No Firebase configuration found in environment or local file');
    }
  }

  // 3. Initialize Firebase only if not already initialized
  if (!admin.apps.length && firebaseConfig) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else if (admin.apps.length) {
    console.log('ℹ️ Firebase already initialized');
  }

} catch (error) {
  console.error('\n❌ FIREBASE INITIALIZATION FAILED:', error.message);
  console.error('👉 For Render.com: Ensure all FIREBASE_* environment variables are set');
  console.error('👉 For Local Dev: Place serviceAccountKey.json in config folder\n');
  
  // Don't crash the app, but log the error
  if (process.env.NODE_ENV === 'production') {
    throw error; // Crash in production if Firebase fails
  }
}

module.exports = admin;





// const admin = require('firebase-admin');
// const path = require('path');

// try {
//   // 1. Load the service account key
//   // This file must exist at D:\reals2chat_backend-main\config\serviceAccountKey.json
//   const serviceAccount = require('./serviceAccountKey.json');

//   // 2. Initialize Firebase only if not already initialized
//   if (!admin.apps.length) {
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount)
//     });
//     console.log('✅ Firebase Admin SDK initialized successfully');
//   }
// } catch (error) {
//   if (error.code === 'MODULE_NOT_FOUND') {
//     console.error('\n❌ CRITICAL ERROR: serviceAccountKey.json IS MISSING!');
//     console.error('👉 Please put the file here: ' + path.join(__dirname, 'serviceAccountKey.json'));
//     console.error('👉 Download it from Firebase Console > Project Settings > Service Accounts\n');
//   } else {
//     console.error('❌ Firebase Admin SDK initialization error:', error);
//   }
// }

// module.exports = admin;



