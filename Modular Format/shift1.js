// shift1.js
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
let fullData = [];
let assigned = {};

window.addEventListener("DOMContentLoaded", () => {
  loadShiftData();
  document.getElementById("saveShift1").addEventListener("click", saveShiftData);
  document.getElementById("sortBy").addEventListener("change", loadShiftData);
  document.getElementById("toggleSortDir").addEventListener("click", () => {
    const btn = document.getElementById("toggleSortDir");
    btn.textContent = btn.textContent.includes("↓") ? "↑" : "↓";
    loadShiftData();
  });
  window.addEventListener("reloadShift1", loadShiftData);
});

async function loadShiftData() {
  if (!fullData.length) {
    const snap = await getDocs(collection(db, "submissions"));
    fullData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  try {
    const assignSnap = await getDoc(doc(db, "assignments", "shift1"));
    assigned = assignSnap.exists() ? Object.fromEntries(assignSnap.data().players.map(p => [p.name, p])) : {};
  } catch (e) {
    console.warn("No previous assignments found.");
  }

  const tbody = document.querySelector("#shiftTable tbody");
  tbody.innerHTML = "";
  captainCount = 0;

  const filterValue = document.getElementById("troopFilter").value;
  const filtered = fullData.filter(d => {
    const shiftMatch = d.shift === "Start" || d.shift === "Start till End";
    const typeMatch = filterValue === "all" || d.troopType === filterValue;
    return shiftMatch && typeMatch;
  });

  const sortKey = document.getElementById("sortBy").value;
  const desc = document.getElementById("toggleSortDir").textContent.includes("↑");

  filtered.sort((a, b) => {
    const aVal = a[sortKey] || "";
    const bVal = b[sortKey] || "";
    const aNum = +aVal;
    const bNum = +bVal;
    if (!isNaN(aNum) && !isNaN(bNum)) return desc ? bNum - aNum : aNum - bNum;
    return desc ? bVal.toString().localeCompare(aVal) : aVal.toString().localeCompare(bVal);
  });

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

  try {
    await setDoc(doc(db, "assignments", "shift1"), { players: result });
    showToast("✅ Shift 1 assignments saved.");
  } catch (err) {
    showToast("❌ Failed to save shift.");
    console.error(err);
  }
}
