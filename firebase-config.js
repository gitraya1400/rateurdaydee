// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCi__dxnREoUYqjgklElumTELG2eJp1r_0",
  authDomain: "howsureday.firebaseapp.com",
  projectId: "howsureday",
  storageBucket: "howsureday.firebasestorage.com",
  messagingSenderId: "1055749509398",
  appId: "1:1055749509398:web:e0a720bb77401b76b38037",
  measurementId: "G-P3M6GZ4ZRG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, db };
