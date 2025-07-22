// summaries.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { assignColor } from "./common.js";

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
  loadDataAndRenderSummaries();
});

async function loadDataAndRenderSummaries() {
  const snap = await getDocs(collection(db, "submissions"));
  const data = snap.docs.map(d => d.data());
  renderSummaries(data);
}

function renderSummaries(data) {
  const grid = document.getElementById("summaryGrid");
  if (!grid) return;

  const tierCounts = { T9: 0, T10: 0, T11: 0, T12: 0, T13: 0 };
  const typeCounts = { Fighter: 0, Shooter: 0, Rider: 0 };
  const allianceCounts = {};

  for (const row of data) {
    const tier = row.troopTier;
    const type = row.troopType;
    const alliance = row.alliance;

    if (tier) tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
    if (alliance) allianceCounts[alliance] = (allianceCounts[alliance] || 0) + 1;
  }

  const createGroup = (title, entries, category = null) => {
    let html = `<div class="partition-title">${title}</div><div class="summary-subgrid">`;
    for (const [label, count] of entries) {
      const colorStyle = category ? `style="color:${assignColor(label, category)}"` : "";
      html += `<div class="summary-item"><h3 ${colorStyle}>${label}</h3><div>${count}</div></div>`;
    }
    html += `</div>`;
    return html;
  };

  const totalSubmissionsHTML = `
    <div class="summary-subgrid">
      <div class="partition-title" style="margin: 0rem;">
        <h2 style="padding: 0rem; margin: 0rem;">Total Submissions: ${data.length}</h2>
      </div>
    </div>
  `;

  const tierSection = createGroup("Total Troop Tier", Object.entries(tierCounts));
  const typeSection = createGroup("Troop Types", Object.entries(typeCounts));
  const allianceSection = createGroup("Alliance Count", Object.entries(allianceCounts), "alliance");

  grid.innerHTML = totalSubmissionsHTML + tierSection + typeSection + allianceSection;
}

