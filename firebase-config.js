import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const app = initializeApp({
    apiKey: "AIzaSyAD5-oCqWmvrjKD24uSRNqqxoijQnsnqA4",
    authDomain: "mogtam3-1b98f.firebaseapp.com",
    projectId: "mogtam3-1b98f",
    storageBucket: "mogtam3-1b98f.firebasestorage.app",
    messagingSenderId: "948636671408",
    appId: "1:948636671408:web:501b87559ed12ff09a8a75",
    databaseURL: "https://mogtam3-1b98f-default-rtdb.firebaseio.com"
});

export const db = getDatabase(app);
