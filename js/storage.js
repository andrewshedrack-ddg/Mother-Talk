// storage.js
// Saving and loading on this device. Everything a learner earns
// (XP, finished stories, saved paintings) lives in localStorage,
// so it survives closing the browser but stays on one device.

// A tiny wrapper around localStorage. It never throws: if the
// browser blocks storage, or a saved value is broken, the caller
// just gets the fallback value instead of crashing the page.
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const value = JSON.parse(raw);
      return (value === null || value === undefined) ? fallback : value;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
};

// Dates are stored as "2026-11-17" so the streak can compare days.
function dayStr(d) { return d.toISOString().slice(0, 10); }
function todayKey() { return dayStr(new Date()); }
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayStr(d);
}

// Story text and learner names go into the page as HTML, so escape
// them first. This stops a story phrase from breaking the page.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// The logo picture is embedded in the page header. The completion
// screen reuses the same picture.
const LOGO_URI = ""; // filled at boot from the header image
function logoUri() {
  const el = document.getElementById("logo-img");
  return (el && el.src) || "";
}
