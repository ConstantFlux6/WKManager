// submissions.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, updateDoc, deleteDoc, doc
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

window.addEventListener("DOMContentLoaded", () => {
  loadSubmissions();
  setupSort();
});

async function loadSubmissions() {
  const snap = await getDocs(collection(db, "submissions"));
  const tbody = document.querySelector("#submissionsTable tbody");
  tbody.innerHTML = "";
  window.fullData = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    window.fullData.push({ ...data, id });
    const tr = document.createElement("tr");

    const total = (+data.marchSize || 0) + (+data.rallySize || 0);
    const dateStr = data.timestamp?.toDate?.().toLocaleString?.() || "N/A";

    tr.innerHTML = `
      <td><input disabled value="${data.name}" /></td>
      <td><input value="${data.alliance || ''}" disabled /></td>
      <td><input value="${data.troopType || ''}" disabled /></td>
      <td><input value="${data.troopTier || ''}" disabled /></td>
      <td><input value="${data.marchSize || ''}" disabled /></td>
      <td><input value="${data.rallySize || ''}" disabled /></td>
      <td>${total}</td>
      <td><input value="${data.shift || ''}" disabled /></td>
      <td>${dateStr}</td>
      <td><button class="edit-btn">Edit</button></td>
    `;

    const inputs = tr.querySelectorAll("input");
    const editBtn = tr.querySelector(".edit-btn");
    let deleteBtn;

    editBtn.addEventListener("click", async () => {
      const isEditing = editBtn.textContent === "Save";
      const inputArr = Array.from(tr.querySelectorAll("input"));
      if (isEditing) {
        const [name, alliance, troopType, troopTier, march, rally, shift] = inputArr.map(i => i.value);
        try {
          await updateDoc(doc(db, "submissions", id), {
            alliance,
            troopType,
            troopTier,
            marchSize: +march,
            rallySize: +rally,
            shift,
          });
          inputArr.forEach(i => i.disabled = true);
          editBtn.textContent = "Edit";
          if (deleteBtn) deleteBtn.remove();
          showToast("Saved successfully.");
        } catch (err) {
          console.error("❌ Failed to save edit:", err);
          showToast("Failed to save. Check console.", 5000);
        }
      } else {
        inputArr.forEach(i => i.disabled = false);
        editBtn.textContent = "Save";
        deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        editBtn.parentElement.appendChild(deleteBtn);

        deleteBtn.addEventListener("click", async () => {
          if (confirm(`Delete ${data.name}'s record?`)) {
            await deleteDoc(doc(db, "submissions", id));
            tr.remove();
          }
        });
      }
    });

    tbody.appendChild(tr);
  }
}

function setupSort() {
  const select = document.getElementById("sortSelect");
  if (!select) return;
  select.addEventListener("change", () => {
    const idx = parseInt(select.value);
    const tbody = document.querySelector("#submissionsTable tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const sorted = rows.sort((a, b) => {
      const aInput = a.children[idx]?.querySelector("input");
      const bInput = b.children[idx]?.querySelector("input");
      const aVal = aInput ? aInput.value.trim() : a.children[idx]?.textContent.trim();
      const bVal = bInput ? bInput.value.trim() : b.children[idx]?.textContent.trim();

      const isNumber = !isNaN(aVal) && !isNaN(bVal);
      return isNumber ? parseFloat(bVal) - parseFloat(aVal) : aVal.localeCompare(bVal);
    });

    tbody.innerHTML = "";
    sorted.forEach(row => tbody.appendChild(row));
  });
}
