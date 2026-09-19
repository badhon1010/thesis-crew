import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRequests() {
  const querySnapshot = await getDocs(collection(db, "joinRequests"));
  console.log("Found requests:", querySnapshot.size);
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data().requestType, doc.data().status);
  });
}

checkRequests().then(() => process.exit(0)).catch(console.error);
