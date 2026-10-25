/* ==========================================================================
   Living background  (one full-page <canvas id="bg">)

   Layer 1  Neural mesh. A web of nodes joined by links, behaving like fabric:
            every node is a spring tied to its home spot AND to its neighbours, so
            a push spreads outwards as a ripple. The mouse pushes and drags the
            cloth; clicking sends a shock-wave; when you stop moving, a ghost
            cursor keeps wandering and random ripples fire, so it never sits still.
            Signals (glowing dots) hop from node to node like activations.
   Layer 2  Floating tokens: tiny ML words and numbers drifting by.
   Layer 3  The hero "AI core" (Jarvis / Ultron style): a rotating wireframe
            neural sphere, HUD rings, orbiting labels. It follows the #orbSlot box
            in the hero and tilts with the mouse.

   Colours come from CSS (--net, --net2), so every colour mode and both themes
   work automatically. Pauses when the tab is hidden. With "reduce motion" on,
   it draws still frames only.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var root = document.documentElement;
  var slot = document.getElementById("orbSlot");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, dpr = 1;
  var maxDpr = Math.min(window.devicePixelRatio || 1, 1.75);
  var col = { a: "61,220,255", b: "123,140,255", dark: true };
  var t = 0, running = false, raf = 0, last = 0, slowFrames = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rgba(c, a) { return "rgba(" + c + "," + a.toFixed(3) + ")"; }
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  function readColors() {
    var cs = getComputedStyle(root);
    col.a = (cs.getPropertyValue("--net") || col.a).trim();
    col.b = (cs.getPropertyValue("--net2") || col.b).trim();
    col.dark = root.getAttribute("data-theme") !== "light";
  }

  /* ---------------------------------------------------------------- pointer */
  var mouse = { x: 0, y: 0, vx: 0, vy: 0, seen: false, inside: false, lastMove: -1e9, lx: 0, ly: 0, lt: 0 };
  var ghost = { x: 0, y: 0, vx: 0, vy: 0, k: 0 };
  var scrollKick = 0, lastScrollY = window.scrollY;

  window.addEventListener("pointermove", function (e) {
    var now = performance.now();
    if (mouse.seen) {
      var dt = Math.max(8, now - mouse.lt) / 1000;
      mouse.vx = mouse.vx * 0.6 + ((e.clientX - mouse.lx) / dt) * 0.4;
      mouse.vy = mouse.vy * 0.6 + ((e.clientY - mouse.ly) / dt) * 0.4;
    }
    mouse.x = mouse.lx = e.clientX; mouse.y = mouse.ly = e.clientY; mouse.lt = now;
    mouse.seen = mouse.inside = true; mouse.lastMove = now;
  }, { passive: true });
  function touchEnd(e) { if (e.pointerType === "touch") mouse.inside = false; }
  window.addEventListener("pointerup", touchEnd, { passive: true });
  window.addEventListener("pointercancel", touchEnd, { passive: true });
  window.addEventListener("pointerdown", function (e) { ripple(e.clientX, e.clientY, 240, 560); }, { passive: true });
  document.documentElement.addEventListener("mouseleave", function () { mouse.inside = false; });
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    scrollKick = clamp(scrollKick + (y - lastScrollY) * 0.2, -20, 20);
    lastScrollY = y;
    if (reduce) requestStatic();
  }, { passive: true });

  /* ------------------------------------------------------------ fabric mesh */
  var P = [], E = [], pulses = [], mesh = { cell: 88 };

  function buildMesh() {
    seed = 11;
    var cell = W < 640 ? 64 : W < 1100 ? 78 : 90;
    var rowH = cell * 0.866;
    var cols = Math.ceil(W / cell) + 3, rows = Math.ceil(H / rowH) + 3;
    mesh.cell = cell;
    P = []; E = []; pulses = [];
    var r, c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var hx = (c - 1) * cell + (r % 2 ? cell / 2 : 0) + (rnd() - 0.5) * cell * 0.5;
        var hy = (r - 1) * rowH + (rnd() - 0.5) * cell * 0.4;
        P.push({ hx: hx, hy: hy, x: hx, y: hy, dx: 0, dy: 0, vx: 0, vy: 0, fx: 0, fy: 0, e: 0, g: 0,
          ph: rnd() * 6.283, alt: rnd() < 0.18, n: [] });
      }
    }
    function link(i, j) { if (rnd() < 0.09) return; E.push([i, j]); P[i].n.push(j); P[j].n.push(i); }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var i = r * cols + c;
        if (c + 1 < cols) link(i, i + 1);
        if (r + 1 < rows) {
          var d1 = r % 2 ? c : c - 1, d2 = r % 2 ? c + 1 : c;
          if (d1 >= 0 && d1 < cols) link(i, (r + 1) * cols + d1);
          if (d2 >= 0 && d2 < cols) link(i, (r + 1) * cols + d2);
        }
      }
    }
  }

  function ripple(x, y, R, strength) {
    if (reduce) return;
    for (var i = 0; i < P.length; i++) {
      var p = P[i], dx = p.hx + p.dx - x, dy = p.hy + p.dy - y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < R) {
        var w = 1 - d / R, nx = dx / (d + 0.001), ny = dy / (d + 0.001);
        p.vx += nx * strength * w; p.vy += ny * strength * w; p.g = Math.max(p.g, w);
      }
    }
  }

  // push + drag the cloth around a point (the cursor, or the ghost cursor)
  function pointerForce(sx, sy, svx, svy, k) {
    var R = 175, R2 = R * R;
    for (var i = 0; i < P.length; i++) {
      var p = P[i], dx = p.hx + p.dx - sx, dy = p.hy + p.dy - sy, d2 = dx * dx + dy * dy;
      if (d2 < R2) {
        var d = Math.sqrt(d2), w = 1 - d / R; w *= w;
        var nx = dx / (d + 0.001), ny = dy / (d + 0.001);
        p.fx += (nx * 380 + svx * 1.05) * w * k;
        p.fy += (ny * 380 + svy * 1.05) * w * k;
      }
    }
  }

  var nextAuto = 2.5;
  function stepMesh(dt, now) {
    var K = 16, C = 55, D = 2.6, i, p;
    for (i = 0; i < P.length; i++) { p = P[i]; p.fx = -K * p.dx - D * p.vx; p.fy = -K * p.dy - D * p.vy; }
    for (i = 0; i < E.length; i++) {
      var a = P[E[i][0]], b = P[E[i][1]], fx = C * (b.dx - a.dx), fy = C * (b.dy - a.dy);
      a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
    }

    // real cursor
    if (mouse.seen && mouse.inside) {
      mouse.vx *= Math.pow(0.02, dt); mouse.vy *= Math.pow(0.02, dt);
      pointerForce(mouse.x, mouse.y, clamp(mouse.vx, -1600, 1600), clamp(mouse.vy, -1600, 1600), 1);
    }
    // ghost cursor: wanders when nobody is moving the mouse
    var idle = !(mouse.seen && mouse.inside) || now - mouse.lastMove > 2200;
    ghost.k += ((idle ? 1 : 0) - ghost.k) * (1 - Math.exp(-2 * dt));
    var gx = W * (0.5 + 0.36 * Math.sin(t * 0.21 + 0.6)), gy = H * (0.5 + 0.32 * Math.sin(t * 0.29 + 1.9));
    ghost.vx = (gx - ghost.x) / Math.max(dt, 0.001); ghost.vy = (gy - ghost.y) / Math.max(dt, 0.001);
    ghost.x = gx; ghost.y = gy;
    if (ghost.k > 0.02) pointerForce(gx, gy, clamp(ghost.vx, -500, 500), clamp(ghost.vy, -500, 500), 0.7 * ghost.k);

    // scroll sway
    if (Math.abs(scrollKick) > 0.5) {
      for (i = 0; i < P.length; i++) { p = P[i]; p.vy += scrollKick * (0.55 + 0.45 * Math.sin(p.hx * 0.012 + t)); }
      scrollKick = 0;
    }
    // random ripples
    if (t > nextAuto) { ripple(Math.random() * W, Math.random() * H, 150, 230); nextAuto = t + 3.5 + Math.random() * 3.5; }

    for (i = 0; i < P.length; i++) {
      p = P[i];
      p.vx += p.fx * dt; p.vy += p.fy * dt;
      p.dx = clamp(p.dx + p.vx * dt, -150, 150); p.dy = clamp(p.dy + p.vy * dt, -150, 150);
      var disp = Math.sqrt(p.dx * p.dx + p.dy * p.dy), sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.e = Math.min(1, disp / 48 + sp / 280);
      p.g *= Math.exp(-2.2 * dt);
      // drawn position = home + displacement + a slow ambient sway
      p.x = p.hx + p.dx + Math.sin(t * 0.35 + p.ph) * 5;
      p.y = p.hy + p.dy + Math.cos(t * 0.27 + p.ph * 1.3) * 5;
    }
  }

  function restPositions() {
    for (var i = 0; i < P.length; i++) { var p = P[i]; p.x = p.hx; p.y = p.hy; p.e = 0; p.g = 0; }
  }

  /* signals hopping along links */
  var spawnT = 0;
  function stepPulses(dt) {
    spawnT -= dt;
    var cap = W < 700 ? 9 : 17;
    if (spawnT <= 0 && pulses.length < cap && P.length) {
      spawnT = 0.28;
      var i = (Math.random() * P.length) | 0, p = P[i];
      if (p.n.length) pulses.push({ a: i, b: p.n[(Math.random() * p.n.length) | 0], t: 0, v: 170 + Math.random() * 110, hops: 2 + ((Math.random() * 5) | 0), alt: Math.random() < 0.3 });
    }
    for (var k = pulses.length - 1; k >= 0; k--) {
      var pl = pulses[k], a = P[pl.a], b = P[pl.b];
      var len = Math.hypot(b.x - a.x, b.y - a.y) + 1;
      pl.t += (pl.v * dt) / len;
      if (pl.t >= 1) {
        b.g = 1;
        var opts = b.n.filter(function (j) { return j !== pl.a; });
        if (--pl.hops <= 0 || !opts.length) { pulses.splice(k, 1); continue; }
        pl.a = pl.b; pl.b = opts[(Math.random() * opts.length) | 0]; pl.t = 0;
      }
    }
  }

  function drawMesh() {
    var i, p, e, a, b;
    var baseA = col.dark ? 0.12 : 0.17, nodeA = col.dark ? 0.42 : 0.5;
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(col.a, baseA);
    ctx.beginPath();
    for (i = 0; i < E.length; i++) { a = P[E[i][0]]; b = P[E[i][1]]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();

    // links that are being disturbed light up
    for (i = 0; i < E.length; i++) {
      a = P[E[i][0]]; b = P[E[i][1]];
      var en = Math.max(a.e, a.g, b.e, b.g);
      if (en > 0.13) {
        ctx.strokeStyle = rgba((a.alt || b.alt) ? col.b : col.a, Math.min(0.78, 0.1 + en * 0.75));
        ctx.lineWidth = 0.8 + en * 1.5;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // calm nodes: two batched paths (main colour, accent colour)
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = rgba(pass ? col.b : col.a, nodeA);
      ctx.beginPath();
      for (i = 0; i < P.length; i++) {
        p = P[i];
        if ((p.alt ? 1 : 0) !== pass || p.e > 0.13 || p.g > 0.1) continue;
        ctx.moveTo(p.x + 1.7, p.y); ctx.arc(p.x, p.y, 1.7, 0, 6.2832);
      }
      ctx.fill();
    }
    // excited nodes glow
    for (i = 0; i < P.length; i++) {
      p = P[i];
      var s = Math.max(p.e, p.g);
      if (s <= 0.13) continue;
      var c = p.alt ? col.b : col.a, r = 1.8 + s * 3.2;
      if (col.dark && s > 0.35) {
        var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4.2);
        gr.addColorStop(0, rgba(c, 0.5 * s)); gr.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r * 4.2, 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = rgba(c, 0.45 + 0.5 * s);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
    }

    // travelling signals
    for (i = 0; i < pulses.length; i++) {
      var pl = pulses[i], A = P[pl.a], B = P[pl.b], c2 = pl.alt ? col.b : col.a;
      var x = A.x + (B.x - A.x) * pl.t, y = A.y + (B.y - A.y) * pl.t;
      var t0 = Math.max(0, pl.t - 0.28), tx = A.x + (B.x - A.x) * t0, ty = A.y + (B.y - A.y) * t0;
      ctx.strokeStyle = rgba(c2, 0.6); ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      if (col.dark) {
        var g2 = ctx.createRadialGradient(x, y, 0, x, y, 11);
        g2.addColorStop(0, rgba(c2, 0.9)); g2.addColorStop(1, rgba(c2, 0));
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.2832); ctx.fill();
      } else {
        ctx.fillStyle = rgba(c2, 0.85); ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.2832); ctx.fill();
      }
    }

    // soft light under the cursor
    if (mouse.seen && mouse.inside && !reduce) {
      var hg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 230);
      hg.addColorStop(0, rgba(col.a, col.dark ? 0.12 : 0.07)); hg.addColorStop(1, rgba(col.a, 0));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 230, 0, 6.2832); ctx.fill();
    }
  }

  /* --------------------------------------------------------- floating tokens */
  var TOKENS = ["ReLU", "∇L", "softmax(z)", "tensor[3,224,224]", "epoch 042/100", "0.9150", "Adam", "attention", "embed(768)",
    "argmax", "σ(x)", "MMR k=4", "batch 32", "lr 1e-5", "ROC-AUC", "dropout 0.3", "ŷ = f(x)", "0101", "∑ wᵢxᵢ", "[CLS]"];
  var tokens = [];
  function buildTokens() {
    tokens = [];
    var n = W < 700 ? 8 : 16;
    for (var i = 0; i < n; i++) {
      tokens.push({ s: TOKENS[(i * 7 + 3) % TOKENS.length], x: Math.random(), y: Math.random(), v: 0.004 + Math.random() * 0.007,
        ph: Math.random() * 6.28, a: 0.11 + Math.random() * 0.1 });
    }
  }
  function drawTokens() {
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = "middle";
    for (var i = 0; i < tokens.length; i++) {
      var k = tokens[i];
      var px = ((((k.x + t * k.v) % 1.25) + 1.25) % 1.25 - 0.12) * W;
      var py = k.y * H + Math.sin(t * 0.35 + k.ph) * 16;
      ctx.fillStyle = rgba(i % 3 ? col.a : col.b, col.dark ? k.a : k.a + 0.05);
      ctx.fillText(k.s, px, py);
    }
  }

  /* -------------------------------------------------------------- the AI core */
  var orb = { pts: [], edges: [], yaw: 0, pitch: 0.3, ty: 0, tp: 0, boost: 0, pulses: [], sat: ["CNN", "RAG", "LLM", "XTTS", "ViT"], hud: 0, hudT: 0, loss: 0.021 };

  function buildOrb() {
    orb.pts = []; orb.edges = []; orb.pulses = [];
    var i, N = 96, M = 26;
    for (i = 0; i < N; i++) {
      var y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      orb.pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, ph: Math.random() * 6.28, sh: 1, in: false });
    }
    for (i = 0; i < M; i++) {
      var y2 = 1 - (2 * (i + 0.5)) / M, r2 = Math.sqrt(1 - y2 * y2), th2 = i * 2.399963 + 0.7;
      orb.pts.push({ x: Math.cos(th2) * r2 * 0.48, y: y2 * 0.48, z: Math.sin(th2) * r2 * 0.48, ph: Math.random() * 6.28, sh: 0.48, in: true });
    }
    var seen = {};
    function add(a, b) { var k = a < b ? a + "_" + b : b + "_" + a; if (!seen[k]) { seen[k] = 1; orb.edges.push([a, b]); } }
    function nearest(i, lo, hi, cnt) {
      var p = orb.pts[i], ds = [];
      for (var j2 = lo; j2 < hi; j2++) {
        if (j2 === i) continue;
        var q = orb.pts[j2]; ds.push([(p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y) + (p.z - q.z) * (p.z - q.z), j2]);
      }
      ds.sort(function (a, b) { return a[0] - b[0]; });
      return ds.slice(0, cnt).map(function (d) { return d[1]; });
    }
    for (i = 0; i < N; i++) nearest(i, 0, N, 3).forEach(function (j3) { add(i, j3); });
    for (i = N; i < N + M; i++) {
      nearest(i, N, N + M, 2).forEach(function (j3) { add(i, j3); });
      nearest(i, 0, N, 2).forEach(function (j3) { add(i, j3); });
    }
  }

  function projectOrb(cx, cy, R, dt) {
    var tgtYaw = mouse.seen && mouse.inside ? (mouse.x / W - 0.5) * 1.3 : Math.sin(t * 0.25) * 0.35;
    var tgtPitch = 0.28 + (mouse.seen && mouse.inside ? (mouse.y / H - 0.5) * 0.55 : Math.sin(t * 0.2) * 0.12);
    var k = 1 - Math.exp(-3 * dt);
    orb.ty += (tgtYaw - orb.ty) * k; orb.tp += (tgtPitch - orb.tp) * k;
    var near = mouse.seen && mouse.inside && Math.hypot(mouse.x - cx, mouse.y - cy) < R * 2.1 ? 1 : 0;
    orb.boost += (near - orb.boost) * (1 - Math.exp(-3 * dt));
    orb.yaw += dt * (0.2 + orb.boost * 0.7);
    var yaw = orb.yaw + orb.ty, cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(orb.tp), sp = Math.sin(orb.tp);
    for (var i = 0; i < orb.pts.length; i++) {
      var p = orb.pts[i], b = 1 + 0.045 * Math.sin(t * 1.3 + p.ph);
      var x1 = p.x * cyw + p.z * syw, z1 = -p.x * syw + p.z * cyw;
      var y1 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
      var persp = 1 / (1 - 0.26 * z2), s = R * b * persp;
      p.sx = cx + x1 * s; p.sy = cy + y1 * s; p.d = clamp((z2 / Math.max(p.sh, 0.01) + 1) / 2, 0, 1) * (p.in ? 0.8 : 1);
      p.g = (p.g || 0) * Math.exp(-3 * dt);
    }
  }

  function drawOrb(dt, vis) {
    var r = slot.getBoundingClientRect();
    if (r.width < 60 || r.bottom < -20 || r.top > H) return;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = Math.min(r.width, r.height) * 0.265;
    var fade = clamp((r.bottom - 30) / 240, 0, 1) * vis;
    if (fade <= 0.01) return;
    var dk = col.dark, i, p, e;
    var A = dk ? 1 : 0.9;
    projectOrb(cx, cy, R, dt);

    // glow behind the core
    var pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
    cg.addColorStop(0, rgba(col.a, (dk ? 0.28 : 0.13) * fade * (0.8 + 0.2 * pulse))); cg.addColorStop(1, rgba(col.a, 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 6.2832); ctx.fill();

    // sonar rings from the core
    for (i = 0; i < 2; i++) {
      var ph = (t * 0.4 + i * 0.5) % 1;
      ctx.strokeStyle = rgba(col.a, (1 - ph) * 0.3 * fade); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R * (0.15 + 1.05 * ph), 0, 6.2832); ctx.stroke();
    }

    // network links (back ones dim, front ones bright)
    ctx.lineWidth = 1;
    for (i = 0; i < orb.edges.length; i++) {
      var a = orb.pts[orb.edges[i][0]], b = orb.pts[orb.edges[i][1]], d = (a.d + b.d) / 2;
      ctx.strokeStyle = rgba(a.in || b.in ? col.b : col.a, (0.08 + 0.5 * d * d + 0.6 * Math.max(a.g, b.g)) * fade * A);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    // nodes
    for (i = 0; i < orb.pts.length; i++) {
      p = orb.pts[i];
      var rad = 1.1 + 2.2 * p.d + 2 * p.g;
      ctx.fillStyle = rgba(p.in ? col.b : col.a, (0.3 + 0.7 * p.d + p.g) * fade * A);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, rad, 0, 6.2832); ctx.fill();
    }
    // signals running through the core
    if (!reduce && orb.pulses.length < 7 && Math.random() < 0.09) {
      var e0 = orb.edges[(Math.random() * orb.edges.length) | 0];
      orb.pulses.push({ a: e0[0], b: e0[1], t: 0, hops: 3 + ((Math.random() * 4) | 0) });
    }
    for (i = orb.pulses.length - 1; i >= 0; i--) {
      var pl = orb.pulses[i], pa = orb.pts[pl.a], pb = orb.pts[pl.b];
      pl.t += dt * 1.6;
      if (pl.t >= 1) {
        pb.g = 1;
        var cands = [];
        for (var q = 0; q < orb.edges.length; q++) {
          var ee = orb.edges[q];
          if (ee[0] === pl.b && ee[1] !== pl.a) cands.push(ee[1]); else if (ee[1] === pl.b && ee[0] !== pl.a) cands.push(ee[0]);
        }
        if (--pl.hops <= 0 || !cands.length) { orb.pulses.splice(i, 1); continue; }
        pl.a = pl.b; pl.b = cands[(Math.random() * cands.length) | 0]; pl.t = 0; continue;
      }
      var px = pa.sx + (pb.sx - pa.sx) * pl.t, py = pa.sy + (pb.sy - pa.sy) * pl.t;
      if (dk) {
        var pg = ctx.createRadialGradient(px, py, 0, px, py, 9);
        pg.addColorStop(0, rgba(col.b, 0.95 * fade)); pg.addColorStop(1, rgba(col.b, 0));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 9, 0, 6.2832); ctx.fill();
      } else {
        ctx.fillStyle = rgba(col.b, 0.9 * fade); ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.2832); ctx.fill();
      }
    }

    // nucleus
    var ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22);
    ng.addColorStop(0, rgba(col.a, (dk ? 0.95 : 0.7) * fade)); ng.addColorStop(1, rgba(col.a, 0));
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(cx, cy, R * (0.2 + 0.03 * pulse), 0, 6.2832); ctx.fill();

    // HUD rings
    var spd = 1 + orb.boost * 1.6;
    ctx.save(); ctx.translate(cx, cy);
    ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(col.a, 0.5 * fade * A);
    ctx.setLineDash([2, 9]); ctx.lineDashOffset = -t * 14 * spd;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.28, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);

    ctx.lineWidth = 2.6; ctx.strokeStyle = rgba(col.a, 0.62 * fade * A); ctx.lineCap = "round";
    for (i = 0; i < 3; i++) {
      var s0 = t * 0.28 * spd + i * 2.0944;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.5, s0, s0 + 0.95); ctx.stroke();
    }
    ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(col.b, 0.5 * fade * A);
    for (i = 0; i < 2; i++) {
      var s1 = -t * 0.4 * spd + i * 3.1416;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.62, s1, s1 + 0.45); ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(col.a, 0.16 * fade * A);
    ctx.beginPath(); ctx.arc(0, 0, R * 1.82, 0, 6.2832); ctx.stroke();
    // tick marks
    ctx.strokeStyle = rgba(col.a, 0.4 * fade * A); ctx.beginPath();
    var rot = -t * 0.08 * spd;
    for (i = 0; i < 72; i++) {
      var ang = rot + (i / 72) * 6.2832, len = i % 6 === 0 ? 8 : 3.5, r1 = R * 1.82, r2 = r1 + len;
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1); ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
    }
    ctx.stroke();

    // orbiting labelled satellites
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = "middle";
    for (i = 0; i < orb.sat.length; i++) {
      var sa = t * (0.22 + i * 0.045) * spd * (i % 2 ? -1 : 1) + i * 1.2566, sr = R * (1.5 + (i % 2) * 0.12);
      var sx = Math.cos(sa) * sr, sy = Math.sin(sa) * sr;
      if (dk) {
        var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
        sg.addColorStop(0, rgba(col.b, 0.8 * fade)); sg.addColorStop(1, rgba(col.b, 0));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = rgba(col.b, 0.95 * fade * A); ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = rgba(col.a, 0.8 * fade * A); ctx.fillText(orb.sat[i], sx + 7, sy - 8);
    }
    ctx.restore();

    // corner brackets + readout
    var bl = 18;
    ctx.strokeStyle = rgba(col.a, 0.4 * fade * A); ctx.lineWidth = 1.4; ctx.beginPath();
    ctx.moveTo(r.left, r.top + bl); ctx.lineTo(r.left, r.top); ctx.lineTo(r.left + bl, r.top);
    ctx.moveTo(r.right - bl, r.top); ctx.lineTo(r.right, r.top); ctx.lineTo(r.right, r.top + bl);
    ctx.moveTo(r.left, r.bottom - bl); ctx.lineTo(r.left, r.bottom); ctx.lineTo(r.left + bl, r.bottom);
    ctx.moveTo(r.right - bl, r.bottom); ctx.lineTo(r.right, r.bottom); ctx.lineTo(r.right, r.bottom - bl);
    ctx.stroke();
    orb.hudT -= dt;
    if (orb.hudT <= 0) { orb.hudT = 0.14; orb.loss = 0.018 + 0.012 * (0.5 + 0.5 * Math.sin(t * 0.7)) + Math.random() * 0.004; }
    ctx.font = '10.5px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = rgba(col.a, 0.75 * fade * A);
    ctx.textAlign = "left"; ctx.fillText("NEURAL CORE // ONLINE", r.left + 8, r.bottom - 10);
    ctx.textAlign = "right"; ctx.fillText("loss " + orb.loss.toFixed(4), r.right - 8, r.bottom - 10);
    ctx.fillStyle = rgba(col.b, 0.65 * fade * A);
    ctx.textAlign = "left"; ctx.fillText("RAG · CNN · LLM", r.left + 8, r.top + 18);
    ctx.textAlign = "right"; ctx.fillText("acc 0.915", r.right - 8, r.top + 18);
    ctx.textAlign = "left";
  }

  /* ---------------------------------------------------------------- frames */
  function paintScene(dt, now, animated) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = col.dark ? "lighter" : "source-over";
    if (animated) { stepMesh(dt, now); stepPulses(dt); } else restPositions();
    drawTokens();
    drawMesh();
    if (slot) drawOrb(animated ? dt : 0.0001, 1);
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now; t += dt;
    // if the device struggles for a while, drop to 1x pixel density once
    if (dt > 0.03) { if (++slowFrames > 40 && dpr > 1) { dpr = 1; sizeCanvas(); slowFrames = 0; } } else if (slowFrames > 0) slowFrames--;
    paintScene(dt, now, true);
    raf = requestAnimationFrame(frame);
  }

  function start() { if (reduce || running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  var staticQueued = false;
  function requestStatic() {
    if (staticQueued) return; staticQueued = true;
    requestAnimationFrame(function () { staticQueued = false; paintScene(0.0001, 0, false); });
  }

  function sizeCanvas() {
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  function resize(force) {
    var nw = window.innerWidth, nh = window.innerHeight;
    var rebuild = force || !P.length || Math.abs(nw - W) > 20 || Math.abs(nh - H) > 160;
    W = nw; H = nh;
    dpr = Math.min(maxDpr, dpr || maxDpr); if (dpr < 1) dpr = 1;
    sizeCanvas();
    if (rebuild) { buildMesh(); buildTokens(); }
    if (reduce) requestStatic();
  }

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resize(false); }, 120); });
  window.addEventListener("themechange", function () { readColors(); if (reduce) requestStatic(); });
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

  readColors();
  dpr = maxDpr;
  buildOrb();
  resize(true);
  if (reduce) requestStatic(); else start();
})();
