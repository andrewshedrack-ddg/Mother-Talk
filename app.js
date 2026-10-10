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

/* ---------- taste the languages ---------- */
/* Phrases taken from inside the stories, so learners hear the words
 * the characters actually speak. */
const TASTE = [
  { phrase: "W\u0129mwega, m\u0169geni!", meaning: "How are you, visitor!", lang: "Kikuyu", flag: "ke", story: "Wanjiru\u2019s Market Day" },
  { phrase: "T\u0169g\u0169r\u0129re matunda!", meaning: "Let\u2019s buy some fruits!", lang: "Kikuyu", flag: "ke", story: "Wanjiru\u2019s Market Day" },
  { phrase: "\u00cemwe, il\u00ee, ithat\u00fb!", meaning: "One, two, three!", lang: "Kamba", flag: "ke", story: "Mutiso\u2019s Harvest Day" },
  { phrase: "Karibu Zanzibar!", meaning: "Welcome to Zanzibar!", lang: "Swahili", flag: "tz", story: "Zanzibar Spice Adventure", code: "sw-KE" },
  { phrase: "Hii ni karafuu.", meaning: "This is clove.", lang: "Swahili", flag: "tz", story: "Zanzibar Spice Adventure", code: "sw-KE" },
  { phrase: "Cham rech!", meaning: "Eat fish!", lang: "Dholuo", flag: "ke", story: "Ochieng\u2019s Fishing Morning" },
  { phrase: "Tugende akatale!", meaning: "Let\u2019s go to the market!", lang: "Luganda", flag: "ug", story: "Nakato\u2019s Kampala Market" },
  { phrase: "Weeraba!", meaning: "Goodbye!", lang: "Luganda", flag: "ug", story: "Nakato\u2019s Kampala Market" }
];

function renderTaste() {
  const grid = document.getElementById("taste-grid");
  if (!grid) return;
  grid.innerHTML = "";
  TASTE.forEach(t => {
    const card = document.createElement("button");
    card.className = "taste-card";
    card.innerHTML =
      '<span class="taste-phrase">' + escapeHtml(t.phrase) + "</span>" +
      '<span class="taste-meaning">' + escapeHtml(t.meaning) + "</span>" +
      '<span class="taste-story">' + escapeHtml(t.story) + "</span>" +
      '<span class="taste-lang">' + flagImg(t.flag) + escapeHtml(t.lang) + "</span>";
    card.addEventListener("click", () => speak(t.phrase, t.code));
    grid.appendChild(card);
  });
}

/* ---------- flags (real images: emoji flags break on Windows) ---------- */
function flagImg(code, cls) {
  return '<img class="flag ' + (cls || "") + '" src="https://flagcdn.com/w40/' +
    escapeHtml(code) + '.png" alt="" loading="lazy">';
}

/* ---------- stories ---------- */
let catalogue = [], story = null, sceneId = null;
let pendingQuizzes = [], quizIndex = 0, runXP = 0, runCorrect = 0, runTotal = 0;

const REGION_ORDER = ["Kenya", "Uganda", "Tanzania"];

async function loadCatalogue() {
  const res = await fetch("data/stories.json");
  catalogue = await res.json();
  const done = store.get("mt_done", []);
  const wrap = document.getElementById("region-boxes");
  wrap.innerHTML = "";
  REGION_ORDER.forEach(country => {
    const stories = catalogue.filter(s => s.country === country);
    if (!stories.length) return;
    const box = document.createElement("div");
    box.className = "region-box";
    const doneCount = stories.filter(s => done.includes(s.id)).length;
    box.innerHTML =
      '<div class="region-head">' + flagImg(stories[0].flag) +
      "<div><h3>" + escapeHtml(country) + "</h3><span>" +
      stories.length + " stories · " + doneCount + " completed</span></div></div>" +
      '<div class="region-stories"></div>';
    const list = box.querySelector(".region-stories");
    stories.forEach(s => {
      const row = document.createElement("button");
      row.className = "story-row" + (done.includes(s.id) ? " is-done" : "");
      row.innerHTML =
        '<span class="story-row-main"><strong>' + escapeHtml(s.title) + "</strong>" +
        "<small>" + escapeHtml(s.language) + " · " + escapeHtml(s.description) + "</small></span>" +
        '<span class="story-row-go">' + (done.includes(s.id) ? "&#10003;" : "&rarr;") + "</span>";
      row.addEventListener("click", () => startStory(s));
      list.appendChild(row);
    });
    wrap.appendChild(box);
  });
}

async function startStory(meta) {
  const res = await fetch(meta.file);
  story = await res.json();
  story._flag = meta.flag || ""; story._language = meta.language || "";
  story._code = (meta.language === "Swahili") ? "sw-KE" : null;
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

/* Voice: uses the device speech engine. When a language code is known
 * (Swahili today), it is set on the utterance so the device picks the
 * closest matching voice. Real native-speaker recordings will replace
 * this synthetic voice phrase by phrase. */
function speak(text, lang) {
  if (!("speechSynthesis" in window)) { alert("Speech is not supported in this browser."); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (lang) {
    u.lang = lang;
    try {
      const vs = window.speechSynthesis.getVoices();
      const v = vs.find(v => v.lang && v.lang.toLowerCase().indexOf(lang.slice(0, 2).toLowerCase()) === 0);
      if (v) u.voice = v;
    } catch (e) {}
  }
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

/* ---------- colouring studio ---------- */
const PALETTE = ["#c2571b","#e8734a","#9b2226","#b3362b","#e86a5e","#ee9b00",
  "#d9a441","#ffd23f","#2e7d4f","#7bc47f","#94d2bd","#0f4c5c",
  "#3a86c8","#7fb3e0","#7b4b9e","#b48ad6","#d96a8b","#f4a9c4",
  "#f2d06b","#e9d8a6","#6b5a44","#1c130c","#f7f0e1","#ffffff"];
let paintColor = PALETTE[0], paintTool = "fill", brushSize = 10;
let canvas, ctx, paintCanvas, pctx, lineImg;
let undoStack = [], artW = 0, artH = 0, currentArtId = null, painting = false;

function allArts() {
  const A = (typeof COLORING_ARTS_A !== "undefined" ? COLORING_ARTS_A : []);
  const B = (typeof COLORING_ARTS_B !== "undefined" ? COLORING_ARTS_B : []);
  const C = (typeof COLORING_ARTS_C !== "undefined" ? COLORING_ARTS_C : []);
  const D = (typeof COLORING_ARTS_D !== "undefined" ? COLORING_ARTS_D : []);
  const E = (typeof COLORING_ARTS_E !== "undefined" ? COLORING_ARTS_E : []);
  const F = (typeof COLORING_ARTS_F !== "undefined" ? COLORING_ARTS_F : []);
  const G = (typeof COLORING_ARTS_G !== "undefined" ? COLORING_ARTS_G : []);
  const H = (typeof COLORING_ARTS_H !== "undefined" ? COLORING_ARTS_H : []);
  const I = (typeof COLORING_ARTS_I !== "undefined" ? COLORING_ARTS_I : []);
  const J = (typeof COLORING_ARTS_J !== "undefined" ? COLORING_ARTS_J : []);
  const K = (typeof COLORING_ARTS_K !== "undefined" ? COLORING_ARTS_K : []);
  const L = (typeof COLORING_ARTS_L !== "undefined" ? COLORING_ARTS_L : []);
  const M = (typeof COLORING_ARTS_M !== "undefined" ? COLORING_ARTS_M : []);
  const N = (typeof COLORING_ARTS_N !== "undefined" ? COLORING_ARTS_N : []);
  const O = (typeof COLORING_ARTS_O !== "undefined" ? COLORING_ARTS_O : []);
  const P = (typeof COLORING_ARTS_P !== "undefined" ? COLORING_ARTS_P : []);
  return A.concat(B).concat(C).concat(D).concat(E).concat(F).concat(G).concat(H).concat(I).concat(J).concat(K).concat(L).concat(M).concat(N).concat(O).concat(P);
}

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

/* Layered painting (the constraint): the user's paint lives on a separate
 * layer UNDER the black line art. Outlines are always drawn on top, so colour
 * can never cover them and paint always looks like it stays inside the lines. */
function renderComposite() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, artW, artH);
  ctx.drawImage(paintCanvas, 0, 0);
  ctx.drawImage(lineImg, 0, 0, artW, artH);
}

function openStudio(art) {
  currentArtId = art.id;
  document.getElementById("art-gallery").hidden = true;
  document.getElementById("studio").hidden = false;
  document.getElementById("studio-title").textContent = art.title;
  buildColorWheel();
  canvas = document.getElementById("paint-canvas");
  ctx = canvas.getContext("2d");
  paintCanvas = document.createElement("canvas");
  pctx = paintCanvas.getContext("2d");
  lineImg = new Image();
  lineImg.onload = () => {
    /* Work at most at 640px on the long edge: paint stays fast on phones
     * and the line art is still drawn crisply at display size. */
    const MAX = 640;
    const k = Math.min(1, MAX / Math.max(lineImg.naturalWidth, lineImg.naturalHeight));
    artW = Math.max(1, Math.round(lineImg.naturalWidth * k));
    artH = Math.max(1, Math.round(lineImg.naturalHeight * k));
    canvas.width = artW; canvas.height = artH;
    paintCanvas.width = artW; paintCanvas.height = artH;
    undoStack = [];
    renderComposite();
  };
  lineImg.src = art.src;
  show("view-color");
  document.getElementById("art-gallery").hidden = true;
  document.getElementById("studio").hidden = false;
}

/* Colour wheel: any hue and saturation, plus a lightness slider.
 * Replaces the old fixed swatches. */
let wheelLight = 0.55, lastHue = 14, lastSat = 0.72;
function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function setPaintColor(h, s) {
  lastHue = h; lastSat = s;
  const [r, g, b] = hsvToRgb(h, s, wheelLight);
  paintColor = "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
  const pv = document.getElementById("color-preview");
  if (pv) pv.style.background = paintColor;
  const hx = document.getElementById("color-hex");
  if (hx) hx.textContent = paintColor;
}
function buildColorWheel() {
  const wheel = document.getElementById("color-wheel");
  if (!wheel || wheel.dataset.built) return;
  wheel.dataset.built = "1";
  const S = wheel.width, wctx = wheel.getContext("2d");
  const img = wctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - S / 2 + 0.5, dy = y - S / 2 + 0.5;
    const rr = Math.sqrt(dx * dx + dy * dy) / (S / 2);
    const k = (y * S + x) * 4;
    if (rr > 1) { img.data[k + 3] = 0; continue; }
    let h = Math.atan2(dy, dx) * 180 / Math.PI; if (h < 0) h += 360;
    const [r, g, b] = hsvToRgb(h, Math.min(1, rr), 1);
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  wctx.putImageData(img, 0, 0);
  const pick = ev => {
    ev.preventDefault();
    const rect = wheel.getBoundingClientRect();
    const cx = (ev.clientX - rect.left) / rect.width * S - S / 2;
    const cy = (ev.clientY - rect.top) / rect.height * S - S / 2;
    if (Math.sqrt(cx * cx + cy * cy) / (S / 2) > 1) return;
    let h = Math.atan2(cy, cx) * 180 / Math.PI; if (h < 0) h += 360;
    setPaintColor(h, Math.min(1, Math.sqrt(cx * cx + cy * cy) / (S / 2)));
  };
  wheel.addEventListener("pointerdown", pick);
  wheel.addEventListener("pointermove", ev => { if (ev.buttons) pick(ev); });
  const li = document.getElementById("lightness");
  if (li) li.addEventListener("input", ev => {
    wheelLight = ev.target.value / 100;
    setPaintColor(lastHue, lastSat);
  });
  setPaintColor(lastHue, lastSat);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function pushUndo() {
  try {
    undoStack.push(pctx.getImageData(0, 0, artW, artH));
    if (undoStack.length > 15) undoStack.shift();
  } catch (e) {}
}

/* Tap-to-fill: flood fill from the tapped pixel, stopping at dark lines.
 * The fill runs on the visible composite, then only the changed pixels are
 * copied onto the paint layer (under the line art). */
function floodFill(sx, sy) {
  if (!artW || !artH) return;                       // image not ready yet
  sx = Math.max(0, Math.min(artW - 1, sx | 0));
  sy = Math.max(0, Math.min(artH - 1, sy | 0));
  const tol = 60;
  const comp = ctx.getImageData(0, 0, artW, artH);
  const d = comp.data;
  const si = (sy * artW + sx) * 4;
  const tr = d[si], tg = d[si+1], tb = d[si+2];
  const [fr, fg, fb] = hexToRgb(paintColor);
  if (Math.abs(tr-fr) < 10 && Math.abs(tg-fg) < 10 && Math.abs(tb-fb) < 10) return;
  if (tr < 70 && tg < 70 && tb < 70) return;        // tapped a line: do nothing
  const seen = new Uint8Array(artW * artH);
  const stack = [sx, sy];
  const filled = [];
  const match = k => Math.abs(d[k]-tr) <= tol && Math.abs(d[k+1]-tg) <= tol && Math.abs(d[k+2]-tb) <= tol;
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= artW || y >= artH) continue;
    const p = y * artW + x;
    if (seen[p]) continue;
    seen[p] = 1;
    const k = p * 4;
    if (!match(k)) continue;
    filled.push(k);
    stack.push(x+1, y, x-1, y, x, y+1, x, y-1);
  }
  if (!filled.length) return;
  pushUndo();
  const pimg = pctx.getImageData(0, 0, artW, artH);
  const pd = pimg.data;
  for (let i = 0; i < filled.length; i++) {
    const k = filled[i];
    pd[k] = fr; pd[k+1] = fg; pd[k+2] = fb; pd[k+3] = 255;
  }
  pctx.putImageData(pimg, 0, 0);
  renderComposite();
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
    if (!artW || !artH) return;                     // image not ready yet
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    const [x, y] = canvasPos(ev);
    if (paintTool === "fill") { floodFill(x, y); return; }
    painting = true; pushUndo();
    pctx.strokeStyle = paintColor; pctx.fillStyle = paintColor;
    pctx.lineWidth = brushSize; pctx.lineCap = "round"; pctx.lineJoin = "round";
    pctx.beginPath(); pctx.moveTo(x, y); pctx.lineTo(x + 0.1, y + 0.1); pctx.stroke();
    renderComposite();
  };
  const move = ev => {
    if (!painting || paintTool !== "brush") return;
    ev.preventDefault();
    const [x, y] = canvasPos(ev);
    pctx.lineTo(x, y); pctx.stroke();
    renderComposite();
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
  if (prev) { pctx.putImageData(prev, 0, 0); renderComposite(); }
});
document.getElementById("btn-clear").addEventListener("click", () => {
  pushUndo();
  pctx.clearRect(0, 0, artW, artH);
  renderComposite();
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
  const sc = currentScene(); if (sc && sc.native) speak(sc.native, story._code);
});
document.getElementById("btn-quit").addEventListener("click", () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  show("view-home");
});
document.getElementById("btn-done-home").addEventListener("click", () => show("view-home"));
document.getElementById("brand-home").addEventListener("click", () => show("view-home"));
document.getElementById("btn-start").addEventListener("click", () => {
  document.getElementById("region-boxes").scrollIntoView({ behavior: "smooth" });
});

/* ---------- boot ---------- */
(function boot() {
  updateStreak();
  refreshBadges();
  renderGoal();
  loadCatalogue();
  renderTaste();
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
