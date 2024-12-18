import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAn_awIxziq4aZp_MiXQLwql68TjhhFW_Y",
  authDomain: "misab-8f184.firebaseapp.com",
  databaseURL: "https://misab-8f184-default-rtdb.firebaseio.com",
  projectId: "misab-8f184",
  storageBucket: "misab-8f184.firebasestorage.app",
  messagingSenderId: "186707298384",
  appId: "1:186707298384:web:1e40566b5776b78fdc2955"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;