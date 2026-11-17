/* MotherTalk story engine (client side).
   Loads scenes from the JSON API, renders the visual-novel stage,
   records choices and submits quiz answers. No story text lives here;
   everything comes from the story JSON files. */
(function () {
  "use strict";
  var sceneId = START;
  var sceneCount = 0;

  function $(id) { return document.getElementById(id); }

  function post(url, data) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json(); });
  }

  function render(scene) {
    sceneCount += 1;
    $("character").textContent = scene.character || "";
    $("native").textContent = scene.native || scene.text || "";
    $("translation").textContent = scene.translation || "";
    $("art").src = scene.image ? "/static/" + scene.image : "";
    $("art").style.display = scene.image ? "" : "none";
    $("portrait").src = scene.character_img ? "/static/" + scene.character_img : "";
    $("portrait").style.display = scene.character_img ? "" : "none";

    var culture = $("culture");
    if (scene.culture) { culture.hidden = false; culture.textContent = "Culture note: " + scene.culture; }
    else { culture.hidden = true; }

    var say = $("say"), clip = $("clip");
    if (scene.audio) {
      say.hidden = false;
      clip.src = "/audio/" + scene.audio;
      say.onclick = function () { clip.play(); };
    } else { say.hidden = true; }

    // FR-20: the Web Speech API (an external actor in the design)
    // converts story text to speech in the learner's browser.
    // FR-21: practise mode speaks slowly so the learner repeats aloud.
    var tts = $("tts"), practise = $("practise");
    var phrase = scene.native || scene.text || "";
    if ("speechSynthesis" in window && phrase) {
      tts.hidden = false;
      practise.hidden = false;
      var speak = function (rate) {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(phrase);
        u.rate = rate;
        window.speechSynthesis.speak(u);
      };
      tts.onclick = function () { speak(1); };
      practise.onclick = function () {
        speak(0.6);
        $("reply").textContent = "Your turn: say it out loud, then tap Practise again to compare.";
      };
    } else { tts.hidden = true; practise.hidden = true; }

    $("reply").textContent = "";
    $("progress-line").textContent = "Scene " + sceneCount;

    var box = $("choices");
    box.innerHTML = "";
    (scene.choices || []).forEach(function (c, i) {
      var b = document.createElement("button");
      b.textContent = c.label;
      b.onclick = function () {
        post("/api/choice", { story_id: STORY, scene_id: sceneId, choice_index: i });
        if (c.reply) { $("reply").textContent = c.reply; }
        setTimeout(function () { load(c.next); }, c.reply ? 1800 : 0);
      };
      box.appendChild(b);
    });

    renderQuiz(scene);
  }

  function renderQuiz(scene) {
    var qz = $("quiz");
    qz.innerHTML = "";
    if (!scene.quizzes || !scene.quizzes.length) { qz.hidden = true; return; }
    qz.hidden = false;
    var answers = [];

    scene.quizzes.forEach(function (q, qi) {
      var d = document.createElement("div");
      d.className = "q";
      var p = document.createElement("p");
      p.textContent = q.question;
      d.appendChild(p);
      var opts = document.createElement("div");
      opts.className = "opts";
      q.options.forEach(function (opt, oi) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = opt;
        b.onclick = function () {
          answers[qi] = oi;
          opts.querySelectorAll("button").forEach(function (x) { x.classList.remove("picked"); });
          b.classList.add("picked");
        };
        opts.appendChild(b);
      });
      d.appendChild(opts);
      qz.appendChild(d);
    });

    var sub = document.createElement("button");
    sub.textContent = "Check answers";
    sub.onclick = function () {
      post("/api/assessment/submit",
           { story_id: STORY, scene_id: sceneId, answers: answers })
        .then(function (res) {
          var msg = "You scored " + res.score + " out of " + res.total + ".";
          if (res.score === res.total) { msg += " Hongera! Perfect."; }
          $("reply").textContent = msg;
          qz.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
        });
    };
    qz.appendChild(sub);
  }

  function load(id) {
    sceneId = id;
    fetch("/api/story/" + STORY + "/scene/" + id)
      .then(function (r) { return r.json(); })
      .then(render);
  }

  load(START);
})();
