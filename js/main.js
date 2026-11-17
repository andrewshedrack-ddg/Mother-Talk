// main.js
// Tabs, switching between views, the buttons that live outside the
// story and colouring code, and the startup steps. This file loads
// last, after storage, progress, stories, colouring and board.

// The tabs at the top of this side's page. Other views (player,
// quiz, done) hide the tabs while they are shown. The list is read
// from the page itself, so each side shows only its own tabs.
const TAB_VIEWS = [...document.querySelectorAll(".tab")].map(t => t.dataset.view);

function show(viewId) {
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== viewId; });
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.view === viewId);
  });
  document.querySelector(".tabs").style.display = TAB_VIEWS.includes(viewId) ? "" : "none";
  window.scrollTo(0, 0);
  if (viewId === "view-board") renderBoard();
  if (viewId === "view-color") renderArtGallery();
  if (viewId === "view-dashboard") renderDashboard();
}
document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => show(t.dataset.view));
});

// Speech buttons on the story player.
document.getElementById("btn-hear").addEventListener("click", () => {
  const sc = currentScene(); if (sc && sc.native) speak(sc.native, story._code);
});
document.getElementById("btn-listen").addEventListener("click", () => {
  const sc = currentScene(); if (sc && sc.native) speakNormal(sc.native, story._code);
});
document.getElementById("btn-practise").addEventListener("click", () => {
  const sc = currentScene(); if (sc && sc.native) { speakSlow(sc.native, story._code); const n = document.getElementById("practise-note"); if (n) n.hidden = false; }
});

// Leaving a story stops any speech that is still playing.
document.getElementById("btn-quit").addEventListener("click", () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  show("view-home");
});
document.getElementById("btn-done-home").addEventListener("click", () => show("view-home"));
document.getElementById("brand-home").addEventListener("click", () => show("view-home"));
document.getElementById("btn-start").addEventListener("click", () => {
  document.getElementById("region-boxes").scrollIntoView({ behavior: "smooth" });
});

// Startup. Each step is guarded so one failure cannot stop the rest.
(function boot() {
  try { updateStreak(); } catch (e) {}
  try { refreshBadges(); } catch (e) {}
  try { renderGoal(); } catch (e) {}
  try { loadCatalogue().then(() => {
    // The Languages page can send a learner straight into a story.
    const want = store.get("mt_play_story", "");
    if (!want) return;
    store.set("mt_play_story", "");
    const s = catalogue.find(x => x.id === want);
    if (s) startStory(s);
  }).catch(() => {}); } catch (e) {}
  try { renderTaste(); } catch (e) {}
  try { bindPaint(); } catch (e) {}
  // Logo + modal logo use the embedded data URI from the previous build step.
  const li = document.getElementById("logo-img");
  if (li && !li.src) li.src = LOGO_URI;
  show("view-home");
  if (!store.get("mt_name", "")) {
    document.getElementById("modal-logo").src = logoUri();
    document.getElementById("name-modal").hidden = false;
  }
})();
