import * as admin from "firebase-admin";

let _db: admin.database.Database | null = null;

export function getDatabase(): admin.database.Database | null {
  if (_db) return _db;

  if (admin.apps.length > 0) {
    _db = admin.database();
    return _db;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL ?? "https://knowledgethings-cd929-default-rtdb.firebaseio.com";

  if (!serviceAccountJson) {
    console.warn("[Firebase] FIREBASE_SERVICE_ACCOUNT not set — question pool disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL });
    _db = admin.database();
    console.log("[Firebase] Realtime Database initialized");
    return _db;
  } catch (err) {
    console.error("[Firebase] Failed to initialize:", err);
    return null;
  }
}
