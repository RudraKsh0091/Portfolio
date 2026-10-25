/* ==========================================================================
   Tech stack map
   Logo bubbles that drift around the box and bounce off its walls (and each other).
   Bubble size = how many of my projects use the tool. Hover a bubble to pause it,
   click it to light up everything it connects to, or pick a category below.

   How it works (useful to know if you're asked in an interview):
   - data.js holds the tools, the links between them and the projects.
   - icons.js holds the logo for every tool (real brand logos, plus small outline
     icons for ideas like RAG or CNN that have no logo).
   - Every frame each bubble moves by its velocity. When it hits a wall, or another
     bubble, the matching velocity component is reflected (an elastic bounce, with
     bigger bubbles pushing smaller ones). The connecting lines just follow.
   ========================================================================== */
(function () {
  "use strict";

  var P = window.PORTFOLIO;
  var svg = document.getElementById("stackSvg");
  if (!P || !svg) return;

  var NS = "http://www.w3.org/2000/svg";
  var ICONS = window.STACK_ICONS || {};
  var root = document.documentElement;
  var canvasEl = document.getElementById("stackCanvas");
  var panel = document.getElementById("stackPanel");
  var legend = document.getElementById("stackLegend");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var G = P.graph;
  var catById = {};
  P.categories.forEach(function (c) { catById[c.id] = c; });

  var state = { mode: "none", id: null };
  var nodes = [], nodeById = {}, edgeEls = [], bgWeb = null, W = 0, H = 0, compact = false;
  var raf = null, running = false, visible = true, lastT = 0;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Logo colours that stay readable on both themes ---------- */
  function hexToRgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lum(hex) {
    var c = hexToRgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function mix(hex, to, amt) {
    var a = hexToRgb(hex), b = hexToRgb(to);
    return "rgb(" + a.map(function (v, i) { return Math.round(v + (b[i] - v) * amt); }).join(",") + ")";
  }
  function iconColor(hex) {
    var light = root.getAttribute("data-theme") === "light", L = lum(hex);
    if (light) return L > 0.5 ? mix(hex, "#000000", 0.5) : L > 0.3 ? mix(hex, "#000000", 0.25) : hex;
    return L < 0.12 ? mix(hex, "#ffffff", 0.62) : L < 0.2 ? mix(hex, "#ffffff", 0.32) : hex;
  }
  function paintIcons() {
    nodes.forEach(function (n) {
      var ic = ICONS[n.id];
      if (ic && ic.t === "f" && n.g) n.g.style.setProperty("--ic", iconColor(ic.c));
    });
  }

  /* ---------- Layout: random start positions with no overlaps ---------- */
  function layout() {
    var rect = canvasEl.getBoundingClientRect();
    W = Math.max(280, Math.round(rect.width));
    H = Math.max(420, Math.round(rect.height));
    compact = W < 600;

    var s = Math.max(0.82, Math.min(1, W / 840));
    var rnd = mulberry32(11);

    nodes = P.stack.map(function (n) {
      var usage = G.usage[n.id].length;
      var r = (23 + usage * 4.2) * s;
      var ang = rnd() * 6.2832, sp = (13 + rnd() * 15) * (compact ? 0.85 : 1);   // px per second: slow drift
      return {
        id: n.id, label: n.label, cat: n.cat, usage: usage, r: r, hub: n.id === G.hub,
        x: r + 4 + rnd() * (W - 2 * r - 8), y: r + 4 + rnd() * (H - 2 * r - 22),
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, sp: sp, hover: false
      };
    });
    nodeById = {};
    nodes.forEach(function (n) { nodeById[n.id] = n; });

    for (var it = 0; it < 260; it++) {          // push overlapping bubbles apart before the first frame
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var p = nodes[a], q = nodes[b], dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var min = p.r + q.r + 10;
          if (d < min) { var f = (min - d) / 2 / d; p.x -= dx * f; p.y -= dy * f; q.x += dx * f; q.y += dy * f; }
        }
      }
      nodes.forEach(wallClamp);
    }
  }

  function wallClamp(n) {
    n.x = Math.max(n.r + 3, Math.min(W - n.r - 3, n.x));
    n.y = Math.max(n.r + 3, Math.min(H - n.r - 16, n.y));
  }

  /* ---------- Physics ---------- */
  function step(dt) {
    var slow = state.mode === "none" ? 1 : 0.5, i, j, n;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.hover) continue;                    // a hovered bubble pauses so it is easy to click
      n.x += n.vx * dt * slow; n.y += n.vy * dt * slow;
      // bounce off the walls: flip the velocity component that hit
      if (n.x < n.r + 3) { n.x = n.r + 3; n.vx = Math.abs(n.vx); }
      else if (n.x > W - n.r - 3) { n.x = W - n.r - 3; n.vx = -Math.abs(n.vx); }
      if (n.y < n.r + 3) { n.y = n.r + 3; n.vy = Math.abs(n.vy); }
      else if (n.y > H - n.r - 16) { n.y = H - n.r - 16; n.vy = -Math.abs(n.vy); }
    }
    // bounce off each other: elastic collision, mass ~ area
    for (i = 0; i < nodes.length; i++) {
      for (j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r + 3;
        if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
        var d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        var d = Math.sqrt(d2) || 0.01, nx = dx / d, ny = dy / d;
        var ia = a.hover ? 0 : 1 / (a.r * a.r), ib = b.hover ? 0 : 1 / (b.r * b.r), tot = ia + ib;
        if (!tot) continue;
        var over = min - d;
        a.x -= nx * over * ia / tot; a.y -= ny * over * ia / tot;
        b.x += nx * over * ib / tot; b.y += ny * over * ib / tot;
        var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          var imp = -2 * vn / tot;
          a.vx -= imp * ia * nx; a.vy -= imp * ia * ny;
          b.vx += imp * ib * nx; b.vy += imp * ib * ny;
        }
        wallClamp(a); wallClamp(b);
      }
    }
    // keep every bubble drifting slowly: ease its speed back toward its own target
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (sp < 0.01) { n.vx = n.sp; n.vy = 0; continue; }
      var f = 1 + (n.sp / sp - 1) * Math.min(1, dt * 0.8);
      n.vx *= f; n.vy *= f;
    }
  }

  /* ---------- Build SVG ---------- */
  function build() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.classList.toggle("compact", compact);

    var gEdges = el("g", {}, svg);
    var gNodes = el("g", {}, svg);

    bgWeb = el("path", { "class": "edge" }, gEdges);          // all the faint links, drawn as one path
    edgeEls = G.edges.map(function (e) {
      return el("line", { "class": "edge" + (e.hub ? " edge--hub" : ""), style: "display:none" }, gEdges);
    });

    nodes.forEach(function (n) {
      var g = el("g", { "class": "node", tabindex: 0, role: "button", "data-id": n.id,
        "aria-label": n.label + ", " + catById[n.cat].label + ", used in " + n.usage + " of " + P.projects.length + " projects" }, gNodes);
      g.style.setProperty("--nc", "var(--c-" + n.cat + ")");
      el("circle", { "class": "halo", r: n.r + 12 }, g);
      el("circle", { "class": "core", r: n.r }, g);
      el("circle", { "class": "ring", r: n.r + 6 }, g);

      var ic = ICONS[n.id];
      if (ic) {
        var k = (n.r * 1.08) / ic.vb, ig = el("g", { "class": "ico ico--" + ic.t, transform: "translate(" + (-ic.vb * k / 2).toFixed(2) + "," + (-ic.vb * k / 2).toFixed(2) + ") scale(" + k.toFixed(4) + ")" }, g);
        if (ic.t === "f") ic.d.forEach(function (d) { el("path", { d: d }, ig); });
        else ig.innerHTML = ic.svg;
      }
      var t = el("text", { y: n.r + 13 }, g);
      t.textContent = n.label;

      g.addEventListener("mouseenter", function () { n.hover = true; });
      g.addEventListener("mouseleave", function () { n.hover = false; });
      g.addEventListener("focus", function () { n.hover = true; });
      g.addEventListener("blur", function () { n.hover = false; });
      n.g = g;
    });
    paintIcons();
    apply();
  }

  function render(force) {
    var i, n;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.g.setAttribute("transform", "translate(" + n.x.toFixed(1) + "," + n.y.toFixed(1) + ")");
    }
    if (state.mode === "none") {
      var d = "";
      for (i = 0; i < G.edges.length; i++) {
        var e = G.edges[i];
        if (e.hub) continue;
        var a = nodeById[e.a], b = nodeById[e.b];
        d += "M" + a.x.toFixed(0) + " " + a.y.toFixed(0) + "L" + b.x.toFixed(0) + " " + b.y.toFixed(0);
      }
      bgWeb.setAttribute("d", d);
    } else {
      for (i = 0; i < G.edges.length; i++) {
        var line = edgeEls[i];
        if (!line.classList.contains("is-on")) continue;
        var ea = nodeById[G.edges[i].a], eb = nodeById[G.edges[i].b];
        line.setAttribute("x1", ea.x.toFixed(1)); line.setAttribute("y1", ea.y.toFixed(1));
        line.setAttribute("x2", eb.x.toFixed(1)); line.setAttribute("y2", eb.y.toFixed(1));
      }
    }
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    step(dt); render();
    if (running) raf = requestAnimationFrame(loop);
  }
  function start() { if (!reduce && !running && visible && !document.hidden) { running = true; lastT = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* ---------- Selection ---------- */
  function sets() {
    var on = {}, edgeOn = {}, i;
    if (state.mode === "node") {
      on[state.id] = true;
      G.neighbors(state.id).forEach(function (id) { on[id] = true; });
      G.edges.forEach(function (e, idx) { if (e.a === state.id || e.b === state.id) edgeOn[idx] = true; });
    } else if (state.mode === "cat") {
      nodes.forEach(function (n) { if (n.cat === state.id) on[n.id] = true; });
      G.edges.forEach(function (e, idx) { if (on[e.a] && on[e.b] && !e.hub) edgeOn[idx] = true; });
    } else if (state.mode === "project") {
      var p = P.project(state.id);
      p.stack.forEach(function (id) { on[id] = true; });
      G.edges.forEach(function (e, idx) { if (on[e.a] && on[e.b] && !e.hub) edgeOn[idx] = true; });
    }
    return { on: on, edgeOn: edgeOn };
  }

  function apply() {
    var s = sets();
    var any = state.mode !== "none";
    svg.classList.toggle("has-sel", any);
    nodes.forEach(function (n) {
      n.g.classList.toggle("is-on", !!s.on[n.id]);
      n.g.classList.toggle("is-sel", state.mode === "node" && state.id === n.id);
      n.g.setAttribute("aria-pressed", String(state.mode === "node" && state.id === n.id));
    });
    edgeEls.forEach(function (l, i) {
      var on = !!s.edgeOn[i];
      l.classList.toggle("is-on", on);
      l.style.display = on ? "" : "none";
    });
    bgWeb.style.display = any ? "none" : "";
    render(true);
    renderPanel();
    Array.prototype.forEach.call(legend.children, function (b) {
      if (b.hasAttribute("data-cat")) b.setAttribute("aria-pressed", String(state.mode === "cat" && state.id === b.getAttribute("data-cat")));
    });
  }

  function select(id) {
    if (!nodeById[id]) return;
    state = (state.mode === "node" && state.id === id) ? { mode: "none", id: null } : { mode: "node", id: id };
    apply();
  }
  function selectCat(id) {
    state = (state.mode === "cat" && state.id === id) ? { mode: "none", id: null } : { mode: "cat", id: id };
    apply();
  }
  function selectProject(id) {
    if (!P.project(id)) return;
    state = { mode: "project", id: P.project(id).id };
    apply();
  }
  function clear() { state = { mode: "none", id: null }; apply(); }

  /* ---------- Panel ---------- */
  function dotChip(n, attr) {
    var b = h("button", "chip");
    b.type = "button";
    b.setAttribute(attr[0], attr[1]);
    b.innerHTML = '<span class="chip__dot" style="--dot:var(--c-' + n.cat + ')"></span>' + n.label;
    return b;
  }

  function projButtons(ids) {
    var wrap = h("div", "panel__list");
    ids.forEach(function (pid) {
      var p = P.project(pid);
      var b = h("button", "panel__proj", "<span>" + p.title + "</span><small>case study &rarr;</small>");
      b.type = "button";
      b.setAttribute("data-open", p.id);
      wrap.appendChild(b);
    });
    return wrap;
  }

  function renderPanel() {
    panel.innerHTML = "";
    var clearBtn = function () {
      var b = h("button", "btn btn--ghost btn--small panel__clear", "Clear selection");
      b.type = "button"; b.setAttribute("data-clear", "1");
      return b;
    };

    if (state.mode === "node") {
      var n = nodeById[state.id];
      var nb = G.neighbors(n.id).map(function (id) { return nodeById[id]; })
        .sort(function (a, b) { return a.cat === b.cat ? a.label.localeCompare(b.label) : (a.cat < b.cat ? -1 : 1); });
      panel.appendChild(h("div", "panel__eyebrow", '<span class="chip__dot" style="--dot:var(--c-' + n.cat + ')"></span>' + catById[n.cat].label));
      panel.appendChild(h("h3", "panel__title", n.label));
      panel.appendChild(h("p", "panel__text", n.usage
        ? "Used in <strong>" + n.usage + " of " + P.projects.length + "</strong> projects."
        : "Part of my toolkit, but not tied to one of the showcased projects."));
      if (n.usage) { panel.appendChild(h("div", "panel__h", "Where I used it")); panel.appendChild(projButtons(G.usage[n.id])); }
      if (nb.length) {
        panel.appendChild(h("div", "panel__h", "Connected to (" + nb.length + ")"));
        var chips = h("div", "chips");
        nb.forEach(function (m) { chips.appendChild(dotChip(m, ["data-sel", m.id])); });
        panel.appendChild(chips);
      }
      panel.appendChild(clearBtn());
    } else if (state.mode === "cat") {
      var cat = catById[state.id];
      var members = nodes.filter(function (m) { return m.cat === state.id; }).sort(function (a, b) { return b.usage - a.usage; });
      panel.appendChild(h("div", "panel__eyebrow", "Category"));
      panel.appendChild(h("h3", "panel__title", cat.label));
      panel.appendChild(h("p", "panel__text", members.length + " tools. Select one to see how it connects to the rest."));
      var cc = h("div", "chips");
      members.forEach(function (m) { cc.appendChild(dotChip(m, ["data-sel", m.id])); });
      panel.appendChild(cc);
      panel.appendChild(clearBtn());
    } else if (state.mode === "project") {
      var p = P.project(state.id);
      panel.appendChild(h("div", "panel__eyebrow", "Project stack"));
      panel.appendChild(h("h3", "panel__title", p.title));
      panel.appendChild(h("p", "panel__text", "The " + p.stack.length + " tools used together in this project, highlighted on the map."));
      var pc = h("div", "chips");
      p.stack.forEach(function (id) { pc.appendChild(dotChip(nodeById[id], ["data-sel", id])); });
      panel.appendChild(pc);
      panel.appendChild(projButtons([p.id]));
      panel.appendChild(clearBtn());
    } else {
      panel.appendChild(h("div", "panel__eyebrow", "How to read this"));
      panel.appendChild(h("h3", "panel__title", "Pick a circle"));
      panel.appendChild(h("p", "panel__text",
        "Click any tool to light up what it connects to: tools used together in a project, and tools that naturally go together, like Keras and TensorFlow."));
      panel.appendChild(h("div", "panel__h", "Circle size"));
      panel.appendChild(h("div", "size-key",
        '<i style="width:14px;height:14px"></i> 0 projects <i style="width:24px;height:24px"></i> 3 <i style="width:36px;height:36px"></i> all ' + P.projects.length));
      panel.appendChild(h("div", "panel__h", "Or start from a project"));
      var list = h("div", "panel__list");
      P.projects.forEach(function (pr) {
        if (pr.stack.length < 3) return;
        var b = h("button", "panel__proj", "<span>" + pr.title + "</span><small>" + pr.stack.length + " tools</small>");
        b.type = "button"; b.setAttribute("data-proj", pr.id);
        list.appendChild(b);
      });
      panel.appendChild(list);
      panel.appendChild(h("p", "panel__text mono muted", nodes.length + " tools · " + P.categories.length + " categories"));
    }
  }

  /* ---------- Events ---------- */
  svg.addEventListener("click", function (e) {
    var g = e.target.closest ? e.target.closest(".node") : null;
    if (g) select(g.getAttribute("data-id"));
    else if (state.mode !== "none") clear();
  });
  svg.addEventListener("keydown", function (e) {
    var g = e.target.closest ? e.target.closest(".node") : null;
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(g.getAttribute("data-id")); }
    if (e.key === "Escape") clear();
  });

  panel.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.hasAttribute("data-sel")) { state = { mode: "node", id: t.getAttribute("data-sel") }; apply(); }
    else if (t.hasAttribute("data-open") && window.openCase) window.openCase(t.getAttribute("data-open"));
    else if (t.hasAttribute("data-proj")) selectProject(t.getAttribute("data-proj"));
    else if (t.hasAttribute("data-clear")) clear();
  });

  P.categories.forEach(function (c) {
    var b = h("button", "legend__btn", "<i></i>" + c.label);
    b.type = "button";
    b.setAttribute("data-cat", c.id);
    b.setAttribute("aria-pressed", "false");
    b.style.setProperty("--dot", "var(--c-" + c.id + ")");
    b.addEventListener("click", function () { selectCat(c.id); });
    legend.appendChild(b);
  });

  var lbl = h("button", "legend__btn legend__btn--toggle", "<i></i>Labels");
  lbl.type = "button"; lbl.setAttribute("aria-pressed", "true");
  svg.classList.add("show-labels");
  lbl.addEventListener("click", function () {
    var on = lbl.getAttribute("aria-pressed") !== "true";
    lbl.setAttribute("aria-pressed", String(on));
    svg.classList.toggle("show-labels", on);
  });
  legend.appendChild(lbl);

  window.addEventListener("themechange", paintIcons);

  /* ---------- Init, resize, visibility ---------- */
  function init() { layout(); build(); start(); }
  init();

  var lastW = W, rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = Math.round(canvasEl.getBoundingClientRect().width);
      if (Math.abs(w - lastW) < 24) return;   // ignore mobile URL-bar resizes
      lastW = w; stop(); layout(); build(); start();
    }, 200);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.05 }).observe(canvasEl);
  }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

  window.StackMap = { select: select, selectProject: selectProject, selectCat: selectCat, clear: clear };
})();
