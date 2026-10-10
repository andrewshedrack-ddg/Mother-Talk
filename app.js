/* MotherTalk story engine.
 *
 * Plain HTML + CSS + JavaScript, no frameworks. Data lives in data/*.json,
 * progress lives in the browser's localStorage, pronunciation uses the
 * browser's built-in speech synthesis. This whole app runs as static files,
 * which is why it works on GitHub Pages.
 */

// ---------- tiny storage helpers (localStorage only holds strings) ----------
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
};

// ---------- app state ----------
let catalogue = [];      // list of stories from data/stories.json
let story = null;        // the loaded story object
let sceneId = null;      // key of the current scene
let pendingQuizzes = []; // quizzes left in the current scene
let quizIndex = 0;
let runPoints = 0;       // points earned during this story run
let runCorrect = 0;
let runTotal = 0;

// ---------- view switching ----------
function show(viewId) {
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== viewId; });
  window.scrollTo(0, 0);
}

function refreshPoints() {
  document.getElementById("points-badge").textContent = store.get("mt_points", 0) + " pts";
}

function addPoints(n) {
  store.set("mt_points", store.get("mt_points", 0) + n);
  refreshPoints();
}

// Escape user-facing text so story JSON can never inject HTML.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- home: story catalogue ----------
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
      "<span class='lang'>" + escapeHtml(s.flag || "") + " " + escapeHtml(s.language) + "</span>" +
      "<h3>" + escapeHtml(s.title) + "</h3>" +
      "<p>" + escapeHtml(s.description) + "</p>" +
      (done.includes(s.id) ? "<span class='done-tag'>Completed</span>" : "");
    card.addEventListener("click", () => startStory(s));
    grid.appendChild(card);
  });
}

// ---------- story player ----------
async function startStory(meta) {
  const res = await fetch(meta.file);
  story = await res.json();
  story._flag = meta.flag || "";
  story._language = meta.language || "";
  runPoints = 0; runCorrect = 0; runTotal = 0;
  sceneId = story.start;
  renderScene();
  show("view-player");
}

function currentScene() { return story.scenes[sceneId]; }

function renderScene() {
  const sc = currentScene();
  document.getElementById("scene-character").textContent = sc.character || "";
  document.getElementById("scene-lang").textContent = (story._flag + " " + story._language).trim();
  document.getElementById("scene-native").textContent = sc.native || "";
  document.getElementById("scene-translation").textContent = sc.translation || "";
  const cultureEl = document.getElementById("scene-culture");
  cultureEl.textContent = sc.culture ? ("Culture note: " + sc.culture) : "";
  cultureEl.style.display = sc.culture ? "" : "none";

  const replyBox = document.getElementById("reply-box");
  replyBox.hidden = true;
  replyBox.textContent = "";

  const cont = document.getElementById("btn-continue");
  cont.hidden = true;
  cont.onclick = null;

  const box = document.getElementById("choices");
  box.innerHTML = "";
  (sc.choices || []).forEach(choice => {
    const b = document.createElement("button");
    b.textContent = choice.label;
    b.addEventListener("click", () => pickChoice(choice, b));
    box.appendChild(b);
  });

  // A scene with no choices flows straight into its quizzes (or onward).
  if ((sc.choices || []).length === 0) afterSceneText(sc);
}

function pickChoice(choice, btn) {
  // Lock the choices so the learner picks exactly one.
  document.querySelectorAll("#choices button").forEach(b => { b.disabled = true; });
  btn.style.borderColor = "var(--terra)";
  btn.style.background = "#fff";

  const replyBox = document.getElementById("reply-box");
  replyBox.textContent = choice.reply || "";
  replyBox.hidden = false;

  const cont = document.getElementById("btn-continue");
  cont.hidden = false;
  cont.onclick = () => {
    sceneId = choice.next;
    afterSceneText(currentScene());
  };
}

// After a scene's text (and any reply), run its quizzes, then move on.
function afterSceneText(sc) {
  pendingQuizzes = (sc.quizzes || []).slice();
  quizIndex = 0;
  if (pendingQuizzes.length > 0) {
    renderQuiz();
    show("view-quiz");
  } else {
    advanceStory();
  }
}

function advanceStory() {
  // Scenes play in JSON order; the last one ends the story.
  const order = Object.keys(story.scenes);
  const i = order.indexOf(sceneId);
  if (i >= 0 && i < order.length - 1) {
    sceneId = order[i + 1];
    renderScene();
    show("view-player");
  } else {
    finishStory();
  }
}

// ---------- quizzes ----------
function renderQuiz() {
  const q = pendingQuizzes[quizIndex];
  runTotal++;
  document.getElementById("quiz-progress").textContent =
    "Question " + (quizIndex + 1) + " of " + pendingQuizzes.length;
  document.getElementById("quiz-question").textContent = q.question;

  const fb = document.getElementById("quiz-feedback");
  fb.hidden = true;
  fb.textContent = "";
  const next = document.getElementById("btn-quiz-next");
  next.hidden = true;
  next.onclick = null;

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
  if (correct) {
    runCorrect++;
    runPoints += 10;
    addPoints(10);
  } else {
    // Reveal the right answer so the learner still learns it.
    document.querySelectorAll("#quiz-options button")[q.answer].classList.add("correct");
  }
  const fb = document.getElementById("quiz-feedback");
  fb.textContent = correct ? "Correct! +10 points." : "Not quite — the highlighted answer is correct.";
  fb.hidden = false;

  const next = document.getElementById("btn-quiz-next");
  next.hidden = false;
  next.onclick = () => {
    quizIndex++;
    if (quizIndex < pendingQuizzes.length) renderQuiz();
    else advanceStory();
  };
}

// ---------- story complete ----------
function finishStory() {
  const done = store.get("mt_done", []);
  if (!done.includes(story.id)) {
    done.push(story.id);
    store.set("mt_done", done);
    runPoints += 20; // completion bonus
    addPoints(20);
  }
  document.getElementById("done-summary").textContent =
    "You finished \"" + story.title + "\" — " + runCorrect + " of " + runTotal + " quiz answers correct.";
  document.getElementById("done-points").textContent = "+" + runPoints + " points this story";
  show("view-done");
}

// ---------- pronunciation via the browser's demo voice ----------
function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Speech is not supported in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85; // slower so learners can follow along
  window.speechSynthesis.speak(u);
}

// ---------- static buttons ----------
document.getElementById("btn-hear").addEventListener("click", () => {
  const sc = currentScene();
  if (sc && sc.native) speak(sc.native);
});
document.getElementById("btn-quit").addEventListener("click", quitToHome);
document.getElementById("btn-done-home").addEventListener("click", quitToHome);
document.getElementById("brand-home").addEventListener("click", quitToHome);
document.getElementById("btn-start").addEventListener("click", () => {
  document.getElementById("story-grid").scrollIntoView({ behavior: "smooth" });
});

function quitToHome() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  loadCatalogue();
  show("view-home");
}

// ---------- boot ----------
refreshPoints();
loadCatalogue();
show("view-home");
