import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMUHep7JZnIYSUKI2KFcYkbjPlslXLers",
  authDomain: "thesiscrew-327b4.firebaseapp.com",
  projectId: "thesiscrew-327b4",
  storageBucket: "thesiscrew-327b4.firebasestorage.app",
  messagingSenderId: "593982837578",
  appId: "1:593982837578:web:a044ab9473c4d752bce7b3",
  measurementId: "G-K4VDDLJNY9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);