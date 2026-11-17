// board.js
// The Board (leaderboard), My progress (dashboard), the name the
// learner picks, and the admin demo portal. On the live site all of
// this is stored on the device; the Flask version keeps it in a
// database instead.

// The leaderboard has one row on the live site: the learner themself.
// The Flask version lists every learner from the database.
function renderBoard() {
  const name = store.get("mt_name", "Guest");
  const xp = store.get("mt_xp", 0);
  const streak = store.get("mt_streak", { count: 0 }).count;
  const stories = store.get("mt_done", []).length;
  const art = store.get("mt_colored", []).length;
  document.getElementById("board-name").textContent = name;
  document.getElementById("board-level").textContent = levelFor(xp);
  document.getElementById("board-xp").textContent = xp;
  document.getElementById("board-streak").textContent = streak;
  document.getElementById("board-stories").textContent = stories;
  document.getElementById("board-art").textContent = art;
  const list = document.getElementById("board-list");
  list.innerHTML =
    '<li><span class="rank">1</span><span class="who"><strong>' + escapeHtml(name) +
    "</strong><small>" + escapeHtml(levelFor(xp)) + " · " + streak + "-day streak</small></span>" +
    '<span class="pts">' + xp + " XP</span></li>";
}

// The name box shown on the first visit.
document.getElementById("btn-save-name").addEventListener("click", () => {
  const v = document.getElementById("name-input").value.trim().slice(0, 20);
  store.set("mt_name", v || "Guest");
  document.getElementById("name-modal").hidden = true;
  renderBoard();
});

// My progress: level, XP, daily goal, streak and finished work.
function renderDashboard() {
  const xp = store.get("mt_xp", 0);
  const streak = store.get("mt_streak", { count: 0 }).count;
  const d = store.get("mt_daily", { date: "", xp: 0 });
  const todayXp = (d.date === todayKey()) ? d.xp : 0;
  const nxt = nextLevel(xp);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("dash-level", levelFor(xp));
  set("dash-xp", xp + " XP");
  set("dash-next", nxt ? (nxt[0] - xp) + " XP to " + nxt[1] : "You reached Mzee, the highest level.");
  const fill = document.getElementById("dash-fill"); if (fill) fill.style.width = levelProgress(xp) + "%";
  set("dash-goal", Math.min(todayXp, DAILY_GOAL) + " / " + DAILY_GOAL + " XP today");
  set("dash-streak", streak + "-day streak. " + (streak ? "Come back tomorrow to keep it alive." : "Start today, then come back tomorrow to keep the flame alive."));
  set("dash-done", store.get("mt_done", []).length + " stories finished. " + store.get("mt_colored", []).length + " artworks finished.");
}
