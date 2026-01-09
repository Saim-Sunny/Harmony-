
import { initializeApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Firebase configuration for the Harmony Planner application
const firebaseConfig = {
  apiKey: "AIzaSyAs-PLACEHOLDER-KEY",
  authDomain: "project-harmony-planner.firebaseapp.com",
  projectId: "project-harmony-planner",
  storageBucket: "project-harmony-planner.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let app: FirebaseApp;

try {
  // Fix for line 2: Separating type and value imports ensures compatibility with different module resolution settings
  // and fixes the "no exported member" error for initializeApp, getApps, and FirebaseApp.
  const activeApps = getApps();
  if (!activeApps.length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = activeApps[0];
  }
} catch (e) {
  console.warn("Firebase initialization failed.", e);
}

export const auth = getAuth(app!);
export const db = getFirestore(app!);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const saveUserData = async (userId: string, data: any) => {
  if (!db) return;
  try {
    const userDoc = doc(db, "users", userId);
    await setDoc(userDoc, data, { merge: true });
  } catch (error) {
    console.error("Error saving user data", error);
  }
};

export const getUserData = async (userId: string) => {
  if (!db) return null;
  try {
    const userDoc = doc(db, "users", userId);
    const snap = await getDoc(userDoc);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Error getting user data", error);
    return null;
  }
};
