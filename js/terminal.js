/* ==========================================================================
   Terminal mode: a tiny shell for the portfolio.
   Open with the ">_ terminal" button or the ` (backtick) key. Esc closes it.

   Everything it prints comes from data.js, so it never goes out of date with
   the rest of the site. To add a command, add an entry to COMMANDS below.
   ========================================================================== */
(function () {
  "use strict";

  var P = window.PORTFOLIO;
  var term = document.getElementById("terminal");
  if (!P || !term) return;

  var $ = function (id) { return document.getElementById(id); };
  var out = $("termOut"), input = $("termInput"), form = $("termForm"), promptEl = $("termPrompt");
  var body = $("termBody"), chipsEl = $("termChips"), titleEl = $("termTitle");

  var isOpen = false, booted = false, lastFocus = null;
  var history = [], hIdx = 0, cwd = [];
  var tabState = { last: "", count: 0 };

  /* ---------- tiny helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sp(n) { return n > 0 ? new Array(n + 1).join(" ") : ""; }
  function pad(s, n) { return s + sp(n - s.length); }
  function span(cls, s) { return '<span class="' + cls + '">' + s + "</span>"; }
  var dim = function (s) { return span("t-dim", s); };
  var key = function (s) { return span("t-key", s); };
  var ok = function (s) { return span("t-ok", s); };
  var warn = function (s) { return span("t-warn", s); };
  var bold = function (s) { return span("t-b", s); };
  function cmd(name, label) { return '<span class="t-cmd" data-cmd="' + esc(name) + '">' + esc(label || name) + "</span>"; }
  function link(url, label) { return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || url) + "</a>"; }
  function bar(value, max, width) {
    var f = Math.max(0, Math.min(width, Math.round((value / max) * width)));
    return span("t-bar", new Array(f + 1).join("█")) + dim(new Array(width - f + 1).join("░"));
  }
  var wide = function () { return window.innerWidth >= 640; };

  function print(html, cls) {
    var d = document.createElement("div");
    d.className = "tl" + (cls ? " " + cls : "");
    d.innerHTML = html;
    out.appendChild(d);
  }
  function blank() { print(""); }
  function toBottom() { body.scrollTop = body.scrollHeight; }

  /* ---------- prompt & virtual file system ---------- */
  function pathStr() { return cwd.length ? "~/" + cwd.join("/") : "~"; }
  function promptHtml() {
    return '<span class="t-host">rudraksh@portfolio:</span><b>' + esc(pathStr()) + "</b>$";
  }
  function refreshPrompt() {
    promptEl.innerHTML = promptHtml();
    titleEl.textContent = "rudraksh@portfolio: " + pathStr();
  }

  var FILES = {
    "about.md": function () { return renderAbout(); },
    "skills.md": function () { return renderStack(); },
    "education.md": function () { return renderEducation(); },
    "achievements.md": function () { return renderAchievements(); },
    "contact.md": function () { return renderContact(); },
    "resume.pdf": function () { return dim("resume.pdf is a binary file. Run ") + cmd("resume") + dim(" to open it."); }
  };
  function projectFiles() {
    var o = {};
    P.projects.forEach(function (p) { o[p.slug + ".md"] = function () { return renderProject(p); }; });
    return o;
  }
  function dirAt(parts) {
    if (parts.length === 0) return { dirs: ["projects"], files: Object.keys(FILES), map: FILES };
    if (parts.length === 1 && parts[0] === "projects") { var pf = projectFiles(); return { dirs: [], files: Object.keys(pf), map: pf }; }
    return null;
  }
  function resolve(path) {
    var parts = /^(~|\/)/.test(path) ? [] : cwd.slice();
    path.replace(/^(~|\/)/, "").split("/").forEach(function (seg) {
      if (!seg || seg === ".") return;
      if (seg === "..") parts.pop(); else parts.push(seg);
    });
    return parts;
  }

  /* ---------- renderers ---------- */
  function metricLine(m) {
    var v = P.fmtMetric(m);
    return "  " + (m.warn ? warn(pad(v, 10)) : key(pad(v, 10))) + " " + m.label + (m.sub ? dim("  (" + m.sub + ")") : "");
  }

  function renderAbout() {
    var p = P.profile;
    return bold(p.name) + dim("  ·  AI/ML engineer in the making") + "\n" +
      p.summary + "\n\n" +
      "  " + key(pad("college", 10)) + p.college + ", " + p.degree + "\n" +
      "  " + key(pad("cgpa", 10)) + p.cgpa + "\n" +
      "  " + key(pad("location", 10)) + p.location + "\n" +
      "  " + key(pad("status", 10)) + ok("●") + " " + p.status + "\n" +
      "  " + key(pad("focus", 10)) + "RAG, speech synthesis, forecasting, computer vision\n\n" +
      dim("Next: ") + cmd("projects") + dim(" · ") + cmd("skills") + dim(" · ") + cmd("contact");
  }

  function renderHelp() {
    var rows = [
      ["about", "who I am"], ["skills", "tech stack by category"], ["stack <tool>", "where I used a tool, and what it connects to"],
      ["projects", "list my projects with headline numbers"], ["project <n|name>", "full breakdown of one project"],
      ["education", "degree and school results"], ["achievements", "medals, competitions, practice"],
      ["contact", "email, phone and socials"], ["mail <message>", "open your mail app with a draft to me"],
      ["resume", "open my resume"], ["github | linkedin | leetcode", "open a profile in a new tab"],
      ["map <tool|project>", "close the terminal and highlight it on the stack map"], ["open <section>", "jump to a section of the site"],
      ["theme [dark|light]", "switch the site theme"], ["accent [name]", "colour mode: jarvis, ultron, matrix, nebula, solar"],
      ["neofetch", "quick summary card"],
      ["ls · cd · cat · pwd", "browse the files, e.g. cat projects/stylescan.md"], ["history · clear · exit", "shell basics"]
    ];
    var s = bold("Commands") + dim("   (click one, or type it)") + "\n\n";
    rows.forEach(function (r) {
      var name = r[0], first = name.split(/[ |·]/)[0];
      s += wide()
        ? "  " + cmd(first, name) + sp(Math.max(1, 30 - name.length)) + dim(r[1]) + "\n"
        : "  " + cmd(first, name) + "\n    " + dim(r[1]) + "\n";
    });
    s += "\n" + dim("Tab completes, ↑ ↓ recall history, Ctrl+L clears, Esc closes.");
    return s;
  }

  function renderProjects() {
    var s = bold("Projects") + dim("  (" + P.projects.length + ")") + "\n\n";
    P.projects.forEach(function (p, i) {
      var live = /live|deployed/i.test(p.status);
      s += " " + key(String(i + 1)) + "  " + cmd("project " + (i + 1), p.title) + dim("  " + p.subtitle) + "\n";
      s += "    " + (live ? ok("●") : dim("○")) + " " + dim(p.status);
      if (p.metrics.length) s += dim("  ·  ") + p.metrics.slice(0, 2).map(function (m) { return P.fmtMetric(m) + " " + m.label.toLowerCase(); }).join(dim("  ·  "));
      s += "\n";
    });
    s += "\n" + dim("Run ") + cmd("project 4") + dim(" for the full breakdown, or ") + cmd("map tldw") + dim(" to see its stack.");
    return s;
  }

  function renderProject(p) {
    var s = bold(p.title) + dim("  ·  " + p.subtitle) + "\n";
    s += dim(p.kind + " · " + p.date + " · ") + (/live|deployed/i.test(p.status) ? ok(p.status) : p.status) + "\n\n";
    s += p.summary + "\n";
    if (p.pipeline.length) s += "\n" + key("Pipeline") + "\n  " + p.pipeline.join(dim(" → ")) + "\n";
    if (p.metrics.length) { s += "\n" + key("Numbers") + "\n" + p.metrics.map(metricLine).join("\n") + "\n"; }
    else s += "\n" + warn("Numbers") + dim("\n  Not added yet. Fill in this project's metrics in js/data.js.\n");
    if (p.table) {
      s += "\n" + key(p.table.title) + "\n";
      p.table.rows.forEach(function (r) {
        var last = r[r.length - 1];
        s += "  " + pad(String(r[0]) + (r.length > 2 ? "  " + r[1] : ""), 38) + (last && last.bar ? bar(last.bar, 100, 24) + " " + last.label : last) + "\n";
      });
    }
    s += "\n" + key("Highlights") + "\n" + p.points.map(function (x) { return "  • " + x; }).join("\n") + "\n";
    if (p.notes) s += "\n" + warn("Note") + "  " + p.notes + "\n";
    s += "\n" + key("Stack") + "  " + p.stack.map(function (id) { return cmd("stack " + id, P.graph.byId[id].label); }).join(dim(", ")) + "\n";
    var l = [];
    if (p.links.github) l.push("github  " + link(p.links.github));
    if (p.links.demo) l.push("demo    " + link(p.links.demo));
    s += "\n" + l.join("\n") + "\n\n" + dim("Also: ") + cmd("map " + p.id, "map " + p.id) + dim(" · ") + cmd("open " + p.id, "open " + p.id) + dim(" (full case study)");
    return s;
  }

  function renderStack() {
    var s = bold("Tech stack") + dim("  (number = projects using it)") + "\n";
    P.categories.forEach(function (c) {
      var items = P.stack.filter(function (n) { return n.cat === c.id; });
      s += "\n" + key(c.label) + "\n  " + items.map(function (n) {
        var u = P.graph.usage[n.id].length;
        return cmd("stack " + n.id, n.label) + (u ? dim("·" + u) : "");
      }).join(dim("  ")) + "\n";
    });
    s += "\n" + dim("Try ") + cmd("stack python") + dim(" or ") + cmd("stack tensorflow");
    return s;
  }

  function findTool(q) {
    q = String(q || "").toLowerCase().replace(/[^a-z0-9+]/g, "");
    var hit = null;
    P.stack.forEach(function (n) {
      if (hit) return;
      if (n.id === q || n.label.toLowerCase().replace(/[^a-z0-9+]/g, "") === q) hit = n;
    });
    if (!hit) P.stack.forEach(function (n) { if (!hit && q.length > 1 && n.label.toLowerCase().replace(/[^a-z0-9+]/g, "").indexOf(q) === 0) hit = n; });
    return hit;
  }

  function renderTool(n) {
    var cat = P.categories.filter(function (c) { return c.id === n.cat; })[0];
    var used = P.graph.usage[n.id].map(P.project);
    var nb = P.graph.neighbors(n.id).map(function (id) { return P.graph.byId[id]; });
    var s = bold(n.label) + dim("  ·  " + cat.label) + "\n\n";
    s += "  " + key(pad("used in", 11)) + (used.length
      ? used.map(function (p) { return cmd("project " + p.id, p.title); }).join(dim(", ")) + dim("  (" + used.length + "/" + P.projects.length + ")")
      : dim("part of my toolkit, not tied to a showcased project")) + "\n";
    s += "  " + key(pad("connects", 11)) + (nb.length ? nb.map(function (m) { return cmd("stack " + m.id, m.label); }).join(dim(", ")) : dim("none")) + "\n\n";
    s += dim("See it on the map: ") + cmd("map " + n.id);
    return s;
  }

  function renderEducation() {
    return bold("Education") + "\n\n" + P.education.map(function (e) {
      return "  " + key(pad(e.date, 14)) + bold(e.title) + "\n  " + sp(14) + dim(e.text);
    }).join("\n\n") + "\n\n" + key("Coursework") + "  " + P.coursework.join(dim(" · "));
  }

  function renderAchievements() {
    return bold("Achievements") + "\n\n" + P.awards.map(function (a) {
      return "  " + warn(pad(a.badge, 6)) + bold(a.title) + "\n  " + sp(6) + dim(a.text);
    }).join("\n\n");
  }

  function renderContact() {
    var p = P.profile, L = P.links;
    return bold("Contact") + dim("  ·  best way to reach me is email") + "\n\n" +
      "  " + key(pad("email", 10)) + link("mailto:" + p.email, p.email) + "\n" +
      "  " + key(pad("phone", 10)) + link("tel:" + p.phone.replace(/\s/g, ""), p.phone) + "\n" +
      "  " + key(pad("linkedin", 10)) + link(L.linkedin, "rudraksh-garg-614b68323") + "\n" +
      "  " + key(pad("github", 10)) + link(L.github, "RudraKsh0091") + "\n" +
      "  " + key(pad("leetcode", 10)) + link(L.leetcode, "RudraKsh_00") + "\n" +
      "  " + key(pad("resume", 10)) + link(L.resume, "Google Drive") + "\n\n" +
      dim("Draft an email right here: ") + cmd("mail Hi Rudraksh, I'd like to talk about...", "mail <message>");
  }

  function renderNeofetch() {
    var p = P.profile;
    var art = [" ____    ____ ", "|  _ \\  / ___|", "| |_) || |  _ ", "|  _ < | |_| |", "|_| \\_\\ \\____|"];
    var info = [
      bold("rudraksh") + dim("@") + bold("portfolio"), dim("─────────────────────"),
      key("Role     ") + "AI/ML engineer (student)",
      key("School   ") + p.college + ", 3rd year",
      key("CGPA     ") + p.cgpa,
      key("Medals   ") + "2× silver, academic excellence",
      key("Projects ") + P.projects.length + " (" + P.projects.filter(function (x) { return /live|deployed/i.test(x.status); }).length + " deployed)",
      key("Tools    ") + P.stack.length + " across " + P.categories.length + " categories",
      key("LeetCode ") + "260+ solved",
      key("Status   ") + ok("●") + " open to placements"
    ];
    var s = "";
    for (var i = 0; i < info.length; i++) {
      s += (wide() ? span("t-art", esc(pad(art[i] || "", 15))) + "  " : "") + info[i] + "\n";
    }
    return s;
  }

  /* ---------- actions ---------- */
  function openUrl(url, label) {
    print(dim("Opening ") + link(url, label || url) + dim(" ..."));
    window.open(url, "_blank", "noopener");
  }
  function closeAnd(fn) { close(); setTimeout(fn, 160); }
  var SECTIONS = ["home", "about", "stack", "projects", "journey", "contact"];

  function suggest(name) {
    var names = Object.keys(COMMANDS), best = null, bd = 3;
    names.forEach(function (n) {
      var d = lev(name, n);
      if (n.indexOf(name) === 0) d = 0;
      if (d < bd) { bd = d; best = n; }
    });
    return best;
  }
  function lev(a, b) {
    var m = [], i, j;
    for (i = 0; i <= a.length; i++) m[i] = [i];
    for (j = 0; j <= b.length; j++) m[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  }

  /* ---------- commands ---------- */
  var COMMANDS = {
    help: function () { print(renderHelp()); },
    about: function () { print(renderAbout()); },
    whoami: function () { print("rudraksh " + dim("·") + " B.Tech CSE @ IIIT Una · AI/ML · open to placements"); },
    skills: function () { print(renderStack()); },
    stack: function (a) {
      if (!a[0]) return print(renderStack());
      var n = findTool(a.join(" "));
      if (!n) return print(warn("No tool called “" + esc(a.join(" ")) + "”.") + dim(" Run ") + cmd("stack") + dim(" to see them all."));
      print(renderTool(n));
    },
    projects: function () { print(renderProjects()); },
    project: function (a) {
      if (!a[0]) return print(renderProjects());
      var p = P.project(a[0]);
      if (!p) { var f = P.projects.filter(function (x) { return x.slug.indexOf(a[0].toLowerCase()) === 0 || x.id.indexOf(a[0].toLowerCase()) === 0; })[0]; p = f || null; }
      if (!p) return print(warn("No project “" + esc(a[0]) + "”.") + dim(" Try a number 1 to " + P.projects.length + " or a name like ") + cmd("project stylescan"));
      print(renderProject(p));
    },
    education: function () { print(renderEducation()); },
    achievements: function () { print(renderAchievements()); },
    contact: function () { print(renderContact()); },
    mail: function (a) {
      var msg = a.join(" ").trim();
      if (!msg) return print(dim("Usage: ") + "mail <your message>" + dim("   e.g. ") + cmd("mail Hi Rudraksh, I'd like to talk about an internship", "mail Hi Rudraksh, I'd like to talk about an internship"));
      print(ok("✓") + " Opening your mail app with your message addressed to " + esc(P.profile.email) + dim(". Press send there to deliver it."));
      window.location.href = "mailto:" + P.profile.email + "?subject=" + encodeURIComponent("Hello from your portfolio terminal") + "&body=" + encodeURIComponent(msg);
    },
    email: function () { COMMANDS.contact(); },
    resume: function () { openUrl(P.links.resume, "resume (Google Drive)"); },
    github: function () { openUrl(P.links.github); },
    linkedin: function () { openUrl(P.links.linkedin); },
    leetcode: function () { openUrl(P.links.leetcode); },
    neofetch: function () { print(renderNeofetch()); },
    open: function (a) {
      var t = (a[0] || "").toLowerCase();
      if (!t) return print(dim("Usage: ") + "open <section>" + dim("   sections: ") + SECTIONS.join(", ") + dim("   or a project name"));
      var proj = P.project(t);
      if (proj && window.openCase) return closeAnd(function () { window.openCase(proj.id); });
      if (SECTIONS.indexOf(t) !== -1) return closeAnd(function () { var s = document.getElementById(t); if (s) s.scrollIntoView({ behavior: "smooth" }); });
      print(warn("Unknown target “" + esc(t) + "”.") + dim(" Sections: " + SECTIONS.join(", ")));
    },
    map: function (a) {
      var t = a.join(" ");
      if (!t) return print(dim("Usage: ") + "map <tool|project>" + dim("   e.g. ") + cmd("map tensorflow") + dim(" or ") + cmd("map stylescan"));
      var proj = P.project(t), tool = findTool(t);
      if (!tool && !proj) return print(warn("Nothing called “" + esc(t) + "”."));
      closeAnd(function () {
        var s = document.getElementById("stack"); if (s) s.scrollIntoView({ behavior: "smooth" });
        setTimeout(function () {
          if (!window.StackMap) return;
          window.StackMap.clear();
          if (tool && (!proj || tool.id === t.toLowerCase())) window.StackMap.select(tool.id);
          else if (proj) window.StackMap.selectProject(proj.id);
        }, 450);
      });
    },
    theme: function (a) {
      var cur = document.documentElement.getAttribute("data-theme");
      var want = (a[0] || "toggle").toLowerCase();
      if (want === "toggle") want = cur === "dark" ? "light" : "dark";
      if (want !== "dark" && want !== "light") return print(dim("Usage: ") + "theme [dark|light]");
      if (window.setTheme) window.setTheme(want);
      print(ok("✓") + " Site theme set to " + want + dim(". The terminal itself always stays dark."));
    },
    accent: function (a) {
      var names = ["jarvis", "ultron", "matrix", "nebula", "solar"];
      var want = (a[0] || "").toLowerCase();
      if (names.indexOf(want) === -1) return print(dim("Usage: ") + "accent [" + names.join("|") + "]");
      if (window.setAccent) window.setAccent(want);
      print(ok("✓") + " Colour mode set to " + want + dim("."));
    },
    ls: function (a) {
      var target = a.filter(function (x) { return x[0] !== "-"; })[0];
      var parts = target ? resolve(target) : cwd;
      var d = dirAt(parts);
      if (!d) return print(warn("ls: cannot access “" + esc(target) + "”: no such directory"));
      print(d.dirs.map(function (x) { return key(x + "/"); }).concat(d.files).join("   "));
    },
    cd: function (a) {
      var parts = a[0] ? resolve(a[0]) : [];
      if (!dirAt(parts)) return print(warn("cd: no such directory: " + esc(a[0])));
      cwd = parts; refreshPrompt();
    },
    pwd: function () { print("/home/rudraksh" + (cwd.length ? "/" + cwd.join("/") : "")); },
    cat: function (a) {
      if (!a[0]) return print(dim("Usage: ") + "cat <file>" + dim("   try ") + cmd("ls"));
      var parts = resolve(a[0]), name = parts.pop(), d = dirAt(parts);
      if (!d || !d.map[name]) return print(warn("cat: " + esc(a[0]) + ": no such file") + dim("  (try ") + cmd("ls") + dim(")"));
      print(d.map[name]());
    },
    echo: function (a) { print(esc(a.join(" "))); },
    date: function () { print(esc(new Date().toString())); },
    history: function () {
      if (!history.length) return print(dim("No commands yet."));
      print(history.map(function (h, i) { return dim(pad(String(i + 1), 4)) + esc(h); }).join("\n"));
    },
    clear: function () { out.innerHTML = ""; },
    exit: function () { close(); },
    sudo: function () { print(warn("rudraksh is not in the sudoers file. This incident will be reported.") + dim(" (to nobody, it's a portfolio)")); },
    rm: function () { print(warn("Nice try.") + dim(" This filesystem is read-only, and I'd miss my projects.")); },
    hire: function () { print(ok("Great decision.") + " Run " + cmd("contact") + " and let's talk."); }
  };
  COMMANDS.quit = COMMANDS.exit;
  COMMANDS.ll = COMMANDS.ls;
  COMMANDS.achievement = COMMANDS.achievements;
  COMMANDS.hireme = COMMANDS.hire;

  var HIDDEN = { quit: 1, ll: 1, achievement: 1, hireme: 1, email: 1, sudo: 1, rm: 1, hire: 1, echo: 1, date: 1, whoami: 1 };

  /* ---------- run ---------- */
  function tokenize(line) {
    var re = /"([^"]*)"|'([^']*)'|(\S+)/g, m, t = [];
    while ((m = re.exec(line))) t.push(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]);
    return t;
  }

  function run(line) {
    line = line.trim();
    print(promptHtml() + " " + esc(line), "tl--cmd");
    if (!line) return;
    if (history[history.length - 1] !== line) history.push(line);
    hIdx = history.length;

    var t = tokenize(line), name = t[0].toLowerCase(), args = t.slice(1);
    if (COMMANDS.hasOwnProperty(name)) {
      try { COMMANDS[name](args); } catch (e) { print(span("t-err", "Something went wrong running that command.")); }
    } else {
      var s = suggest(name);
      print(span("t-err", esc(name) + ": command not found") + (s ? dim("  Did you mean ") + cmd(s) + dim("?") : dim("  Type ") + cmd("help") + dim(" for the list.")));
    }
    toBottom();
  }

  /* ---------- tab completion ---------- */
  function candidates(line) {
    var parts = line.split(/\s+/), first = parts[0].toLowerCase();
    if (parts.length === 1) return { list: Object.keys(COMMANDS).filter(function (n) { return !HIDDEN[n]; }), prefix: "", frag: parts[0] };
    var frag = parts[parts.length - 1], list = [];
    if (first === "project" || first === "open" || first === "map") {
      list = P.projects.map(function (p) { return p.slug; });
      if (first === "open") list = list.concat(SECTIONS);
      if (first === "map") list = list.concat(P.stack.map(function (n) { return n.id; }));
    } else if (first === "stack") list = P.stack.map(function (n) { return n.id; });
    else if (first === "theme") list = ["dark", "light", "toggle"];
    else if (first === "accent") list = ["jarvis", "ultron", "matrix", "nebula", "solar"];
    else if (first === "cat" || first === "ls" || first === "cd") {
      var slash = frag.lastIndexOf("/"), dirPart = slash >= 0 ? frag.slice(0, slash + 1) : "";
      var d = dirAt(resolve(dirPart || "."));
      if (d) {
        list = (first === "cat" ? [] : d.dirs.map(function (x) { return x + "/"; })).concat(first === "cd" ? [] : d.files);
        if (first === "cat" && !dirPart) list = list.concat(["projects/"]);
        list = list.map(function (x) { return dirPart + x; });
      }
    }
    return { list: list, prefix: line.slice(0, line.length - frag.length), frag: frag };
  }

  function complete() {
    var line = input.value, c = candidates(line);
    var matches = c.list.filter(function (x) { return x.toLowerCase().indexOf(c.frag.toLowerCase()) === 0; });
    if (!matches.length) return;
    var common = matches[0];
    matches.forEach(function (m) { while (m.toLowerCase().indexOf(common.toLowerCase()) !== 0) common = common.slice(0, -1); });
    if (matches.length === 1) { input.value = c.prefix + matches[0] + (/\/$/.test(matches[0]) ? "" : " "); return; }
    if (common.length > c.frag.length) { input.value = c.prefix + common; return; }
    tabState.count = tabState.last === line ? tabState.count + 1 : 1; tabState.last = line;
    if (tabState.count >= 2) { print(promptHtml() + " " + esc(line), "tl--cmd"); print(dim(matches.join("   "))); toBottom(); }
  }

  /* ---------- open / close ---------- */
  function boot() {
    booted = true;
    var art = [" ____    ____ ", "|  _ \\  / ___|", "| |_) || |  _ ", "|  _ < | |_| |", "|_| \\_\\ \\____|"];
    if (wide()) print('<span class="t-art">' + esc(art.join("\n")) + "</span>");
    print(bold("Welcome to Rudraksh's portfolio terminal.") + "\n" +
      dim("Type ") + cmd("help") + dim(" to see commands, or click any green word. Try ") + cmd("projects") + dim(", ") + cmd("stack python") + dim(" or ") + cmd("neofetch") + dim("."));
    blank();
  }

  function open() {
    if (isOpen) return;
    lastFocus = document.activeElement;
    isOpen = true;
    term.hidden = false;
    document.body.classList.add("is-locked");
    refreshPrompt();
    if (!booted) boot();
    setTimeout(function () { input.focus(); toBottom(); }, 30);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    term.hidden = true;
    document.body.classList.remove("is-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- events ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value; input.value = "";
    run(v);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hIdx > 0) { hIdx--; input.value = history[hIdx]; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < history.length - 1) { hIdx++; input.value = history[hIdx]; } else { hIdx = history.length; input.value = ""; }
    } else if (e.key === "Tab") {
      e.preventDefault(); complete();
    } else if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault(); COMMANDS.clear();
    } else if (e.ctrlKey && (e.key === "c" || e.key === "C") && !window.getSelection().toString()) {
      e.preventDefault(); print(promptHtml() + " " + esc(input.value) + "^C", "tl--cmd"); input.value = "";
    } else if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
      e.preventDefault(); input.value = "";
    }
  });

  body.addEventListener("click", function (e) {
    var c = e.target.closest ? e.target.closest(".t-cmd") : null;
    if (c) { run(c.getAttribute("data-cmd")); input.focus(); return; }
    if (e.target.closest && e.target.closest("a")) return;
    if (!window.getSelection().toString()) input.focus();
  });

  ["help", "about", "projects", "stack", "education", "achievements", "contact", "resume", "neofetch", "theme", "clear"].forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = c;
    b.addEventListener("click", function () { run(c); input.focus(); });
    chipsEl.appendChild(b);
  });

  $("termClose").addEventListener("click", close);
  term.addEventListener("click", function (e) { if (e.target === term) close(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) { e.preventDefault(); close(); return; }
    var tag = (e.target && e.target.tagName) || "";
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
    if (e.key === "`" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); isOpen ? close() : open(); }
  });

  document.addEventListener("focusin", function (e) {
    if (isOpen && !term.contains(e.target)) input.focus();
  });

  var t1 = $("termToggle"), t2 = $("heroTerm");
  if (t1) t1.addEventListener("click", open);
  if (t2) t2.addEventListener("click", open);

  window.Terminal = { open: open, close: close, run: function (c) { open(); run(c); } };
})();
