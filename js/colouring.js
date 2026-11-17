// colouring.js
// The Colouring Studio: the gallery of 30 pictures, painting with
// fill or brush, saving a finished painting, and the +15 XP award.

// The first colour on the wheel. The wheel lets the learner pick any
// colour after that.
const START_COLOR = "#c2571b";
let paintColor = START_COLOR, paintTool = "fill", brushSize = 10;
let canvas, ctx, paintCanvas, pctx, lineImg;
let undoStack = [], artW = 0, artH = 0, currentArtId = null, painting = false;

// All 30 artworks. Each data file defines one list, COLORING_ARTS_A
// to COLORING_ARTS_P. A missing file just counts as an empty list,
// so the gallery still works.
function allArts() {
  const lists = [
    (typeof COLORING_ARTS_A !== "undefined" ? COLORING_ARTS_A : []),
    (typeof COLORING_ARTS_B !== "undefined" ? COLORING_ARTS_B : []),
    (typeof COLORING_ARTS_C !== "undefined" ? COLORING_ARTS_C : []),
    (typeof COLORING_ARTS_D !== "undefined" ? COLORING_ARTS_D : []),
    (typeof COLORING_ARTS_E !== "undefined" ? COLORING_ARTS_E : []),
    (typeof COLORING_ARTS_F !== "undefined" ? COLORING_ARTS_F : []),
    (typeof COLORING_ARTS_G !== "undefined" ? COLORING_ARTS_G : []),
    (typeof COLORING_ARTS_H !== "undefined" ? COLORING_ARTS_H : []),
    (typeof COLORING_ARTS_I !== "undefined" ? COLORING_ARTS_I : []),
    (typeof COLORING_ARTS_J !== "undefined" ? COLORING_ARTS_J : []),
    (typeof COLORING_ARTS_K !== "undefined" ? COLORING_ARTS_K : []),
    (typeof COLORING_ARTS_L !== "undefined" ? COLORING_ARTS_L : []),
    (typeof COLORING_ARTS_M !== "undefined" ? COLORING_ARTS_M : []),
    (typeof COLORING_ARTS_N !== "undefined" ? COLORING_ARTS_N : []),
    (typeof COLORING_ARTS_O !== "undefined" ? COLORING_ARTS_O : []),
    (typeof COLORING_ARTS_P !== "undefined" ? COLORING_ARTS_P : [])
  ];
  return lists.flat();
}

// The gallery. A saved painting is shown as the thumbnail, so the
// learner can see their own work at a glance.
function renderArtGallery() {
  const colored = store.get("mt_colored", []);
  const saved = store.get("mt_saved_art", {});
  const grid = document.getElementById("art-grid");
  grid.innerHTML = "";
  allArts().forEach(a => {
    const card = document.createElement("div");
    card.className = "art-card";
    card.innerHTML = '<img src="' + (saved[a.id] || a.src) + '" alt="' + escapeHtml(a.title) + '" loading="lazy">' +
      '<div class="art-info"><h3>' + escapeHtml(a.title) + "</h3>" +
      (colored.includes(a.id) ? '<span class="xp-tag done">Painted</span>' : '<span class="xp-tag">+15 XP</span>') + "</div>";
    card.addEventListener("click", () => openStudio(a));
    grid.appendChild(card);
  });
}

// The painting lives on its own layer UNDER the black line art.
// Outlines are always drawn on top, so colour can never cover them
// and paint always looks like it stays inside the lines.
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
    // Work at most at 640px on the long edge: paint stays fast on
    // phones and the line art is still drawn crisply at display size.
    const MAX = 640;
    const k = Math.min(1, MAX / Math.max(lineImg.naturalWidth, lineImg.naturalHeight));
    artW = Math.max(1, Math.round(lineImg.naturalWidth * k));
    artH = Math.max(1, Math.round(lineImg.naturalHeight * k));
    canvas.width = artW; canvas.height = artH;
    paintCanvas.width = artW; paintCanvas.height = artH;
    undoStack = [];
    renderComposite();
    // Restore a painting saved earlier on this device (FR-47/FR-48).
    const kept = store.get("mt_saved_art", {})[art.id];
    if (kept) {
      const img = new Image();
      img.onload = () => { pctx.drawImage(img, 0, 0, artW, artH); renderComposite(); };
      img.src = kept;
    }
  };
  lineImg.src = art.src;
  show("view-color");
  document.getElementById("art-gallery").hidden = true;
  document.getElementById("studio").hidden = false;
}

// Colour wheel: any hue and saturation, plus a lightness slider.
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
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function pushUndo() {
  try {
    undoStack.push(pctx.getImageData(0, 0, artW, artH));
    if (undoStack.length > 15) undoStack.shift();
  } catch (e) {}
}

// Tap-to-fill: flood fill from the tapped pixel, stopping at dark
// lines. The fill runs on the visible picture, then only the changed
// pixels are copied onto the paint layer (under the line art).
function floodFill(sx, sy) {
  if (!artW || !artH) return; // image not ready yet
  sx = Math.max(0, Math.min(artW - 1, sx | 0));
  sy = Math.max(0, Math.min(artH - 1, sy | 0));
  const tol = 60;
  const comp = ctx.getImageData(0, 0, artW, artH);
  const d = comp.data;
  const si = (sy * artW + sx) * 4;
  const tr = d[si], tg = d[si + 1], tb = d[si + 2];
  const [fr, fg, fb] = hexToRgb(paintColor);
  if (Math.abs(tr - fr) < 10 && Math.abs(tg - fg) < 10 && Math.abs(tb - fb) < 10) return;
  if (tr < 70 && tg < 70 && tb < 70) return; // tapped a line: do nothing
  const seen = new Uint8Array(artW * artH);
  const stack = [sx, sy];
  const filled = [];
  const match = k => Math.abs(d[k] - tr) <= tol && Math.abs(d[k + 1] - tg) <= tol && Math.abs(d[k + 2] - tb) <= tol;
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= artW || y >= artH) continue;
    const p = y * artW + x;
    if (seen[p]) continue;
    seen[p] = 1;
    const k = p * 4;
    if (!match(k)) continue;
    filled.push(k);
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  if (!filled.length) return;
  pushUndo();
  const pimg = pctx.getImageData(0, 0, artW, artH);
  const pd = pimg.data;
  for (let i = 0; i < filled.length; i++) {
    const k = filled[i];
    pd[k] = fr; pd[k + 1] = fg; pd[k + 2] = fb; pd[k + 3] = 255;
  }
  pctx.putImageData(pimg, 0, 0);
  renderComposite();
}

// Turn a screen position into a pixel on the painting.
function canvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((clientX - rect.left) / rect.width * artW),
    y: Math.floor((clientY - rect.top) / rect.height * artH)
  };
}

// One press on the canvas: fill the area, or start a brush stroke.
function pressAt(x, y) {
  if (paintTool === "fill") { floodFill(x, y); return; }
  painting = true;
  pushUndo();
  pctx.strokeStyle = paintColor; pctx.fillStyle = paintColor;
  pctx.lineWidth = brushSize; pctx.lineCap = "round"; pctx.lineJoin = "round";
  pctx.beginPath(); pctx.moveTo(x, y); pctx.lineTo(x + 0.1, y + 0.1); pctx.stroke();
  renderComposite();
}

// Drag the brush to a new point.
function dragTo(x, y) {
  pctx.lineTo(x, y); pctx.stroke();
  renderComposite();
}

function bindPaint() {
  const c = document.getElementById("paint-canvas");
  if (!c) return;
  // Direct property assignment (not addEventListener) means exactly one
  // handler per event, no matter how many times this runs.
  c.onpointerdown = ev => {
    ev.preventDefault();
    if (!artW || !artH || !pctx) return; // image not ready yet
    try { c.setPointerCapture(ev.pointerId); } catch (e) {}
    const point = canvasPoint(ev.clientX, ev.clientY);
    pressAt(point.x, point.y);
  };
  c.onpointermove = ev => {
    if (!painting || paintTool !== "brush" || !pctx) return;
    ev.preventDefault();
    const point = canvasPoint(ev.clientX, ev.clientY);
    dragTo(point.x, point.y);
  };
  c.onpointerup = () => { painting = false; };
  c.onpointercancel = () => { painting = false; };
  // Touch fallback for older mobile browsers.
  c.ontouchstart = ev => {
    ev.preventDefault();
    if (!artW || !artH || !pctx || !ev.touches[0]) return;
    const point = canvasPoint(ev.touches[0].clientX, ev.touches[0].clientY);
    pressAt(point.x, point.y);
  };
  c.ontouchmove = ev => {
    if (!painting || paintTool !== "brush" || !pctx || !ev.touches[0]) return;
    ev.preventDefault();
    const point = canvasPoint(ev.touches[0].clientX, ev.touches[0].clientY);
    dragTo(point.x, point.y);
  };
  c.ontouchend = () => { painting = false; };
}

document.getElementById("tool-fill").addEventListener("click", () => {
  paintTool = "fill";
  document.getElementById("tool-fill").classList.add("active");
  document.getElementById("tool-brush").classList.remove("active");
});
document.getElementById("tool-brush").addEventListener("click", () => {
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

// Save keeps the painting on this device (FR-47/FR-48) and downloads
// a copy too. The gallery shows the saved painting afterwards.
document.getElementById("btn-save-art").addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  let kept = false;
  try {
    const saved = store.get("mt_saved_art", {});
    saved[currentArtId] = url;
    store.set("mt_saved_art", saved);
    kept = true;
  } catch (e) { kept = false; }
  const a = document.createElement("a");
  a.download = "mothertalk-" + currentArtId + ".png";
  a.href = url;
  a.click();
  alert(kept ? "Saved! Your painting is kept on this device — open it again any time." : "Downloaded! This device could not keep a copy (storage full).");
});

// Finish marks the artwork done and gives +15 XP, once per picture.
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
