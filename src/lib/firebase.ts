import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  indexedDBLocalPersistence, 
  initializeAuth, 
  browserLocalPersistence 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Capacitor } from '@capacitor/core';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const isFirebaseConfigured = !!firebaseConfig.apiKey;

// Connectivity validation
async function testConnection() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { setPersistence, indexedDBLocalPersistence } = await import('firebase/auth');
      await setPersistence(auth, indexedDBLocalPersistence);
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silently handle connectivity issues
  }
}
testConnection();
