import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const firebaseConfig = {
  apiKey: "AIzaSyCGvveg2ZIy_C2QuHmyX7oI3eI0VcFmzo4",
  authDomain: "lovealbe-768b1.firebaseapp.com",
  projectId: "lovealbe-768b1",
  storageBucket: "lovealbe-768b1.firebasestorage.app",
  messagingSenderId: "847902616798",
  appId: "1:847902616798:android:0fbc95c32d095d0869e64f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Helper to get ID Token (works for both Web and Native)
export const getAuthToken = async (): Promise<string | undefined> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await FirebaseAuthentication.getIdToken();
      return result.token;
    } catch (e) {
      console.error("Native Auth Token Error:", e);
      return undefined;
    }
  } else {
    return auth.currentUser?.getIdToken();
  }
};

// Helper to get Current User (works for both Web and Native)
export const getCurrentUser = async () => {
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.getCurrentUser();
    return result.user;
  } else {
    return auth.currentUser;
  }
};
