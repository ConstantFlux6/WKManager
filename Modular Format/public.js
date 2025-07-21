// public.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";

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

const exportBtn = document.getElementById("exportBtn");
const modal = document.getElementById("exportModal");
const closeBtn = document.querySelector(".modal-close");
const shiftBtns = document.querySelectorAll(".modal-option");

exportBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

shiftBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const shift = btn.dataset.shift;
    modal.classList.add("hidden");
    handleExport(shift);
  });
});

async function handleExport(shift) {
  const assignments = [];

  if (shift === "shift1" || shift === "both") {
    const snap1 = await getDocs(collection(db, "assignments"));
    const doc1 = snap1.docs.find(doc => doc.id === "shift1");
    if (doc1) assignments.push({ title: "Shift 1", players: doc1.data().players });
  }

  if (shift === "shift2" || shift === "both") {
    const snap2 = await getDocs(collection(db, "assignments"));
    const doc2 = snap2.docs.find(doc => doc.id === "shift2");
    if (doc2) assignments.push({ title: "Shift 2", players: doc2.data().players });
  }

  if (assignments.length === 0) return;
  renderForExport(assignments);
}

function renderForExport(assignments) {
  const container = document.createElement("div");
  container.style.padding = "1rem";
  container.style.background = getComputedStyle(document.body).backgroundColor;
  container.style.color = getComputedStyle(document.body).color;
  container.style.fontFamily = 'Roboto, sans-serif';
  container.style.width = "fit-content";

  assignments.forEach(group => {
    const title = document.createElement("h2");
    title.textContent = group.title;
    container.appendChild(title);

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.marginBottom = "2rem";
    table.style.border = "1px solid #666";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Alliance</th>
          <th>Troop</th>
          <th>Tier</th>
          <th>March</th>
          <th>Rally</th>
          <th>Total</th>
          <th>Captain</th>
          <th>Backup</th>
          <th>Turret</th>
        </tr>
      </thead>
      <tbody>
        ${group.players.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.alliance}</td>
            <td>${p.troopType}</td>
            <td>${p.troopTier}</td>
            <td>${p.marchSize}</td>
            <td>${p.rallySize}</td>
            <td>${(+p.marchSize + +p.rallySize) || 0}</td>
            <td>${p.captain ? "✔" : ""}</td>
            <td>${p.backup ? "✔" : ""}</td>
            <td>${p.turret || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
    container.appendChild(table);
  });

  document.body.appendChild(container);

  html2canvas(container).then(canvas => {
    const link = document.createElement("a");
    link.download = "wk_roster.png";
    link.href = canvas.toDataURL();
    link.click();
    document.body.removeChild(container);
  });
}
