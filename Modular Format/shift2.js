// shift2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast, getCurrentWK } from "./common.js";

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
  const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  const shiftPlayers = data.filter(p => {
    const s = p.shift?.toLowerCase();
    return s === 'end' || s === 'start till end';
  });

  const wkDate = getCurrentWK();
  const saved = await getDoc(doc(db, "shift2", wkDate));
  const savedAssignments = saved.exists() ? saved.data().assignments : [];

  renderTable(shiftPlayers, savedAssignments);
}

function renderTable(players, savedAssignments) {
  const container = document.getElementById("shift2Table");
  container.innerHTML = "";

  const sortRow = document.createElement("div");
  sortRow.style.textAlign = "center";
  sortRow.innerHTML = `
    <label for="sortMode">Sort by: </label>
    <select id="sortMode">
      <option value="rallySize">Rally Size (desc)</option>
      <option value="name">Name (asc)</option>
    </select>
    <button id="saveShift">Save</button>
  `;
  container.appendChild(sortRow);

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Troop Type</th>
        <th>Tier</th>
        <th>March</th>
        <th>Rally</th>
        <th>Captain</th>
