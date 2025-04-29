// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCi__dxnREoUYqjgklElumTELG2eJp1r_0",
  authDomain: "howsureday.firebaseapp.com",
  projectId: "howsureday",
  storageBucket: "howsureday.appspot.com", // Updated to correct storage bucket
  messagingSenderId: "1055749509398",
  appId: "1:1055749509398:web:e0a720bb77401b76b38037",
  measurementId: "G-P3M6GZ4ZRG",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

// Initialize Firebase Storage
export const storage = getStorage(app)
