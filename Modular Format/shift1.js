// shift1.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { assignColor } from "./common.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0Rh4J4NwhFItII8knxp1hnmtH9rCHttA",
  authDomain: "pns-bulletin-board.firebaseapp.com",
  projectId: "pns-bulletin-board",
  storageBucket: "pns-bulletin-board.firebasestorage.app",
  messagingSenderId: "837041717725",
  appId: "1:837041717725:web:b249384baf891d5447b634"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.addEventListener("DOMContentLoaded", () => {
  loadShiftData();
});

async function loadShiftData() {
  const snap = await getDocs(collection(db, "submissions"));
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const tbody = document.querySelector("#shiftTable tbody");
  tbody.innerHTML = "";

  const filtered = data.filter(d =>
    d.shift === "start" || d.shift === "start till end"
  );

  for (const row of filtered) {
    const tr = document.createElement("tr");
    const total = (+row.marchSize || 0) + (+row.rallySize || 0);

    tr.innerHTML = `
      <td><input disabled value="${row.name}" /></td>
      <td><input disabled value="${row.alliance}" style="color:${assignColor(row.alliance, 'alliance')}" /></td>
      <td><input disabled value="${row.troopType}" style="color:${assignColor(row.troopType, 'troop')}" /></td>
      <td><input disabled value="${row.troopTier}" /></td>
      <td><input disabled value="${row.marchSize}" /></td>
      <td><input disabled value="${row.rallySize}" /></td>
      <td>${total}</td>
    `;

    tbody.appendChild(tr);
  }
}
