// shift2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast } from "./common.js";

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
  renderTable(shiftPlayers);
}

function renderTable(players) {
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
        <th>Backup</th>
        <th>Joiner</th>
        <th>Assigned To</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  container.appendChild(table);

  const tbody = table.querySelector("tbody");
  let currentPlayers = [...players];

  function populateRows(data) {
    tbody.innerHTML = "";
    data.forEach(player => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${player.name}</td>
        <td>${player.troopType}</td>
        <td>${player.troopTier}</td>
        <td>${player.marchSize}</td>
        <td>${player.rallySize}</td>
        <td><input type="checkbox" class="captain" /></td>
        <td><input type="checkbox" class="backup" /></td>
        <td><input type="checkbox" class="joiner" /></td>
        <td>
          <select>
            <option value="">Unassigned</option>
            <option value="Hub">Hub</option>
            <option value="North">North</option>
            <option value="East">East</option>
            <option value="South">South</option>
            <option value="West">West</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function sortAndRender(mode) {
    const sorted = [...currentPlayers].sort((a, b) => {
      if (mode === "name") return a.name.localeCompare(b.name);
      return (b.rallySize || 0) - (a.rallySize || 0);
    });
    populateRows(sorted);
  }

  sortAndRender("rallySize");

  document.getElementById("sortMode").addEventListener("change", e => {
    sortAndRender(e.target.value);
  });

  document.getElementById("saveShift").addEventListener("click", () => {
    showToast("Save not yet implemented.");
  });
}
