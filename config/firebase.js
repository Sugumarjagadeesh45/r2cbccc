// const admin = require('firebase-admin');

// // Initialize Firebase Admin SDK
// try {
//   const serviceAccount = {
//     type: process.env.FIREBASE_TYPE,
//     project_id: process.env.FIREBASE_PROJECT_ID,
//     private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
//     private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
//     client_email: process.env.FIREBASE_CLIENT_EMAIL,
//     client_id: process.env.FIREBASE_CLIENT_ID,
//     auth_uri: process.env.FIREBASE_AUTH_URI,
//     token_uri: process.env.FIREBASE_TOKEN_URI,
//     auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
//     client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
//   };

//   if (!admin.apps.length) {
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount)
//     });
//     console.log('✅ Firebase Admin SDK initialized successfully');
//   }
// } catch (error) {
//   console.error('❌ Firebase Admin SDK initialization error:', error);
// }

// module.exports = admin;



const admin = require('firebase-admin');
const path = require('path');

try {
  // 1. Load the service account key
  // This file must exist at D:\reals2chat_backend-main\config\serviceAccountKey.json
  const serviceAccount = require('./serviceAccountKey.json');

  // 2. Initialize Firebase only if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\n❌ CRITICAL ERROR: serviceAccountKey.json IS MISSING!');
    console.error('👉 Please put the file here: ' + path.join(__dirname, 'serviceAccountKey.json'));
    console.error('👉 Download it from Firebase Console > Project Settings > Service Accounts\n');
  } else {
    console.error('❌ Firebase Admin SDK initialization error:', error);
  }
}

module.exports = admin;





// const admin = require("firebase-admin");

// const serviceAccount = {
//   type: process.env.FIREBASE_TYPE,
//   project_id: process.env.FIREBASE_PROJECT_ID,
//   private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
//   private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
//   client_email: process.env.FIREBASE_CLIENT_EMAIL,
//   client_id: process.env.FIREBASE_CLIENT_ID,
//   auth_uri: process.env.FIREBASE_AUTH_URI,
//   token_uri: process.env.FIREBASE_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
//   universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
// };

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// module.exports = admin;
