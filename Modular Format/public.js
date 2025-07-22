import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
import * as jspdf from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0Rh4J4NwhFItII8knxp1hnmtH9rCHttA",
  authDomain: "pns-bulletin-board.firebaseapp.com",
  projectId: "pns-bulletin-board",
  storageBucket: "pns-bulletin-board.appspot.com",
  messagingSenderId: "837041717725",
  appId: "1:837041717725:web:b249384baf891d5447b634"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const turretOrder = ["North", "West", "Hub", "East", "South"];
const displayArea = document.getElementById("displayArea");

function createTurretCard(turret, data = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "zone";
  wrapper.innerHTML = `
    <h2>${turret} Turret</h2>
    <label>Captain</label>
    <textarea readonly>${data.captain || ""}</textarea>
    <label>Type</label>
    <select disabled>
      <option value="">-- Select Type --</option>
      <option value="Fighters" ${data.type === "Fighters" ? "selected" : ""}>Fighters</option>
      <option value="Shooters" ${data.type === "Shooters" ? "selected" : ""}>Shooters</option>
      <option value="Riders" ${data.type === "Riders" ? "selected" : ""}>Riders</option>
    </select>
    <label>Joiners</label>
    <textarea readonly class="joiners">${data.joiners || ""}</textarea>
  `;
  return wrapper;
}

function renderShift(title, timeLabel, shiftData = {}) {
  const container = document.createElement("div");
  const header = document.createElement("h2");
  header.innerHTML = `${title}<br/><span style="font-size:0.9rem">${timeLabel}</span>`;
  container.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "grid";
  turretOrder.forEach(turret => {
    const section = shiftData[turret] || {};
    grid.appendChild(createTurretCard(turret, section));
  });

  container.appendChild(grid);
  displayArea.appendChild(container);
}

function convertPlayersToTurrets(players = []) {
  const result = {};
  for (const turret of turretOrder) result[turret] = { captain: "", type: "", joiners: "" };

  players.forEach(p => {
    const t = p.turret;
    if (!t || !result[t]) return;

    if (p.captain) result[t].captain = p.name;
    if (!result[t].type && p.troopType) result[t].type = p.troopType + "s";
    if (p.joiner) {
      const line = `${p.name} - ${+p.rallySize || +p.marchSize || 1000}`;
      result[t].joiners += (result[t].joiners ? "\n" : "") + line;
    }
  });

  return result;
}

async function loadRoster() {
  displayArea.innerHTML = "";

  const shiftLabels = [
    { id: "shift1", title: "Turret & Hub Roster - Shift 1", time: "5:00 AM - 9:00 AM local (11:00 - 15:00 UTC)" },
    { id: "shift2", title: "Turret & Hub Roster - Shift 2", time: "9:00 AM - 1:00 PM local (15:00 - 19:00 UTC)" }
  ];

  for (const { id, title, time } of shiftLabels) {
    try {
      const snap = await getDoc(doc(db, "assignments", id));
      const players = snap.exists() ? snap.data().players || [] : [];
      const grouped = convertPlayersToTurrets(players);
      renderShift(title, time, grouped);
    } catch (err) {
      console.error(`Failed to load ${id}:`, err);
      renderShift(title, time); // still show structure
    }
  }
}

function exportAs(format, shiftOption) {
  const clone = displayArea.cloneNode(true);
  clone.style.position = "absolute";
  clone.style.top = "-9999px";
  document.body.appendChild(clone);

  if (format === "png" || format === "pdf") {
    window.html2canvas(clone).then(canvas => {
      if (format === "png") {
        const link = document.createElement("a");
        link.download = "wk_roster.png";
        link.href = canvas.toDataURL();
        link.click();
      } else {
        const pdf = new jspdf.jsPDF({ orientation: "landscape" });
        const img = canvas.toDataURL("image/png");
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(img, "PNG", 0, 0, width, height);
        pdf.save("wk_roster.pdf");
      }
      document.body.removeChild(clone);
    });
  } else if (format === "csv") {
    const rows = [["Shift", "Turret", "Captain", "Type", "Joiner"]];
    document.querySelectorAll("#displayArea > div").forEach((shiftDiv, si) => {
      const shiftName = si === 0 ? "Shift 1" : "Shift 2";
      const turrets = shiftDiv.querySelectorAll(".zone");
      turrets.forEach(turret => {
        const title = turret.querySelector("h2")?.textContent?.replace(" Turret", "");
        const captain = turret.querySelector("textarea")?.value || "";
        const type = turret.querySelector("select")?.value || "";
        const joiners = turret.querySelector(".joiners")?.value?.split("\n") || [""];
        joiners.forEach(j => {
          rows.push([shiftName, title, captain, type, j]);
        });
      });
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wk_roster.csv";
    a.click();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadRoster();

  document.getElementById("layoutToggle").addEventListener("click", () => {
    document.body.classList.toggle("mobile-layout");
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    document.getElementById("exportModal").classList.remove("hidden");
  });

  document.querySelector(".modal-close").addEventListener("click", () => {
    document.getElementById("exportModal").classList.add("hidden");
  });

  document.querySelectorAll(".modal-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const shift = btn.dataset.shift;
      document.getElementById("exportModal").classList.add("hidden");
      exportAs("png", shift);  // default to PNG for now
      exportAs("pdf", shift);
      exportAs("csv", shift);
    });
  });
});
