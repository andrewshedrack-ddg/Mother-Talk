/* MotherTalk Colouring Studio (Flask) — fill + brush on layered canvases.
 * Ported from the static site's app.js painting code. The learner's paint
 * lives on a separate layer UNDER the transparent line art, so the black
 * outlines are always drawn on top and colour can never cover them.
 * Finishing an artwork POSTs the painting to /colouring/finish (+15 XP
 * the first time per artwork; repainting earns nothing more). */
(function () {
  var paintColor = "#c2571b", paintTool = "fill", brushSize = 10;
  var canvas, ctx, paintCanvas, pctx, lineImg;
  var undoStack = [], artW = 0, artH = 0, painting = false;

  /* ---------- layered composite ---------- */
  function renderComposite() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, artW, artH);
    ctx.drawImage(paintCanvas, 0, 0);
    ctx.drawImage(lineImg, 0, 0, artW, artH);
  }

  /* ---------- colour wheel ---------- */
  var wheelLight = 0.55, lastHue = 14, lastSat = 0.72;
  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    var c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    var r, g, b;
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
    var rgb = hsvToRgb(h, s, wheelLight);
    paintColor = "#" + rgb.map(function (v) { return v.toString(16).padStart(2, "0"); }).join("");
    var pv = document.getElementById("color-preview");
    if (pv) pv.style.background = paintColor;
    var hx = document.getElementById("color-hex");
    if (hx) hx.textContent = paintColor;
  }
  function buildColorWheel() {
    var wheel = document.getElementById("color-wheel");
    if (!wheel || wheel.dataset.built) return;
    wheel.dataset.built = "1";
    var S = wheel.width, wctx = wheel.getContext("2d");
    var img = wctx.createImageData(S, S);
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var dx = x - S / 2 + 0.5, dy = y - S / 2 + 0.5;
      var rr = Math.sqrt(dx * dx + dy * dy) / (S / 2);
      var k = (y * S + x) * 4;
      if (rr > 1) { img.data[k + 3] = 0; continue; }
      var h = Math.atan2(dy, dx) * 180 / Math.PI; if (h < 0) h += 360;
      var rgb = hsvToRgb(h, Math.min(1, rr), 1);
      img.data[k] = rgb[0]; img.data[k + 1] = rgb[1]; img.data[k + 2] = rgb[2]; img.data[k + 3] = 255;
    }
    wctx.putImageData(img, 0, 0);
    var pick = function (ev) {
      ev.preventDefault();
      var rect = wheel.getBoundingClientRect();
      var cx = (ev.clientX - rect.left) / rect.width * S - S / 2;
      var cy = (ev.clientY - rect.top) / rect.height * S - S / 2;
      if (Math.sqrt(cx * cx + cy * cy) / (S / 2) > 1) return;
      var h = Math.atan2(cy, cx) * 180 / Math.PI; if (h < 0) h += 360;
      setPaintColor(h, Math.min(1, Math.sqrt(cx * cx + cy * cy) / (S / 2)));
    };
    wheel.addEventListener("pointerdown", pick);
    wheel.addEventListener("pointermove", function (ev) { if (ev.buttons) pick(ev); });
    var li = document.getElementById("lightness");
    if (li) li.addEventListener("input", function (ev) {
      wheelLight = ev.target.value / 100;
      setPaintColor(lastHue, lastSat);
    });
    setPaintColor(lastHue, lastSat);
  }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function pushUndo() {
    try {
      undoStack.push(pctx.getImageData(0, 0, artW, artH));
      if (undoStack.length > 15) undoStack.shift();
    } catch (e) {}
  }

  /* Tap-to-fill: flood fill from the tapped pixel, stopping at dark lines.
   * The fill runs on the visible composite, then only the changed pixels
   * are copied onto the paint layer (under the line art). */
  function floodFill(sx, sy) {
    if (!artW || !artH) return;
    sx = Math.max(0, Math.min(artW - 1, sx | 0));
    sy = Math.max(0, Math.min(artH - 1, sy | 0));
    var tol = 60;
    var comp = ctx.getImageData(0, 0, artW, artH);
    var d = comp.data;
    var si = (sy * artW + sx) * 4;
    var tr = d[si], tg = d[si + 1], tb = d[si + 2];
    var fc = hexToRgb(paintColor), fr = fc[0], fg = fc[1], fb = fc[2];
    if (Math.abs(tr - fr) < 10 && Math.abs(tg - fg) < 10 && Math.abs(tb - fb) < 10) return;
    if (tr < 70 && tg < 70 && tb < 70) return;  // tapped a line: do nothing
    var seen = new Uint8Array(artW * artH);
    var stack = [sx, sy];
    var filled = [];
    var match = function (k) {
      return Math.abs(d[k] - tr) <= tol && Math.abs(d[k + 1] - tg) <= tol && Math.abs(d[k + 2] - tb) <= tol;
    };
    while (stack.length) {
      var y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= artW || y >= artH) continue;
      var p = y * artW + x;
      if (seen[p]) continue;
      seen[p] = 1;
      var k = p * 4;
      if (!match(k)) continue;
      filled.push(k);
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    if (!filled.length) return;
    pushUndo();
    var pimg = pctx.getImageData(0, 0, artW, artH);
    var pd = pimg.data;
    for (var i = 0; i < filled.length; i++) {
      var k2 = filled[i];
      pd[k2] = fr; pd[k2 + 1] = fg; pd[k2 + 2] = fb; pd[k2 + 3] = 255;
    }
    pctx.putImageData(pimg, 0, 0);
    renderComposite();
  }

  function canvasPos(ev) {
    var r = canvas.getBoundingClientRect();
    return [
      Math.floor((ev.clientX - r.left) / r.width * artW),
      Math.floor((ev.clientY - r.top) / r.height * artH)
    ];
  }

  function bindPaint() {
    var c = document.getElementById("paint-canvas");
    if (!c) return;
    /* Direct property assignment (not addEventListener) guarantees exactly
     * one handler per event, no matter how many times this runs. */
    c.onpointerdown = function (ev) {
      ev.preventDefault();
      if (!artW || !artH || !pctx) return;
      try { c.setPointerCapture(ev.pointerId); } catch (e) {}
      var pos = canvasPos(ev);
      if (paintTool === "fill") { floodFill(pos[0], pos[1]); return; }
      painting = true; pushUndo();
      pctx.strokeStyle = paintColor; pctx.fillStyle = paintColor;
      pctx.lineWidth = brushSize; pctx.lineCap = "round"; pctx.lineJoin = "round";
      pctx.beginPath(); pctx.moveTo(pos[0], pos[1]); pctx.lineTo(pos[0] + 0.1, pos[1] + 0.1); pctx.stroke();
      renderComposite();
    };
    c.onpointermove = function (ev) {
      if (!painting || paintTool !== "brush" || !pctx) return;
      ev.preventDefault();
      var pos = canvasPos(ev);
      pctx.lineTo(pos[0], pos[1]); pctx.stroke();
      renderComposite();
    };
    c.onpointerup = function () { painting = false; };
    c.onpointercancel = function () { painting = false; };
    /* Touch fallback for older mobile browsers. */
    c.ontouchstart = function (ev) {
      ev.preventDefault();
      if (!artW || !artH || !pctx || !ev.touches[0]) return;
      var t = ev.touches[0];
      var r = c.getBoundingClientRect();
      var x = Math.floor((t.clientX - r.left) / r.width * artW);
      var y = Math.floor((t.clientY - r.top) / r.height * artH);
      if (paintTool === "fill") { floodFill(x, y); return; }
      painting = true; pushUndo();
      pctx.strokeStyle = paintColor; pctx.fillStyle = paintColor;
      pctx.lineWidth = brushSize; pctx.lineCap = "round"; pctx.lineJoin = "round";
      pctx.beginPath(); pctx.moveTo(x, y); pctx.lineTo(x + 0.1, y + 0.1); pctx.stroke();
      renderComposite();
    };
    c.ontouchmove = function (ev) {
      if (!painting || paintTool !== "brush" || !pctx || !ev.touches[0]) return;
      ev.preventDefault();
      var t = ev.touches[0];
      var r = c.getBoundingClientRect();
      var x = Math.floor((t.clientX - r.left) / r.width * artW);
      var y = Math.floor((t.clientY - r.top) / r.height * artH);
      pctx.lineTo(x, y); pctx.stroke();
      renderComposite();
    };
    c.ontouchend = function () { painting = false; };
  }

  /* ---------- boot ---------- */
  buildColorWheel();
  canvas = document.getElementById("paint-canvas");
  ctx = canvas.getContext("2d");
  paintCanvas = document.createElement("canvas");
  pctx = paintCanvas.getContext("2d");
  lineImg = new Image();
  lineImg.onload = function () {
    /* Work at most at 640px on the long edge: paint stays fast on phones
     * and the line art is still drawn crisply at display size. */
    var MAX = 640;
    var k = Math.min(1, MAX / Math.max(lineImg.naturalWidth, lineImg.naturalHeight));
    artW = Math.max(1, Math.round(lineImg.naturalWidth * k));
    artH = Math.max(1, Math.round(lineImg.naturalHeight * k));
    canvas.width = artW; canvas.height = artH;
    paintCanvas.width = artW; paintCanvas.height = artH;
    undoStack = [];
    renderComposite();
  };
  lineImg.src = ART_SRC;
  bindPaint();

  document.getElementById("tool-fill").addEventListener("click", function () {
    paintTool = "fill";
    document.getElementById("tool-fill").classList.add("active");
    document.getElementById("tool-brush").classList.remove("active");
  });
  document.getElementById("tool-brush").addEventListener("click", function () {
    paintTool = "brush";
    document.getElementById("tool-brush").classList.add("active");
    document.getElementById("tool-fill").classList.remove("active");
  });
  document.getElementById("brush-size").addEventListener("input", function (e) { brushSize = +e.target.value; });
  document.getElementById("btn-undo").addEventListener("click", function () {
    var prev = undoStack.pop();
    if (prev) { pctx.putImageData(prev, 0, 0); renderComposite(); }
  });
  document.getElementById("btn-clear").addEventListener("click", function () {
    pushUndo();
    pctx.clearRect(0, 0, artW, artH);
    renderComposite();
  });
  document.getElementById("btn-save-art").addEventListener("click", function () {
    var a = document.createElement("a");
    a.download = "mothertalk-" + ART_ID + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  });
  document.getElementById("btn-finish-art").addEventListener("click", function () {
    var msg = document.getElementById("finish-msg");
    fetch(FINISH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artwork_id: ART_ID, image_data: canvas.toDataURL("image/png") })
    }).then(function (res) { return res.json().then(function (body) { return { status: res.status, body: body }; }); })
      .then(function (r) {
        if (r.status !== 200) {
          msg.textContent = "Could not save: " + (r.body.error || "please try again.");
        } else if (r.body.already) {
          msg.textContent = "Saved again. You already earned your +15 XP for \"" + ART_TITLE + "\" — total " + r.body.total_xp + " XP.";
        } else {
          msg.textContent = "Hongera! +15 XP for finishing \"" + ART_TITLE + "\" — total " + r.body.total_xp + " XP.";
        }
        msg.hidden = false;
      }).catch(function () {
        msg.textContent = "Could not save — check your connection and try again.";
        msg.hidden = false;
      });
  });
})();
