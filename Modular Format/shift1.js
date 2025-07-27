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
            ${["Hub", "North", "East", "South", "West"].map(loc => `
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

const autofillBtn = document.getElementById("autofillShift1");
autofillBtn.addEventListener("click", async () => {
  autofillBtn.disabled = true;
  autofillBtn.textContent = "Filling...";
  try {
    await autoFillAndSaveRoster();
  } finally {
    autofillBtn.disabled = false;
    autofillBtn.textContent = "Autofill Roster";
  }
});

async function autoFillAndSaveRoster() {
  const playersUsed = new Set();
  const fields = {};
  const turrets = ["North", "South", "East", "West"];
  const includeHub = document.getElementById("includeHub")?.checked ?? true;

  const locationMap = {};

  // STEP 1: Collect captains manually selected
  for (const loc of [...turrets, "Hub"]) {
    const rows = document.querySelectorAll(`.turretCheck[data-location="${loc}"]:checked`);
    const captains = Array.from(rows).filter(row =>
      row.closest("tr").querySelector(".captain:checked")
    ).map(row => {
      const tr = row.closest("tr");
      const name = tr.children[0].querySelector("input").value;
      const troopType = tr.children[2].querySelector("input").value;
      const troopTier = tr.children[3].querySelector("input").value;
      const march = +(tr.children[4].querySelector("input").value || 0);
      const rally = +(tr.children[5].querySelector("input").value || 0);
      return { name, troopType, troopTier, marchSize: march, rallySize: rally };
    });

    if (captains.length > 0) {
      locationMap[loc] = captains[0];
      playersUsed.add(captains[0].name);
    }
  }

  if (!includeHub) delete locationMap.Hub;

  // STEP 2: Group turrets by troop type
  const troopTypeGroups = {};
  for (const [loc, captain] of Object.entries(locationMap)) {
    const type = captain.troopType;
    if (!troopTypeGroups[type]) troopTypeGroups[type] = [];
    troopTypeGroups[type].push({ loc, captain });
  }

  // STEP 3: For each troop type, distribute shared joiner pool
  for (const [troopType, turretList] of Object.entries(troopTypeGroups)) {
    const totalJoinersNeeded = turretList.length * 29;

    // Shared eligible joiners
    const eligible = fullData.filter(p =>
      !playersUsed.has(p.name) &&
      p.troopType === troopType &&
      (p.shift === "Start" || p.shift === "Start till End")
    );

    const t10plus = eligible.filter(p => {
      const tier = +(p.troopTier?.replace("T", "") || 0);
      return tier >= 10;
    }).sort((a, b) => (+b.rallySize || 0) - (+a.rallySize || 0));

    const t9 = eligible.filter(p => p.troopTier === "T9");

    const joiners = [];
    let needed = totalJoinersNeeded * 100000;

    for (const p of t10plus) {
      if (joiners.length >= totalJoinersNeeded) break;
      const max = +p.marchSize || 0;
      const target = Math.ceil(needed / (totalJoinersNeeded - joiners.length));
      const send = Math.min(max, target);
      joiners.push({ name: p.name, troopTier: p.troopTier, send });
      playersUsed.add(p.name);
      needed -= send;
      if (needed <= 0) break;
    }

    if (needed > 0) {
      for (const p of t9) {
        if (joiners.length >= totalJoinersNeeded) break;
        const send = Math.min(+p.marchSize || 0, 1000);
        if (send > 0) {
          joiners.push({ name: p.name, troopTier: p.troopTier, send });
          playersUsed.add(p.name);
          needed -= send;
        }
        if (needed <= 0) break;
      }
    }

    // Distribute joiners evenly across turrets with same type
    turretList.forEach(({ loc, captain }, index) => {
      const capKey = loc.toLowerCase() + "-captain";
      const typeKey = loc.toLowerCase() + "-type";
      const joinerKey = loc.toLowerCase() + "-joiners";

      fields[capKey] = `${captain.name} - ${captain.marchSize}`;
      fields[typeKey] = troopType + "s";

      if (loc === "Hub") {
        fields[joinerKey] = "";
        return;
      }

      const chunk = joiners.slice(index * 29, (index + 1) * 29);
      fields[joinerKey] = chunk.map(p => `${p.name} (${p.troopTier}) - ${p.send}`).join("\n");

// Compute summary
const tierCounts = {};
let total = 0;
chunk.forEach(p => {
  const tier = p.troopTier;
  tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  total += p.send;
});

// Build readable summary
const lines = [`Total Troops: ${total.toLocaleString()}`];
for (const tier of ["T13", "T12", "T11", "T10", "T9"]) {
  if (tierCounts[tier]) {
    lines.push(`${tier}: ${tierCounts[tier]}`);
  }
}

// Show on page
const summaryDiv = document.getElementById(`summary-${loc.toLowerCase()}`);
if (summaryDiv) {
  summaryDiv.innerHTML = lines.join("<br>");
}
    });
  }

  try {
    await setDoc(doc(db, "roster", "turrets"), fields);
    showToast("✅ Roster autofilled and saved.");
  } catch (err) {
    showToast("❌ Failed to save roster.");
    console.error(err);
  }
}