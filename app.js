/* MotherTalk — stories + colouring studio + Duolingo-style gamification.
 * Plain HTML/CSS/JS. Stories in data/*.json, art in coloring-art-*.js,
 * progress in localStorage. Static files only: runs on GitHub Pages.
 */

/* ---------- storage ---------- */
const store = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch (e) { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
};

function dayStr(d) { return d.toISOString().slice(0, 10); }
function todayKey() { return dayStr(new Date()); }
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ---------- logo (embedded) ---------- */
const LOGO_URI = ""; // filled at boot from the header image (set in index via build step)
function logoUri() {
  const el = document.getElementById("logo-img");
  return (el && el.src) || "";
}

/* ---------- XP, levels, streak, daily goal ---------- */
const LEVELS = [
  [0, "Mgeni"], [60, "Mwanafunzi"], [150, "Rafiki"], [300, "Mwalimu"], [600, "Mzee"]
];
const DAILY_GOAL = 30;

function levelFor(xp) {
  let name = LEVELS[0][1];
  for (const [min, n] of LEVELS) if (xp >= min) name = n;
  return name;
}

function addXP(n) {
  store.set("mt_xp", store.get("mt_xp", 0) + n);
  const d = store.get("mt_daily", { date: "", xp: 0 });
  const t = todayKey();
  if (d.date !== t) { d.date = t; d.xp = 0; }
  d.xp += n;
  store.set("mt_daily", d);
  refreshBadges();
  renderGoal();
}

function updateStreak() {
  const s = store.get("mt_streak", { count: 0, last: "" });
  const t = todayKey();
  if (s.last === t) return;                       // already counted today
  s.count = (s.last === yesterdayKey()) ? s.count + 1 : 1;
  s.last = t;
  store.set("mt_streak", s);
}

function refreshBadges() {
  document.getElementById("xp-badge").textContent = store.get("mt_xp", 0) + " XP";
  document.getElementById("streak-badge").innerHTML = "&#128293; " + store.get("mt_streak", {count:0}).count;
}

function renderGoal() {
  const d = store.get("mt_daily", { date: "", xp: 0 });
  const xp = (d.date === todayKey()) ? d.xp : 0;
  document.getElementById("goal-text").textContent = Math.min(xp, DAILY_GOAL) + " / " + DAILY_GOAL + " XP";
  document.getElementById("goal-fill").style.width = Math.min(100, xp / DAILY_GOAL * 100) + "%";
}

/* ---------- views & tabs ---------- */
const TAB_VIEWS = ["view-home", "view-color", "view-board"];
function show(viewId) {
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== viewId; });
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.view === viewId);
  });
  document.querySelector(".tabs").style.display = TAB_VIEWS.includes(viewId) ? "" : "none";
  window.scrollTo(0, 0);
  if (viewId === "view-board") renderBoard();
  if (viewId === "view-color") renderArtGallery();
}
document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => show(t.dataset.view));
});

/* ---------- flags (real images: emoji flags break on Windows) ---------- */
function flagImg(code, cls) {
  return '<img class="flag ' + (cls || "") + '" src="https://flagcdn.com/w40/' +
    escapeHtml(code) + '.png" alt="" loading="lazy">';
}

/* ---------- stories ---------- */
let catalogue = [], story = null, sceneId = null;
let pendingQuizzes = [], quizIndex = 0, runXP = 0, runCorrect = 0, runTotal = 0;

async function loadCatalogue() {
  const res = await fetch("data/stories.json");
  catalogue = await res.json();
  const done = store.get("mt_done", []);
  const grid = document.getElementById("story-grid");
  grid.innerHTML = "";
  catalogue.forEach(s => {
    const card = document.createElement("div");
    card.className = "story-card";
    card.innerHTML =
      '<span class="lang">' + flagImg(s.flag) + escapeHtml(s.language) + "</span>" +
      "<h3>" + escapeHtml(s.title) + "</h3>" +
      "<p>" + escapeHtml(s.description) + "</p>" +
      (done.includes(s.id) ? '<span class="done-tag">Completed</span>' : "");
    card.addEventListener("click", () => startStory(s));
    grid.appendChild(card);
  });
}

async function startStory(meta) {
  const res = await fetch(meta.file);
  story = await res.json();
  story._flag = meta.flag || ""; story._language = meta.language || "";
  runXP = 0; runCorrect = 0; runTotal = 0;
  sceneId = story.start;
  renderScene();
  show("view-player");
}
function currentScene() { return story.scenes[sceneId]; }

function renderScene() {
  const sc = currentScene();
  document.getElementById("scene-character").textContent = sc.character || "";
  document.getElementById("scene-lang").innerHTML = flagImg(story._flag) + escapeHtml(story._language);
  document.getElementById("scene-native").textContent = sc.native || "";
  document.getElementById("scene-translation").textContent = sc.translation || "";
  const cultureEl = document.getElementById("scene-culture");
  cultureEl.textContent = sc.culture ? ("Culture note: " + sc.culture) : "";
  cultureEl.style.display = sc.culture ? "" : "none";
  const replyBox = document.getElementById("reply-box");
  replyBox.hidden = true; replyBox.textContent = "";
  const cont = document.getElementById("btn-continue");
  cont.hidden = true; cont.onclick = null;
  const box = document.getElementById("choices");
  box.innerHTML = "";
  (sc.choices || []).forEach(choice => {
    const b = document.createElement("button");
    b.textContent = choice.label;
    b.addEventListener("click", () => pickChoice(choice, b));
    box.appendChild(b);
  });
  if ((sc.choices || []).length === 0) afterSceneText(sc);
}

function pickChoice(choice, btn) {
  document.querySelectorAll("#choices button").forEach(b => { b.disabled = true; });
  btn.style.borderColor = "var(--terra)"; btn.style.background = "#fff";
  const replyBox = document.getElementById("reply-box");
  replyBox.textContent = choice.reply || ""; replyBox.hidden = false;
  const cont = document.getElementById("btn-continue");
  cont.hidden = false;
  cont.onclick = () => { sceneId = choice.next; afterSceneText(currentScene()); };
}

function afterSceneText(sc) {
  pendingQuizzes = (sc.quizzes || []).slice(); quizIndex = 0;
  if (pendingQuizzes.length > 0) { renderQuiz(); show("view-quiz"); }
  else advanceStory();
}

function advanceStory() {
  const order = Object.keys(story.scenes);
  const i = order.indexOf(sceneId);
  if (i >= 0 && i < order.length - 1) { sceneId = order[i + 1]; renderScene(); show("view-player"); }
  else finishStory();
}

function renderQuiz() {
  const q = pendingQuizzes[quizIndex]; runTotal++;
  document.getElementById("quiz-progress").textContent = "Question " + (quizIndex + 1) + " of " + pendingQuizzes.length;
  document.getElementById("quiz-question").textContent = q.question;
  const fb = document.getElementById("quiz-feedback");
  fb.hidden = true; fb.textContent = "";
  const next = document.getElementById("btn-quiz-next");
  next.hidden = true; next.onclick = null;
  const box = document.getElementById("quiz-options");
  box.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.textContent = opt;
    b.addEventListener("click", () => answerQuiz(q, idx, b));
    box.appendChild(b);
  });
}

function answerQuiz(q, idx, btn) {
  document.querySelectorAll("#quiz-options button").forEach(b => { b.disabled = true; });
  const correct = idx === q.answer;
  btn.classList.add(correct ? "correct" : "wrong");
  if (correct) { runCorrect++; runXP += 10; addXP(10); }
  else document.querySelectorAll("#quiz-options button")[q.answer].classList.add("correct");
  const fb = document.getElementById("quiz-feedback");
  fb.textContent = correct ? "Hongera! +10 XP." : "Not quite — the highlighted answer is correct.";
  fb.hidden = false;
  const next = document.getElementById("btn-quiz-next");
  next.hidden = false;
  next.onclick = () => {
    quizIndex++;
    if (quizIndex < pendingQuizzes.length) renderQuiz(); else advanceStory();
  };
}

function finishStory() {
  const done = store.get("mt_done", []);
  if (!done.includes(story.id)) {
    done.push(story.id); store.set("mt_done", done);
    runXP += 25; addXP(25); // completion bonus
  }
  document.getElementById("done-logo").src = logoUri();
  document.getElementById("done-summary").textContent =
    'You finished "' + story.title + '" — ' + runCorrect + " of " + runTotal + " correct.";
  document.getElementById("done-points").textContent = "+" + runXP + " XP this story";
  show("view-done");
}

function speak(text) {
  if (!("speechSynthesis" in window)) { alert("Speech is not supported in this browser."); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

/* ---------- colouring studio ---------- */
const PALETTE = ["#c2571b","#d9a441","#2e7d4f","#b3362b","#1c130c","#f7f0e1","#3a86c8","#7b4b9e","#d96a8b","#ffffff"];
let paintColor = PALETTE[0], paintTool = "fill", brushSize = 10;
let canvas, ctx, undoStack = [], artW = 0, artH = 0, currentArtId = null, painting = false;

function allArts() { return (typeof COLORING_ARTS_A !== "undefined" ? COLORING_ARTS_A : [])
  .concat(typeof COLORING_ARTS_B !== "undefined" ? COLORING_ARTS_B : []); }

function renderArtGallery() {
  const colored = store.get("mt_colored", []);
  const grid = document.getElementById("art-grid");
  grid.innerHTML = "";
  allArts().forEach(a => {
    const card = document.createElement("div");
    card.className = "art-card";
    card.innerHTML = '<img src="' + a.src + '" alt="' + escapeHtml(a.title) + '" loading="lazy">' +
      '<div class="art-info"><h3>' + escapeHtml(a.title) + "</h3>" +
      (colored.includes(a.id) ? '<span class="xp-tag done">Painted</span>' : '<span class="xp-tag">+15 XP</span>') + "</div>";
    card.addEventListener("click", () => openStudio(a));
    grid.appendChild(card);
  });
}

function openStudio(art) {
  currentArtId = art.id;
  document.getElementById("art-gallery").hidden = true;
  document.getElementById("studio").hidden = false;
  document.getElementById("studio-title").textContent = art.title;
  buildPalette();
  canvas = document.getElementById("paint-canvas");
  ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    artW = img.naturalWidth; artH = img.naturalHeight;
    canvas.width = artW; canvas.height = artH;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, artW, artH);
    ctx.drawImage(img, 0, 0);
    undoStack = [];
  };
  img.src = art.src;
  show("view-color");
  document.getElementById("art-gallery").hidden = true;
  document.getElementById("studio").hidden = false;
}

function buildPalette() {
  const p = document.getElementById("palette");
  p.innerHTML = "";
  PALETTE.forEach(c => {
    const s = document.createElement("div");
    s.className = "swatch" + (c === paintColor ? " active" : "");
    s.style.background = c; s.title = c;
    s.addEventListener("click", () => {
      paintColor = c;
      p.querySelectorAll(".swatch").forEach(x => x.classList.remove("active"));
      s.classList.add("active");
    });
    p.appendChild(s);
  });
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function pushUndo() {
  try {
    undoStack.push(ctx.getImageData(0, 0, artW, artH));
    if (undoStack.length > 15) undoStack.shift();
  } catch (e) {}
}

/* Tap-to-fill: flood fill from the tapped pixel, stopping at dark lines. */
function floodFill(sx, sy) {
  const tol = 60;
  const img = ctx.getImageData(0, 0, artW, artH);
  const d = img.data;
  const si = (sy * artW + sx) * 4;
  const tr = d[si], tg = d[si+1], tb = d[si+2];
  const [fr, fg, fb] = hexToRgb(paintColor);
  if (Math.abs(tr-fr) < 10 && Math.abs(tg-fg) < 10 && Math.abs(tb-fb) < 10) return;
  // Do not start on a dark outline pixel.
  if (tr < 70 && tg < 70 && tb < 70) return;
  const seen = new Uint8Array(artW * artH);
  const stack = [[sx, sy]];
  const match = i => Math.abs(d[i]-tr) <= tol && Math.abs(d[i+1]-tg) <= tol && Math.abs(d[i+2]-tb) <= tol;
  pushUndo();
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= artW || y >= artH) continue;
    const p = y * artW + x;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!match(i)) continue;
    d[i] = fr; d[i+1] = fg; d[i+2] = fb; d[i+3] = 255;
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  ctx.putImageData(img, 0, 0);
}

function canvasPos(ev) {
  const r = canvas.getBoundingClientRect();
  const cx = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
  const cy = (ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY);
  return [Math.floor((cx - r.left) / r.width * artW), Math.floor((cy - r.top) / r.height * artH)];
}

function bindPaint() {
  canvas = document.getElementById("paint-canvas");
  const start = ev => {
    ev.preventDefault();
    const [x, y] = canvasPos(ev);
    if (paintTool === "fill") { floodFill(x, y); return; }
    painting = true; pushUndo();
    ctx.strokeStyle = paintColor; ctx.fillStyle = paintColor;
    ctx.lineWidth = brushSize; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
  };
  const move = ev => {
    if (!painting || paintTool !== "brush") return;
    ev.preventDefault();
    const [x, y] = canvasPos(ev);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const end = () => { painting = false; };
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
}

document.getElementById("tool-fill").addEventListener("click", e => {
  paintTool = "fill";
  document.getElementById("tool-fill").classList.add("active");
  document.getElementById("tool-brush").classList.remove("active");
});
document.getElementById("tool-brush").addEventListener("click", e => {
  paintTool = "brush";
  document.getElementById("tool-brush").classList.add("active");
  document.getElementById("tool-fill").classList.remove("active");
});
document.getElementById("brush-size").addEventListener("input", e => { brushSize = +e.target.value; });
document.getElementById("btn-undo").addEventListener("click", () => {
  const prev = undoStack.pop();
  if (prev) ctx.putImageData(prev, 0, 0);
});
document.getElementById("btn-clear").addEventListener("click", () => {
  pushUndo();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, artW, artH);
  const art = allArts().find(a => a.id === currentArtId);
  if (art) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = art.src; }
});
document.getElementById("btn-studio-back").addEventListener("click", () => {
  document.getElementById("studio").hidden = true;
  document.getElementById("art-gallery").hidden = false;
  renderArtGallery();
});
document.getElementById("btn-save-art").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "mothertalk-" + currentArtId + ".png";
  a.href = canvas.toDataURL("image/png");
  a.click();
});
document.getElementById("btn-finish-art").addEventListener("click", () => {
  const colored = store.get("mt_colored", []);
  if (!colored.includes(currentArtId)) {
    colored.push(currentArtId); store.set("mt_colored", colored);
    addXP(15);
    alert("Hongera! +15 XP for finishing \"" +
      (allArts().find(a => a.id === currentArtId) || {}).title + "\".");
  } else {
    alert("Already counted — paint another artwork for more XP!");
  }
  renderArtGallery();
});

/* ---------- leaderboard ---------- */
function renderBoard() {
  const name = store.get("mt_name", "Guest");
  const xp = store.get("mt_xp", 0);
  const streak = store.get("mt_streak", {count:0}).count;
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

/* ---------- name modal ---------- */
document.getElementById("btn-save-name").addEventListener("click", () => {
  const v = document.getElementById("name-input").value.trim().slice(0, 20);
  store.set("mt_name", v || "Guest");
  document.getElementById("name-modal").hidden = true;
  renderBoard();
});

/* ---------- static buttons ---------- */
document.getElementById("btn-hear").addEventListener("click", () => {
  const sc = currentScene(); if (sc && sc.native) speak(sc.native);
});
document.getElementById("btn-quit").addEventListener("click", () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  show("view-home");
});
document.getElementById("btn-done-home").addEventListener("click", () => show("view-home"));
document.getElementById("brand-home").addEventListener("click", () => show("view-home"));
document.getElementById("btn-start").addEventListener("click", () => {
  document.getElementById("story-grid").scrollIntoView({ behavior: "smooth" });
});

/* ---------- boot ---------- */
(function boot() {
  updateStreak();
  refreshBadges();
  renderGoal();
  loadCatalogue();
  bindPaint();
  // Logo + modal logo use the embedded data URI from the previous build step.
  const li = document.getElementById("logo-img");
  if (li && !li.src) li.src = LOGO_URI;
  show("view-home");
  if (!store.get("mt_name", "")) {
    document.getElementById("modal-logo").src = logoUri();
    document.getElementById("name-modal").hidden = false;
  }
})();
