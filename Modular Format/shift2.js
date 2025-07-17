// shift2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { assignColor, showToast } from "./common.js";

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
let captainCount = 0;

window.addEventListener("DOMContentLoaded", () => {
  loadShiftData();
  document.getElementById("saveShift2").addEventListener("click", saveShiftData);
});

async function loadShiftData() {
  let data = [];

  try {
    const cached = localStorage.getItem("cachedSubmissions");
    if (cached) {
      data = JSON.parse(cached);
      console.log("Loaded submissions from localStorage");
    } else if (window.fullData && Array.isArray(window.fullData)) {
      data = window.fullData;
      console.log("Loaded submissions from window.fullData");
    } else {
      const snap = await getDocs(collection(db, "submissions"));
      data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched submissions from Firestore");
    }
  } catch (err) {
    console.error("Failed to load submissions", err);
    return;
  }

  let assigned = {};
  try {
    const assignSnap = await getDoc(doc(db, "assignments", "shift2"));
    assigned = assignSnap.exists() ? Object.fromEntries(assignSnap.data().players.map(p => [p.name, p])) : {};
  } catch (e) {
    console.warn("No previous assignments found.");
  }

  const tbody = document.querySelector("#shiftTable tbody");
  tbody.innerHTML = "";
  captainCount = 0;

  const filtered = data.filter(d => d.shift === "End" || d.shift === "Start till End");

  for (const row of filtered) {
    const total = (+row.marchSize || 0) + (+row.rallySize || 0);
    const prev = assigned[row.name] || {};

    const tr = document.createElement("tr");
    const assignedTurret = prev.turret || "";

    tr.innerHTML = `
      <td><input disabled value="${row.name}" /></td>
      <td><input disabled value="${row.alliance}" style="color:${assignColor(row.alliance, 'alliance')}" /></td>
      <td><input disabled value="${row.troopType}" style="color:${assignColor(row.troopType, 'troop')}" /></td>
      <td><input disabled value="${row.troopTier}" /></td>
      <td><input disabled value="${row.marchSize}" /></td>
      <td><input disabled value="${row.rallySize}" /></td>
      <td>${total}</td>
      <td><input type="checkbox" class="captain" ${prev.captain ? "checked" : ""} /></td>
      <td><input type="checkbox" class="backup" ${prev.backup ? "checked" : ""} /></td>
      <td><input type="checkbox" class="joiner" ${prev.joiner ? "checked" : ""} /></td>
      <td>
        <select class="turretSelect">
          <option value="" ${assignedTurret === "" ? "selected" : ""}></option>
          <option value="Hub" ${assignedTurret === "Hub" ? "selected" : ""}>Hub</option>
          <option value="North" ${assignedTurret === "North" ? "selected" : ""}>North</option>
          <option value="East" ${assignedTurret === "East" ? "selected" : ""}>East</option>
          <option value="South" ${assignedTurret === "South" ? "selected" : ""}>South</option>
          <option value="West" ${assignedTurret === "West" ? "selected" : ""}>West</option>
        </select>
      </td>
    `;

    tbody.appendChild(tr);
    if (prev.captain) captainCount++;
  }

  document.querySelectorAll(".captain").forEach(cb => {
    cb.addEventListener("change", () => {
      captainCount += cb.checked ? 1 : -1;
      if (captainCount > 5) {
        cb.checked = false;
        captainCount--;
        showToast("Only 5 captains allowed");
      }
    });
  });
}

async function saveShiftData() {
  const rows = document.querySelectorAll("#shiftTable tbody tr");
  const result = [];

  rows.forEach(row => {
    const inputs = row.querySelectorAll("input");
    const turret = row.querySelector("select")?.value || "";
    result.push({
      name: inputs[0].value,
      alliance: inputs[1].value,
      troopType: inputs[2].value,
      troopTier: inputs[3].value,
      marchSize: inputs[4].value,
      rallySize: inputs[5].value,
      total: row.children[6].textContent,
      captain: inputs[6].checked,
      backup: inputs[7].checked,
      joiner: inputs[8].checked,
      turret
    });
  });
A
  try {
    await setDoc(doc(db, "assignments", "shift2"), { players: result });
    showToast("✅ Shift 2 assignments saved.");
  } catch (err) {
    showToast("❌ Failed to save shift.");
    console.error(err);
  }
}
