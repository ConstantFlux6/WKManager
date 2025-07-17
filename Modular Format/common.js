// common.js
export const assignColor = (() => {
  const troopColors = {
    Fighter: '#ff6b6b',
    Shooter: '#f5dd4b',
    Rider: '#4d9eff'
  };
  function hashToHue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  }
  return (key, type) => {
    if (type === 'alliance') {
      const hue = hashToHue(key);
      return `hsl(${hue}, 70%, 60%)`;
    }
    return troopColors[key] || '#ccc';
  };
})();

export function showToast(message, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

export function getCurrentWK() {
  const base = new Date("2024-07-26");
  const now = new Date();
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const diff = Math.floor((now - base) / (msPerWeek * 2));
  const wkDate = new Date(base.getTime() + diff * 2 * msPerWeek);
  return wkDate.toISOString().split("T")[0];
}  
