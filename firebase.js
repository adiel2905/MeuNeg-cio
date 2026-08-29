import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBb7ScZIecGp9tvhqPYmLKLqN5MUkEe0Lc",
  authDomain: "meunegocio-457f7.firebaseapp.com",
  projectId: "meunegocio-457f7",
  storageBucket: "meunegocio-457f7.firebasestorage.app",
  messagingSenderId: "477816481415",
  appId: "1:477816481415:web:ad91e00de512669ebdba22"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
