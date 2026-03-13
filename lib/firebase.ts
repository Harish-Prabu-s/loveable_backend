import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

// Helper to get ID Token
export const getAuthToken = async (): Promise<string | undefined> => {
  return auth.currentUser?.getIdToken();
};

// Helper to get Current User
export const getCurrentUser = async () => {
  return auth.currentUser;
};
