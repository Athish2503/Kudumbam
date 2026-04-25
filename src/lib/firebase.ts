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

// Initialize Auth with persistence based on platform
export const auth = Capacitor.isNativePlatform() 
  ? initializeAuth(app, {
      persistence: browserLocalPersistence
    })
  : getAuth(app);

export const isFirebaseConfigured = !!firebaseConfig.apiKey;

// Connectivity validation
async function testConnection() {
  try {
    // Only perform a small fetch to verify DB connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silently handle connectivity issues
  }
}
testConnection();
