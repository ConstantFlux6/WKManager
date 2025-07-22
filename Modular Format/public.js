// public.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, getDoc, doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
import * as jspdf from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";

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
const layoutToggle = document.getElementById("layoutToggle");
const displayArea = document.getElementById("displayArea");
let currentLayout = "desktop";

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

layoutToggle.addEventListener("click", () => {
  currentLayout = currentLayout === "desktop" ? "mobile" : "desktop";
  layoutToggle.textContent = `Switch to ${currentLayout === "desktop" ? "Mobile" : "Desktop"} Layout`;
  loadAndDisplay("both");
});

window.addEventListener("DOMContentLoaded", () => loadAndDisplay("both"));

async function loadAndDisplay(shift) {
  const assignments = [];

  if (shift === "shift1" || shift === "both") {
    const doc1 = await getDoc(doc(db, "assignments", "shift1"));
    if (doc1.exists()) assignments.push({ title: "Shift 1", players: doc1.data().players });
  }

  if (shift === "shift2" || shift === "both") {
    const doc2 = await getDoc(doc(db, "assignments", "shift2"));
    if (doc2.exists()) assignments.push({ title: "Shift 2", players: doc2.data().players });
  }

  displayArea.innerHTML = "";
  assignments.forEach(group => {
    const section = document.createElement("section");
    section.className = `shift-section ${currentLayout}`;

    const title = document.createElement("h2");
    title.textContent = group.title;
    section.appendChild(title);

    const turrets = ["H", "N", "E", "S", "W"];
    const turretContainers = {};

    turrets.forEach(t => {
      const div = document.createElement("div");
      div.className = `turret ${t}`;
      const heading = document.createElement("h3");
      heading.textContent = turretLabel(t);
      div.appendChild(heading);
      const ul = document.createElement("ul");
      div.appendChild(ul);
      section.appendChild(div);
      turretContainers[t] = ul;
    });

    group.players.forEach(p => {
      if (!p.turret) return;
      const li = document.createElement("li");
      li.className = `tier-${p.troopTier?.toLowerCase()}`;
      li.innerHTML = `<strong>${p.name}</strong> (${p.alliance})<br>
        ${p.troopType} T${p.troopTier}<br>
        March: ${p.marchSize}, Rally: ${p.rallySize}<br>
        ${p.captain ? "Captain" : p.backup ? "Backup" : "Joiner"}`;
      turretContainers[p.turret]?.appendChild(li);
    });

    displayArea.appendChild(section);
  });
}

function turretLabel(t) {
  return t === "H" ? "Hub" : t === "N" ? "North" : t === "S" ? "South" : t === "E" ? "East" : "West";
}

async function handleExport(shift) {
  const assignments = [];

  if (shift === "shift1" || shift === "both") {
    const doc1 = await getDoc(doc(db, "assignments", "shift1"));
    if (doc1.exists()) assignments.push({ title: "Shift 1", players: doc1.data().players });
  }

  if (shift === "shift2" || shift === "both") {
    const doc2 = await getDoc(doc(db, "assignments", "shift2"));
    if (doc2.exists()) assignments.push({ title: "Shift 2", players: doc2.data().players });
  }

  if (assignments.length === 0) return;
  renderForExport(assignments);
  exportToCSV(assignments);
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

  window.html2canvas(container).then(canvas => {
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jspdf.jsPDF({ orientation: "landscape" });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save("wk_roster.pdf");

    const pngLink = document.createElement("a");
    pngLink.download = "wk_roster.png";
    pngLink.href = imgData;
    pngLink.click();

    document.body.removeChild(container);
  });
}

function exportToCSV(assignments) {
  let csv = "Shift,Name,Alliance,Troop,Tier,March,Rally,Total,Captain,Backup,Turret\n";
  assignments.forEach(group => {
    group.players.forEach(p => {
      const row = [
        group.title,
        p.name,
        p.alliance,
        p.troopType,
        p.troopTier,
        p.marchSize,
        p.rallySize,
        (+p.marchSize + +p.rallySize) || 0,
        p.captain ? "Yes" : "",
        p.backup ? "Yes" : "",
        p.turret || ""
      ];
      csv += row.map(val => `"${val}"`).join(",") + "\n";
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "wk_roster.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
