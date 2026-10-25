/* ==========================================================================
   Rudraksh Garg: Portfolio v2, main interactions (vanilla JS)
   1 theme · 2 nav + progress · 3 render project cards · 4 case-study modal
   5 render journey · 6 reveal + count-up · 7 typing · 8 filters + card tilt
   9 contact form · 10 misc
   Content lives in js/data.js; this file turns it into DOM.
   ========================================================================== */
(function () {
  "use strict";

  var P = window.PORTFOLIO;
  var CFG = window.SITE_CONFIG || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  var isLive = function (p) { return /live|deployed/i.test(p.status); };

  /* ---------- 1. Theme (dark / light) + colour mode (accent) ---------- */
  var themeBtn = $("#themeToggle");
  var metaTheme = $('meta[name="theme-color"]');
  var ACCENTS = ["jarvis", "ultron", "matrix", "nebula", "solar"];
  var palBtn = $("#paletteBtn"), palPop = $("#palettePop");

  function defaultAccent(t) { return t === "light" ? "ultron" : "jarvis"; }   // light mode starts burgundy, dark starts cyan
  function savedAccent() {
    try { var a = localStorage.getItem("accent"); return ACCENTS.indexOf(a) > -1 ? a : null; } catch (e) { return null; }
  }
  function applyLook(t, a) {
    root.setAttribute("data-theme", t);
    root.setAttribute("data-accent", a);
    if (themeBtn) themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    if (metaTheme) metaTheme.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim() || "#050a13");
    $$(".swatch").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-accent") === a)); });
    window.dispatchEvent(new Event("themechange"));
  }
  function setTheme(t) {
    try { localStorage.setItem("theme", t); } catch (e) {}
    applyLook(t, savedAccent() || defaultAccent(t));
  }
  function setAccent(a) {
    if (ACCENTS.indexOf(a) === -1) return;
    try { localStorage.setItem("accent", a); } catch (e) {}
    applyLook(root.getAttribute("data-theme") || "dark", a);
  }
  window.setTheme = setTheme;
  window.setAccent = setAccent;
  applyLook(root.getAttribute("data-theme") || "dark", root.getAttribute("data-accent") || "jarvis");
  if (themeBtn) themeBtn.addEventListener("click", function () { setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); });

  function setPalette(open) {
    palPop.hidden = !open;
    palBtn.setAttribute("aria-expanded", String(open));
  }
  if (palBtn && palPop) {
    palBtn.addEventListener("click", function (e) { e.stopPropagation(); setPalette(palPop.hidden); });
    palPop.addEventListener("click", function (e) {
      var b = e.target.closest(".swatch");
      if (b) { setAccent(b.getAttribute("data-accent")); setPalette(false); palBtn.focus(); }
    });
    document.addEventListener("click", function (e) { if (!palPop.hidden && !e.target.closest("#palette")) setPalette(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !palPop.hidden) { setPalette(false); palBtn.focus(); } });
  }

  /* ---------- 2. Nav, scroll progress, scroll-spy ---------- */
  var nav = $("#nav"), burger = $("#burger"), navLinks = $("#navLinks"), progress = $("#progress");

  var ticking = false;
  function onScroll() {
    ticking = false;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4) + ")";
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  function setMenu(open) {
    navLinks.classList.toggle("is-open", open);
    nav.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
  $$("a", navLinks).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  var spyLinks = $$("a", navLinks);
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        spyLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spyLinks.forEach(function (a) { var t = $(a.getAttribute("href")); if (t) spy.observe(t); });
  }

  /* ---------- 3. Project cards ---------- */
  // Value markup: the number stays on one line; word-like units (s, min, MB, pts) sit beside it in a smaller size
  function valHtml(pre, num, suf) {
    suf = suf || "";
    var unit = /^\s*[A-Za-z]/.test(suf);
    return '<span class="n">' + esc((pre || "") + num + (unit ? "" : suf)) + "</span>" +
      (unit ? '<span class="u">' + esc(suf.trim()) + "</span>" : "");
  }
  function metricHtml(m) {
    var numeric = typeof m.num === "number";
    var dec = m.decimals || 0;
    var shown = numeric ? (reduce ? P.fmtMetric({ num: m.num, decimals: dec }) : (dec ? (0).toFixed(dec) : "0")) : m.num;
    var attrs = numeric
      ? ' data-count="' + m.num + '" data-decimals="' + dec + '" data-prefix="' + esc(m.prefix || "") + '" data-suffix="' + esc(m.suffix || "") + '"'
      : "";
    return '<div class="metric' + (m.warn ? " metric--warn" : "") + '">' +
      '<div class="metric__v"' + attrs + ">" + valHtml(m.prefix, shown, m.suffix) + "</div>" +
      '<div class="metric__l">' + esc(m.label) + (m.sub ? '<span class="metric__s">' + esc(m.sub) + "</span>" : "") + "</div></div>";
  }

  var grid = $("#projectGrid");
  function renderProjects() {
    grid.innerHTML = P.projects.map(function (p, i) {
      var shown = p.stack.slice(0, 6).map(function (id) { return "<li>" + esc(P.graph.byId[id].label) + "</li>"; });
      if (p.stack.length > 6) shown.push("<li>+" + (p.stack.length - 6) + "</li>");
      var body = p.metrics.length
        ? '<div class="metrics">' + p.metrics.map(metricHtml).join("") + "</div>"
        : '<p class="project__summary" style="margin-top:1.1rem">' + esc(p.points[0] || "") + "</p>";
      return '<article class="project reveal" data-cat="' + p.cats.join(" ") + '" data-id="' + p.id + '">' +
        '<header class="project__head"><span class="project__idx mono">' + String(i + 1).padStart(2, "0") + " · " + esc(p.kind) + "</span>" +
        '<span class="status' + (isLive(p) ? " status--live" : "") + '"><i></i>' + esc(p.status) + "</span></header>" +
        "<h3>" + esc(p.title) + '</h3><p class="project__sub">' + esc(p.subtitle) + "</p>" + body +
        '<p class="project__summary">' + esc(p.summary) + "</p>" +
        '<ul class="chips chips--sm">' + shown.join("") + "</ul>" +
        '<div class="project__actions">' +
        '<button type="button" class="btn btn--primary btn--small" data-case="' + p.id + '">Case study</button>' +
        (p.links.github ? '<a href="' + esc(p.links.github) + '" target="_blank" rel="noopener">GitHub &#8599;</a>' : "") +
        (p.links.demo ? '<a href="' + esc(p.links.demo) + '" target="_blank" rel="noopener">Live demo &#8599;</a>' : "") +
        "</div></article>";
    }).join("");
  }
  renderProjects();

  grid.addEventListener("click", function (e) {
    var b = e.target.closest("[data-case]");
    if (b) openCase(b.getAttribute("data-case"));
  });

  /* ---------- 4. Case-study modal ---------- */
  var modal = $("#caseModal"), caseContent = $("#caseContent");

  function openCase(id) {
    var p = P.project(id);
    if (!p || !modal) return;
    var h = "";
    h += '<div class="case__top"><ul class="chips"><li>' + esc(p.kind) + "</li><li>" + esc(p.date) + "</li><li>" + esc(p.status) + "</li></ul>" +
      '<h2 class="case__title" id="caseTitle">' + esc(p.title) + '</h2><p class="case__sub">' + esc(p.subtitle) + "</p></div>";
    if (p.metrics.length) h += '<div class="case__metrics">' + p.metrics.map(metricHtml).join("") + "</div>";
    h += '<h3 class="case__h">Overview</h3><p class="case__text">' + esc(p.summary) + "</p>";
    if (p.pipeline.length) h += '<h3 class="case__h">How it works</h3><ol class="flow">' + p.pipeline.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>";
    if (p.table) {
      h += '<h3 class="case__h">' + esc(p.table.title) + '</h3><table class="case__table"><thead><tr>' +
        p.table.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        p.table.rows.map(function (r) {
          return "<tr>" + r.map(function (c) {
            return c && c.bar != null
              ? '<td><div class="bar"><div class="bar__track"><div class="bar__fill" style="--w:' + c.bar + '%"></div></div><span class="bar__label">' + esc(c.label) + "</span></div></td>"
              : "<td>" + esc(c) + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
    }
    h += '<h3 class="case__h">What I built</h3><ul class="case__list">' + p.points.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    if (p.notes) h += '<div class="case__note"><strong>Honest note.</strong> ' + esc(p.notes) + "</div>";
    h += '<h3 class="case__h">Stack</h3><ul class="chips">' + p.stack.map(function (sid) {
      var n = P.graph.byId[sid];
      return '<li><span class="chip__dot" style="--dot:var(--c-' + n.cat + ')"></span>' + esc(n.label) + "</li>";
    }).join("") + "</ul>";
    h += '<div class="case__actions">' +
      (p.links.demo ? '<a class="btn btn--primary" href="' + esc(p.links.demo) + '" target="_blank" rel="noopener">Live demo &#8599;</a>' : "") +
      (p.links.github ? '<a class="btn btn--ghost" href="' + esc(p.links.github) + '" target="_blank" rel="noopener">View code &#8599;</a>' : "") +
      '<button type="button" class="btn btn--ghost" data-map="' + p.id + '">Highlight on stack map</button></div>';

    caseContent.innerHTML = h;
    $(".modal__box", modal).scrollTop = 0;
    if (typeof modal.showModal === "function") { if (!modal.open) modal.showModal(); } else modal.setAttribute("open", "");
    document.body.classList.add("is-locked");
    $$("[data-count]", caseContent).forEach(countUp);
  }
  window.openCase = openCase;

  function closeCase() {
    if (modal.open) modal.close();
    document.body.classList.remove("is-locked");
  }
  $("#caseClose").addEventListener("click", closeCase);
  modal.addEventListener("close", function () { document.body.classList.remove("is-locked"); });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeCase(); });
  caseContent.addEventListener("click", function (e) {
    var b = e.target.closest("[data-map]");
    if (!b) return;
    var id = b.getAttribute("data-map");
    closeCase();
    var s = $("#stack"); if (s) s.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    setTimeout(function () { if (window.StackMap) window.StackMap.selectProject(id); }, reduce ? 0 : 500);
  });

  /* ---------- 5. Journey, coursework, email links ---------- */
  $("#timeline").innerHTML = P.education.map(function (e) {
    return '<div class="tl-item reveal"><span class="tl-item__date mono">' + esc(e.date) + "</span><h3>" + esc(e.title) + "</h3><p>" + esc(e.text) + "</p></div>";
  }).join("");
  $("#awards").innerHTML = P.awards.map(function (a) {
    return '<article class="award reveal"><span class="award__badge" aria-hidden="true">' + esc(a.badge) + "</span><div><h3>" + esc(a.title) + "</h3><p>" + esc(a.text) + "</p></div></article>";
  }).join("");
  var cw = $("#coursework");
  if (cw) cw.textContent = "Coursework: " + P.coursework.join(" · ");

  var mail = CFG.email || P.profile.email;
  $$("[data-email-href]").forEach(function (a) { a.setAttribute("href", "mailto:" + mail); });
  $$("[data-email-text]").forEach(function (a) { a.textContent = mail; });
  var copyBtn = $("#copyEmail");
  if (copyBtn) copyBtn.setAttribute("data-email", mail);

  /* ---------- 6. Reveal on scroll + count-up ---------- */
  $$(".reveal").forEach(function (el) {
    var sibs = $$(".reveal", el.parentElement);
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 6) * 70 + "ms");
  });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  function fmtNum(n, dec) { return dec ? n.toFixed(dec) : Math.round(n).toLocaleString("en-US"); }
  function countUp(el) {
    if (el.getAttribute("data-done")) return;
    el.setAttribute("data-done", "1");
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
    if (reduce) { el.innerHTML = valHtml(pre, fmtNum(target, dec), suf); return; }
    var start = null, dur = 1300;
    (function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = valHtml(pre, fmtNum(target * eased, dec), suf);
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  var counters = $$("[data-count]", $("#main"));
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(countUp);
  }

  /* ---------- 7. Typing effect ---------- */
  var typed = $("#typed");
  var roles = CFG.roles && CFG.roles.length ? CFG.roles : ["AI / ML Engineer"];
  if (typed) {
    if (reduce) typed.textContent = roles[0];
    else {
      var ri = 0, ci = 0, del = false;
      (function tick() {
        var word = roles[ri];
        ci += del ? -1 : 1;
        typed.textContent = word.slice(0, ci);
        var delay = del ? 35 : 70;
        if (!del && ci === word.length) { del = true; delay = 1600; }
        else if (del && ci === 0) { del = false; ri = (ri + 1) % roles.length; delay = 400; }
        setTimeout(tick, delay);
      })();
    }
  }

  /* ---------- 8. Project filters + card tilt ---------- */
  var filters = $$(".filter");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filters.forEach(function (b) { var on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
      $$(".project", grid).forEach(function (c) {
        var show = f === "all" || c.getAttribute("data-cat").split(" ").indexOf(f) !== -1;
        c.classList.toggle("is-hidden", !show);
        if (show) c.classList.add("is-visible");
      });
    });
  });

  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    grid.addEventListener("pointermove", function (e) {
      var c = e.target.closest(".project"); if (!c) return;
      var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty("--mx", x + "px"); c.style.setProperty("--my", y + "px");
      c.style.setProperty("--ry", ((x / r.width - 0.5) * 4).toFixed(2) + "deg");
      c.style.setProperty("--rx", ((0.5 - y / r.height) * 3).toFixed(2) + "deg");
    });
    grid.addEventListener("pointerout", function (e) {
      var c = e.target.closest(".project");
      if (c && !c.contains(e.relatedTarget)) { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
    });
  }

  /* ---------- 9. Copy email + contact form ---------- */
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      function done() {
        copyBtn.textContent = "Copied"; copyBtn.classList.add("is-done");
        setTimeout(function () { copyBtn.textContent = "Copy"; copyBtn.classList.remove("is-done"); }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(mail).then(done, function () { window.prompt("Copy my email:", mail); });
      else window.prompt("Copy my email:", mail);
    });
  }

  var form = $("#contactForm"), statusEl = $("#formStatus"), submitBtn = $("#submitBtn");
  function setError(name, msg) {
    form.elements[name].closest(".field").classList.toggle("has-error", !!msg);
    $('[data-for="' + name + '"]', form).textContent = msg || "";
  }
  function validate() {
    var ok = true, v = {
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), message: form.elements.message.value.trim()
    };
    setError("name", v.name ? "" : "Please enter your name."); if (!v.name) ok = false;
    var eok = !v.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email);      // email is optional, but must look right if given
    setError("email", eok ? "" : "That email doesn't look right."); if (!eok) ok = false;
    setError("message", v.message.length >= 10 ? "" : "Message should be at least 10 characters."); if (v.message.length < 10) ok = false;
    return ok;
  }
  function say(msg, kind) { statusEl.textContent = msg; statusEl.className = "form__status" + (kind ? " is-" + kind : ""); }

  /* How the message reaches me (first one that is configured in js/config.js wins):
     1. EmailJS   sends through my own Gmail account, so it arrives "from my own id".
     2. Web3Forms sends through their server to my inbox.
     3. Fallback  opens the visitor's own mail app with a draft. */
  function sendMessage(data) {
    var ej = CFG.emailjs || {};
    if (ej.publicKey && ej.serviceId && ej.templateId) {
      return fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: ej.serviceId, template_id: ej.templateId, user_id: ej.publicKey,
          template_params: {
            from_name: data.name, reply_to: data.email || "(no email given)", message: data.message,
            subject: "Portfolio message from " + data.name, to_email: mail, sent_at: new Date().toLocaleString()
          }
        })
      }).then(function (r) { if (!r.ok) throw new Error("emailjs " + r.status); });
    }
    if (CFG.web3formsKey) {
      return fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: CFG.web3formsKey, subject: "Portfolio message from " + data.name, from_name: "Portfolio website",
          name: data.name, email: data.email || "noreply@example.com", message: data.message })
      }).then(function (r) { return r.json().then(function (j) { if (!(r.ok && j.success)) throw new Error("web3forms"); }); });
    }
    return null;
  }

  if (form) {
    ["name", "email", "message"].forEach(function (n) { form.elements[n].addEventListener("input", function () { setError(n, ""); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault(); say("");
      if (form.elements.botcheck.value) return;
      if (!validate()) return;
      var data = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), message: form.elements.message.value.trim() };

      var req = sendMessage(data);
      if (!req) {
        window.location.href = "mailto:" + mail + "?subject=" + encodeURIComponent("Portfolio message from " + data.name) +
          "&body=" + encodeURIComponent(data.message + "\n\n" + data.name + (data.email ? "\n" + data.email : ""));
        say("Opening your email app. If nothing happens, write to " + mail + " directly.", "ok");
        return;
      }
      try {   // stop accidental double sends
        var lastSent = parseInt(localStorage.getItem("lastSent") || "0", 10);
        if (Date.now() - lastSent < 20000) { say("Message already sent. Please wait a few seconds before sending another.", "err"); return; }
      } catch (err) {}
      var label = $(".btn__label", submitBtn);
      submitBtn.disabled = true; label.textContent = "Sending...";
      req.then(function () {
        form.reset(); say("Thanks, " + data.name + "! Your message is on its way. I'll reply soon.", "ok");
        try { localStorage.setItem("lastSent", String(Date.now())); } catch (err) {}
      }).catch(function () { say("Couldn't send right now. Please email me at " + mail + ".", "err"); })
        .then(function () { submitBtn.disabled = false; label.textContent = "Send message"; });
    });
  }

  /* ---------- 10. Misc ---------- */
  var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
