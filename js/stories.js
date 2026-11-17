// stories.js
// The story player: the story list, scenes, choices, quizzes and
// the speech buttons. Stories are plain JSON files in data/.

// Phrases taken from inside the stories, so learners hear the words
// the characters actually speak.
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

// Real flag images: emoji flags break on Windows.
function flagImg(code, cls) {
  return '<img class="flag ' + (cls || "") + '" src="https://flagcdn.com/w40/' +
    escapeHtml(code) + '.png" alt="" loading="lazy">';
}

// The story being played, and where the learner is inside it.
let catalogue = [], story = null, sceneId = null;
// Where the learner goes after the current scene's quiz. A choice
// sets this; advanceStory uses it, then clears it.
let nextSceneId = null;
let pendingQuizzes = [], quizIndex = 0, runXP = 0, runCorrect = 0, runTotal = 0;

const REGION_ORDER = ["Kenya", "Uganda", "Tanzania"];

// Build the story list on the home page, grouped by country.
// Stories the admin approved from contributors are added after the
// built-in ones, so a learner sees them in the same list.
async function loadCatalogue() {
  const res = await fetch("data/stories.json");
  catalogue = await res.json();
  getApprovedStories().forEach(a => {
    if (!catalogue.some(s => s.id === a.id)) {
      catalogue.push({
        id: a.id, title: a.title, language: a.language,
        country: a.country, flag: a.flag, description: a.description,
        data: a.data, community: true
      });
    }
  });
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
  // An approved community story carries its scenes with it; a
  // built-in story is fetched from its JSON file instead.
  story = meta.data || (await (await fetch(meta.file)).json());
  story._flag = meta.flag || "";
  story._language = meta.language || "";
  story._code = (meta.language === "Swahili") ? "sw-KE" : null;
  runXP = 0; runCorrect = 0; runTotal = 0;
  sceneId = story.start;
  renderScene(); // shows the player, or the quiz if the first scene has none
}

function currentScene() { return story.scenes[sceneId]; }

// Show one scene: the words, the culture note and the choices.
// A scene with no choices goes straight to its quiz.
function renderScene() {
  const sc = currentScene();
  if (!sc) { finishStory(); return; }
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
  else show("view-player");
}

// The learner picked a choice. Show the reply, then Continue.
// Continue quizzes the scene just read, and only then moves on.
// The destination is remembered, not jumped to yet: moving now
// would make the next step skip a scene entirely.
function pickChoice(choice, btn) {
  document.querySelectorAll("#choices button").forEach(b => { b.disabled = true; });
  btn.style.borderColor = "var(--terra)"; btn.style.background = "#fff";
  const replyBox = document.getElementById("reply-box");
  replyBox.textContent = choice.reply || ""; replyBox.hidden = false;
  const cont = document.getElementById("btn-continue");
  cont.hidden = false;
  cont.onclick = () => { nextSceneId = choice.next; afterSceneText(currentScene()); };
}

// After reading a scene: run its quiz, or move on if it has none.
function afterSceneText(sc) {
  pendingQuizzes = (sc.quizzes || []).slice(); quizIndex = 0;
  if (pendingQuizzes.length > 0) { renderQuiz(); show("view-quiz"); }
  else advanceStory();
}

// Move on after a scene's quiz. Go where the choice pointed, if
// one was picked; otherwise go to the next scene in order. At the
// last scene, finish the story.
// renderScene picks the right view itself, so this never forces the
// player over the top of a quiz: that is what used to strand the
// learner on the final scene with a dead Continue button.
function advanceStory() {
  if (nextSceneId && story.scenes[nextSceneId]) {
    sceneId = nextSceneId;
    nextSceneId = null;
    renderScene();
    return;
  }
  const order = Object.keys(story.scenes);
  const i = order.indexOf(sceneId);
  if (i >= 0 && i < order.length - 1) { sceneId = order[i + 1]; renderScene(); }
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

// One quiz answer. A correct answer is worth 10 XP, given at once.
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

// The story is finished. The 25 XP bonus is given once per story.
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

// Voice: uses the device speech engine. When a language code is known
// (Swahili today), it is set on the utterance so the device picks the
// closest matching voice. Real native-speaker recordings will replace
// this synthetic voice phrase by phrase.
function speakRate(text, lang, rate) {
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
  u.rate = rate;
  window.speechSynthesis.speak(u);
}
function speak(text, lang) { speakRate(text, lang, 0.9); }
function speakSlow(text, lang) { speakRate(text, lang, 0.6); }
function speakNormal(text, lang) { speakRate(text, lang, 1); }
