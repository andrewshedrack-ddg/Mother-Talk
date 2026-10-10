/* MotherTalk story engine (static version).
 *
 * How it works:
 *  1. On load, fetch data/stories.json and render the story catalogue.
 *  2. When a story is picked, fetch its JSON file and walk through scenes.
 *  3. Each scene: show character line -> choices -> reply -> scene quizzes.
 *  4. Points and completed stories are kept in localStorage (this browser only).
 *  5. Pronunciation uses the browser's built-in speech synthesis (demo voice).
 */

// ---------- tiny storage helpers ----------
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
let catalogue = [];
let story = null;          // the loaded story JSON
let sceneId = null;        // current scene key
let pendingQuizzes = [];   // quizzes left in the current scene
let quizIndex = 0;
let runPoints = 0;        // points earned in this story run
let runCorrect = 0;
let runTotal = 0;

// ---------- view switching ----------
function show(viewId) {
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== viewId; });
  window.scrollTo(0, 0);
}

function refreshPoints() {
  const pts = store.get("mt_points", 0);
  document.getElementById("points-badge").textContent = pts + " pts";
}

function addPoints(n) {
  store.set("mt_points", store.get("mt_points", 0) + n);
  refreshPoints();
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
      "<span class='lang'>" + escapeHtml(s.language) + "</span>" +
      "<h3>" + escapeHtml(s.title) + "</h3>" +
      "<p>" + escapeHtml(s.description) + "</p>" +
      (done.includes(s.id) ? "<span class='done-tag'>Completed</span>" : "");
    card.addEventListener("click", () => startStory(s));
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- story player ----------
async function startStory(meta) {
  const res = await fetch(meta.file);
  story = await res.json();
  runPoints = 0; runCorrect = 0; runTotal = 0;
  sceneId = story.start;
  renderScene();
  show("view-player");
}

function currentScene() { return story.scenes[sceneId]; }

function renderScene() {
  const sc = currentScene();
  document.getElementById("scene-character").textContent = sc.character || "";
  document.getElementById("scene-native").textContent = sc.native || "";
  document.getElementById("scene-translation").textContent = sc.translation || "";
  document.getElementById("scene-culture").textContent = sc.culture ? ("Culture note: " + sc.culture) : "";
  document.getElementById("scene-culture").style.display = sc.culture ? "" : "none";

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

  // Scene with no choices: go straight to its quizzes (or next scene).
  if ((sc.choices || []).length === 0) {
    afterSceneText(sc);
  }
}

function pickChoice(choice, btn) {
  // Lock the choices so only one can be picked.
  document.querySelectorAll("#choices button").forEach(b => { b.disabled = true; });
  btn.style.borderColor = "var(--accent)";

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

// After the scene text (and any reply), run this scene's quizzes,
// then move on. Scenes are linked; the last scene ends the story.
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
  // Find scenes in order; move to the one after the current, else finish.
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
  const fb = document.getElementById("quiz-feedback");
  const correct = idx === q.answer;
  btn.classList.add(correct ? "correct" : "wrong");
  if (!correct) {
    document.querySelectorAll("#quiz-options button")[q.answer].classList.add("correct");
  } else {
    runCorrect++;
    runPoints += 10;
    addPoints(10);
  }
  fb.textContent = correct ? "Correct! +10 points." : "Not quite. The highlighted answer is correct.";
  fb.hidden = false;

  const next = document.getElementById("btn-quiz-next");
  next.hidden = false;
  next.onclick = () => {
    quizIndex++;
    if (quizIndex < pendingQuizzes.length) { renderQuiz(); }
    else { advanceStory(); }
  };
}

// ---------- story complete ----------
function finishStory() {
  const done = store.get("mt_done", []);
  if (!done.includes(story.id)) {
    done.push(story.id);
    store.set("mt_done", done);
    addPoints(20); // completion bonus
    runPoints += 20;
  }
  document.getElementById("done-summary").textContent =
    "You finished \"" + story.title + "\" — " + runCorrect + " of " + runTotal + " quiz answers correct.";
  document.getElementById("done-points").textContent = "+" + runPoints + " points this story";
  show("view-done");
}

// ---------- pronunciation (browser demo voice) ----------
function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Speech is not supported in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85; // slower so learners can follow
  window.speechSynthesis.speak(u);
}

// ---------- wire up static buttons ----------
document.getElementById("btn-hear").addEventListener("click", () => {
  const sc = currentScene();
  if (sc && sc.native) speak(sc.native);
});
document.getElementById("btn-quit").addEventListener("click", () => {
  window.speechSynthesis && window.speechSynthesis.cancel();
  loadCatalogue(); show("view-home");
});
document.getElementById("btn-done-home").addEventListener("click", () => {
  loadCatalogue(); show("view-home");
});
document.getElementById("brand-home").addEventListener("click", () => {
  loadCatalogue(); show("view-home");
});

// ---------- boot ----------
refreshPoints();
loadCatalogue();
show("view-home");
