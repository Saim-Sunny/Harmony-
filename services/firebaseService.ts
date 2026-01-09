
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// NOTE: In a real production app, these should be environment variables.
// For this environment, we provide a placeholder config.
const firebaseConfig = {
  apiKey: "AIzaSyAs-PLACEHOLDER-KEY",
  authDomain: "project-harmony-planner.firebaseapp.com",
  projectId: "project-harmony-planner",
  storageBucket: "project-harmony-planner.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
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
  try {
    const userDoc = doc(db, "users", userId);
    await setDoc(userDoc, data, { merge: true });
  } catch (error) {
    console.error("Error saving user data", error);
  }
};

export const getUserData = async (userId: string) => {
  try {
    const userDoc = doc(db, "users", userId);
    const snap = await getDoc(userDoc);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Error getting user data", error);
    return null;
  }
};
