// shift1.js (cleaned)
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
let fullData = [];
let assigned = {};

window.addEventListener("DOMContentLoaded", () => {
  loadShiftData();
  document.getElementById("saveShift1").addEventListener("click", saveShiftData);
});

function markSavedStatus(saved) {
  const btn = document.getElementById("saveShift1");
  if (!btn) return;
  if (saved) {
    btn.textContent = "Saved";
    btn.classList.remove("save-pending");
    btn.classList.add("save-complete");
  } else {
    btn.textContent = "Save Work";
    btn.classList.remove("save-complete");
    btn.classList.add("save-pending");
  }
}

function updateInfoBar() {
  const captains = document.querySelectorAll('.captain:checked').length;
  const backups = document.querySelectorAll('.backup:checked').length;
  const total = document.querySelectorAll('tbody tr').length;
  const bar = document.getElementById('infoBar');
  if (bar) {
    bar.innerHTML = `
      <span class="captain-count">${captains}/5 Captain</span> |
      <span class="backup-count">${backups}/10 Backup</span> |
      <span class="joiner-count">${total - 15}/${total - 15} Joiner</span>
    `;
  }
}

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

  const grouped = {
    Fighter: [],
    Shooter: [],
    Rider: []
  };

  for (const row of fullData) {
    const shiftMatch = row.shift === "Start" || row.shift === "Start till End";
    if (grouped[row.troopType] && shiftMatch) grouped[row.troopType].push(row);
  }

  Object.keys(grouped).forEach(type => {
    grouped[type].sort((a, b) => (+b.rallySize || 0) - (+a.rallySize || 0));

    const tbody = document.querySelector(`#table${type} tbody`);
    tbody.innerHTML = "";

    for (const row of grouped[type]) {
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
        <td>
          <div class="turret-options">
            ${["Hub", "North", "Eeast", "South", "West"].map(loc => `
              <label><input type="checkbox" class="turretCheck" data-location="${loc}" 
              ${assignedTurret === loc ? "checked" : ""}/> ${loc}</label>`).join(" ")}
          </div>
        </td>
      `;

      tbody.appendChild(tr);

      const captainCb = tr.querySelector(".captain");
      const backupCb = tr.querySelector(".backup");
      const turretChecks = Array.from(tr.querySelectorAll(".turretCheck"));

      function getCheckedTurret() {
        const checked = turretChecks.find(cb => cb.checked);
        return checked ? checked.dataset.location : "";
      }

      turretChecks.forEach(cb => {
        cb.addEventListener("change", () => {
          if (cb.checked) {
            turretChecks.forEach(other => {
              if (other !== cb) other.checked = false;
            });
          }
          assigned[row.name] = {
            ...assigned[row.name],
            captain: captainCb.checked,
            backup: backupCb.checked,
            turret: getCheckedTurret(),
            ...row
          };
          updateInfoBar();
          markSavedStatus(false);
        });
      });
    }
  });

  updateInfoBar();
  markSavedStatus(true);
}

async function saveShiftData() {
  try {
    await setDoc(doc(db, "assignments", "shift1"), { players: Object.values(assigned) });
    showToast("✅ Shift 1 assignments saved.");
    markSavedStatus(true);
  } catch (err) {
    showToast("❌ Failed to save shift.");
    console.error(err);
  }
}
