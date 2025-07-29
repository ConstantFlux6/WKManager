// shift1.js (updated with tier/rally-based troop distribution and summaries)
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
});

function markSavedStatus(saved) {
  const btn = document.getElementById("saveShift1");
  if (!btn) return;
  btn.textContent = saved ? "Saved" : "Save Work";
  btn.classList.toggle("save-complete", saved);
  btn.classList.toggle("save-pending", !saved);
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
          if (cb.checked) turretChecks.forEach(other => { if (other !== cb) other.checked = false });
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
function updateTurretSummariesWithTotals() {
  const zones = ["north", "south", "east", "west", "hub"];
  for (const zone of zones) {
    const textarea = document.getElementById(`${zone}-joiners`);
    const summaryDiv = document.getElementById(`summary-${zone}`);
    if (!textarea || !summaryDiv) continue;

    const lines = textarea.value.split("\n").map(line => line.trim()).filter(Boolean);
    const tierCounts = {};
    let totalTroops = 0;

    for (const line of lines) {
      // Match (T##) and troop count after dash or space
      const tierMatch = line.match(/\(T(\d+)\)/);
      const troopMatch = line.match(/[-–]\s*(\d{3,7})$/);
      
      if (tierMatch) {
        const tier = `T${tierMatch[1]}`;
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      }

      if (troopMatch) {
        totalTroops += parseInt(troopMatch[1], 10);
      }
    }

    const tierText = Object.entries(tierCounts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([tier, count]) => `${tier}: ${count}`)
      .join(" | ");

    summaryDiv.textContent = `${tierText || "No joiners"} | Total Troops: ${totalTroops.toLocaleString()}`;
  }
}


async function autoFillAndSaveRoster() {
  const playersUsed = new Set();
  const fields = {};
  const turrets = ["North", "South", "East", "West"];
  const includeHub = document.getElementById("includeHub")?.checked ?? true;

  const locationMap = {};

  // Step 1: Collect manually selected captains
  for (const loc of [...turrets, "Hub"]) {
    const rows = document.querySelectorAll(`.turretCheck[data-location="${loc}"]:checked`);
    const captains = Array.from(rows).filter(row =>
      row.closest("tr").querySelector(".captain:checked")
    ).map(row => {
      const tr = row.closest("tr");
      return {
        name: tr.children[0].querySelector("input").value,
        troopType: tr.children[2].querySelector("input").value,
        troopTier: tr.children[3].querySelector("input").value,
        marchSize: +(tr.children[4].querySelector("input").value || 0),
        rallySize: +(tr.children[5].querySelector("input").value || 0),
      };
    });

    if (captains.length > 0) {
      locationMap[loc] = captains[0];
      playersUsed.add(captains[0].name);
    }
  }

  if (!includeHub) delete locationMap.Hub;

  // Step 2: Group turrets by troop type
  const troopTypeGroups = {};
  for (const [loc, captain] of Object.entries(locationMap)) {
    const type = captain.troopType;
    if (!troopTypeGroups[type]) troopTypeGroups[type] = [];
    troopTypeGroups[type].push({ loc, captain });
  }

  const tierOrder = ["T13", "T12", "T11", "T10", "T9"];

  for (const [troopType, turretList] of Object.entries(troopTypeGroups)) {
    const eligible = fullData.filter(p =>
      !playersUsed.has(p.name) &&
      p.troopType === troopType &&
      (p.shift === "Start" || p.shift === "Start till End")
    );

    // Step 3: Sort players by tier
    const tierBuckets = Object.fromEntries(tierOrder.map(t => [t, []]));
    for (const p of eligible) {
      const tier = p.troopTier?.toUpperCase();
      if (tierBuckets[tier]) tierBuckets[tier].push(p);
    }
    tierOrder.forEach(t => tierBuckets[t].sort((a, b) => (+b.rallySize || 0) - (+a.rallySize || 0)));

    // Step 4: Round-robin assign players across turrets
    const turretAssignments = turretList.map(t => ({
      loc: t.loc,
      captain: t.captain,
      assigned: []
    }));

    for (const tier of tierOrder) {
      const pool = tierBuckets[tier];
      let i = 0;
      while (pool.length) {
        const player = pool.shift();
        let assigned = false;
        for (let attempts = 0; attempts < turretAssignments.length; attempts++) {
          const target = turretAssignments[i % turretAssignments.length];
          if (!target.assigned.find(p => p.name === player.name)) {
            target.assigned.push({
              name: player.name,
              troopTier: tier,
              rawPlayer: player
            });
            playersUsed.add(player.name);
            assigned = true;
            break;
          }
          i++;
        }
        if (!assigned) break;
        i++;
      }
    }

    // Step 5: Assign troop counts per turret
    for (const turret of turretAssignments) {
      const { loc, captain, assigned } = turret;
      const rallyCap = captain.rallySize || 0;
      const t9s = assigned.filter(p => p.troopTier === "T9");
      const others = assigned.filter(p => p.troopTier !== "T9");

      const fixedT9Total = t9s.length * 1000;
      const remaining = Math.max(0, rallyCap - fixedT9Total);
      const perOther = others.length > 0 ? Math.floor(remaining / others.length) : 0;

      // Set final send values
      assigned.forEach(p => {
        p.send = p.troopTier === "T9" ? 1000 : perOther;
      });

      // Output fields
      const capKey = loc.toLowerCase() + "-captain";
      const typeKey = loc.toLowerCase() + "-type";
      const joinerKey = loc.toLowerCase() + "-joiners";

      fields[capKey] = `${captain.name} - ${captain.marchSize}`;
      fields[typeKey] = troopType + "s";
      fields[joinerKey] = assigned.map(p =>
        `${p.name} (${p.troopTier}) - ${p.send}`
      ).join("\n");

      // Summary
      const summaryDiv = document.getElementById(`summary-${loc.toLowerCase()}`);
      if (summaryDiv) {
        const tierCounts = {};
        let total = 0;
        for (const p of assigned) {
          tierCounts[p.troopTier] = (tierCounts[p.troopTier] || 0) + 1;
          total += p.send;
        }
        const summaryLines = [`Total Troops: ${total.toLocaleString()}`];
        for (const t of tierOrder) {
          if (tierCounts[t]) summaryLines.push(`${t}: ${tierCounts[t]}`);
        }
        summaryDiv.innerHTML = summaryLines.join("<br>");
      }
    }
  }

  try {
    await setDoc(doc(db, "roster", "turrets"), fields);
    showToast("✅ Roster autofilled and saved.");
  } catch (err) {
    showToast("❌ Failed to save roster.");
    console.error(err);
  }

  updateTurretSummariesWithTotals();
}
