/* ==========================================================================
   Single source of truth for the portfolio.
   The page, the tech-stack map, the case-study modal and the terminal all
   read from this file. Edit here and every view updates.

   Numbers come from your resume and your GitHub READMEs. If you add a metric,
   make sure you can explain where it came from.
   ========================================================================== */
window.PORTFOLIO = (function () {
  "use strict";
  var CFG = window.SITE_CONFIG || {};

  /* ---------- Profile & links ---------- */
  var links = {
    github: "https://github.com/RudraKsh0091",
    linkedin: "https://www.linkedin.com/in/rudraksh-garg-614b68323/",
    leetcode: "https://leetcode.com/u/RudraKsh_00/",
    resume: "https://drive.google.com/file/d/1FrHUdKScxhkaPYUXxX0RIgkRuuVJDDpH/view?usp=sharing",
    huggingface: "https://huggingface.co/RudraKsh-00"
  };

  var profile = {
    name: "Rudraksh Garg",
    handle: "rudraksh",
    email: CFG.email || "rudrakshgarg.ai@gmail.com",
    phone: "+91 90346 74450",
    location: "Una, Himachal Pradesh, India",
    college: "IIIT Una",
    degree: "B.Tech, Computer Science & Engineering",
    cgpa: "9.25 / 10",
    status: "Open to placements and internships",
    summary:
      "Third-year CSE student at IIIT Una who likes taking an ML idea from raw data to a deployed, usable product: " +
      "RAG pipelines, speech synthesis, forecasting and computer vision."
  };

  /* ---------- Tech stack map ---------- */
  var categories = [
    { id: "genai",   label: "Generative AI" },
    { id: "ml",      label: "ML & deep learning" },
    { id: "data",    label: "Data" },
    { id: "backend", label: "Backend" },
    { id: "lang",    label: "Languages" },
    { id: "devops",  label: "Deploy & tools" }
  ];

  // [id, label, category]
  var stack = [
    ["langchain", "LangChain", "genai"], ["rag", "RAG", "genai"], ["chromadb", "ChromaDB", "genai"],
    ["gemini", "Gemini", "genai"], ["prompting", "Prompt Eng.", "genai"], ["ecapa", "ECAPA-TDNN", "genai"],
    ["xtts", "XTTS-v2", "genai"], ["speechbrain", "SpeechBrain", "genai"],

    ["tensorflow", "TensorFlow", "ml"], ["keras", "Keras", "ml"], ["sklearn", "Scikit-learn", "ml"],
    ["cnn", "CNN", "ml"], ["ann", "ANN", "ml"], ["transfer", "Transfer Learning", "ml"],
    ["mobilenet", "MobileNetV2", "ml"], ["xgboost", "XGBoost", "ml"], ["rf", "Random Forest", "ml"],
    ["imbalance", "Class Imbalance", "ml"],

    ["numpy", "NumPy", "data"], ["pandas", "Pandas", "data"], ["matplotlib", "Matplotlib", "data"],
    ["seaborn", "Seaborn", "data"], ["features", "Feature Eng.", "data"], ["timeseries", "Time-Series", "data"],

    ["fastapi", "FastAPI", "backend"], ["flask", "Flask", "backend"], ["gradio", "Gradio", "backend"],
    ["gunicorn", "Gunicorn", "backend"], ["rest", "REST APIs", "backend"], ["pydantic", "Pydantic", "backend"],

    ["python", "Python", "lang"], ["java", "Java", "lang"], ["cpp", "C++", "lang"], ["c", "C", "lang"],
    ["sql", "SQL", "lang"], ["js", "JavaScript", "lang"],

    ["docker", "Docker", "devops"], ["hf", "Hugging Face", "devops"], ["render", "Render", "devops"],
    ["railway", "Railway", "devops"], ["git", "Git & GitHub", "devops"], ["mysql", "MySQL", "devops"]
  ].map(function (s) { return { id: s[0], label: s[1], cat: s[2] }; });

  // Relationships that hold regardless of project (how the tools fit together)
  var stackLinks = [
    ["tensorflow", "keras"], ["keras", "cnn"], ["cnn", "transfer"], ["transfer", "mobilenet"],
    ["keras", "ann"], ["sklearn", "rf"], ["sklearn", "xgboost"], ["sklearn", "imbalance"],
    ["pandas", "numpy"], ["pandas", "matplotlib"], ["matplotlib", "seaborn"], ["pandas", "features"],
    ["features", "timeseries"], ["fastapi", "pydantic"], ["fastapi", "rest"], ["flask", "rest"],
    ["flask", "gunicorn"], ["rag", "langchain"], ["rag", "chromadb"], ["rag", "prompting"],
    ["langchain", "gemini"], ["ecapa", "speechbrain"], ["ecapa", "xtts"], ["docker", "railway"],
    ["docker", "hf"], ["mysql", "sql"], ["js", "rest"], ["git", "docker"]
  ];

  /* ---------- Projects ---------- */
  // metric: { prefix, num (number animates, string is shown as-is), decimals, suffix, label, sub, warn }
  var projects = [
    {
      id: "tldw", slug: "tldw-ai", title: "TLDW AI",
      subtitle: "RAG-based YouTube Q&A Chrome extension",
      kind: "GenAI", date: "Jul 2026", status: "Deployed on Railway",
      cats: ["genai", "live"],
      summary: "Ask questions about any YouTube video and get answers grounded in its transcript, from a Chrome extension.",
      pipeline: ["Chrome extension", "FastAPI", "Transcript", "Chunking", "Embeddings", "ChromaDB", "MMR retrieval", "Gemini", "Answer + 3 follow-ups"],
      points: [
        "Built the full pipeline: transcript extraction, chunking, semantic embeddings, a per-video ChromaDB index and Gemini for generation.",
        "MMR-based retrieval picks chunks that are relevant and diverse, so answers cover more of the video.",
        "Modular FastAPI backend (POST /index and POST /ask) behind a Manifest V3 extension.",
        "Containerised with Docker and deployed on Railway."
      ],
      metrics: [
        { prefix: "~", num: "3–4", suffix: " s", label: "End-to-end query latency" },
        { prefix: "~", num: "2.5–3", suffix: " min", label: "To index a 54-minute video" },
        { prefix: "~", num: "1.5–2.5", suffix: " MB", label: "Storage per video" },
        { num: 3, label: "Follow-up questions per answer" }
      ],
      stack: ["python", "fastapi", "langchain", "rag", "chromadb", "gemini", "js", "docker", "railway", "rest"],
      links: { github: "https://github.com/RudraKsh0091/TLDW-AI" }
    },
    {
      id: "voice", slug: "voice-cloning", title: "Voice Cloning System",
      subtitle: "Zero-shot speech synthesis from a short clip",
      kind: "GenAI", date: "Jun 2026", status: "Live on Hugging Face Spaces",
      cats: ["genai", "live"],
      summary: "Clones a voice from a few seconds of reference audio and speaks new text in it, no training required.",
      pipeline: ["Reference audio", "ECAPA-TDNN embedding", "XTTS-v2", "HiFi-GAN vocoder", "Cloned speech"],
      points: [
        "ECAPA-TDNN captures who is speaking; XTTS-v2 generates new speech in that voice from only 6 to 10 seconds of audio.",
        "Dockerised Gradio app hosted on Hugging Face Spaces.",
        "Resolved cross-platform dependency conflicts between SpeechBrain and Coqui TTS inside the Docker image.",
        "Runs on CPU because the free tier has no GPU."
      ],
      metrics: [
        { num: "6–10", suffix: " s", label: "Reference audio needed" },
        { num: "60–85", suffix: "%", label: "Speaker similarity (tester runs)" },
        { prefix: "~", num: "80–90", suffix: " s", label: "CPU time for a 10–12 s clip" },
        { prefix: "~", num: "40–50", suffix: "%", label: "On acoustically similar voices", warn: true }
      ],
      notes: "Similarity drops on acoustically similar voices because the speaker embedding averages them together. That is the main limitation I would tackle next.",
      stack: ["python", "ecapa", "xtts", "speechbrain", "gradio", "docker", "hf"],
      links: {
        github: "https://github.com/RudraKsh0091/voice-cloning-system",
        demo: "https://huggingface.co/spaces/RudraKsh-00/voice-cloning-system"
      }
    },
    {
      id: "power", slug: "powerforecast-india", title: "PowerForecast India",
      subtitle: "State-level electricity demand forecasting",
      kind: "Machine learning", date: "Apr 2026", status: "Live on Render",
      cats: ["ml", "live"],
      summary: "Forecasts daily electricity demand for Indian states using a dataset I scraped and cleaned myself, served as a live web app.",
      pipeline: ["Scrape GRID India", "Consolidate 32 states/UTs", "Feature engineering", "Model training", "Flask + Gunicorn", "Weather API", "Live forecast"],
      points: [
        "Scraped and consolidated 37,000+ rows of daily demand for 32 states and UTs, 2023 to 2026.",
        "Engineered 21 features: lags (1, 7, 14, 30 days), rolling mean and std (7, 14, 30 days), calendar and holiday flags, and weather.",
        "Flask app served by Gunicorn on Render, with live weather integration for the next few days.",
        "Includes a demand history view for the selected state."
      ],
      metrics: [
        { num: 37000, suffix: "+", label: "Rows of time-series data" },
        { num: 32, label: "States and UTs covered" },
        { num: 210.45, decimals: 2, label: "MAE on held-out data" },
        { num: 463.15, decimals: 2, label: "RMSE on held-out data" }
      ],
      stack: ["python", "pandas", "numpy", "sklearn", "xgboost", "features", "timeseries", "flask", "gunicorn", "render"],
      links: {
        github: "https://github.com/RudraKsh0091/Electric-Power-Demand-Forecast---India",
        demo: "https://electric-power-forecast.onrender.com/"
      }
    },
    {
      id: "stylescan", slug: "stylescan", title: "StyleScan",
      subtitle: "Fashion product classifier and visual search",
      kind: "Computer vision", date: "Deep learning", status: "Live on Hugging Face Spaces",
      cats: ["ml", "vision", "live"],
      summary: "Classifies fashion products into 40 categories with a fine-tuned MobileNetV2 and finds visually similar items.",
      pipeline: ["Product image", "224×224 resize", "MobileNetV2 backbone", "Dense head", "40-class softmax"],
      points: [
        "Transfer learning on MobileNetV2 (ImageNet weights) with a custom head: global average pooling, Dense 256, Dropout 0.3, Dense 40.",
        "Two-phase training: head first with the base frozen, then the last 30 layers fine-tuned at a 1e-5 learning rate.",
        "Flask web app with visual-similarity search for related products.",
        "Demo hosted on Hugging Face Spaces."
      ],
      metrics: [
        { num: 91.5, decimals: 1, suffix: "%", label: "Validation accuracy" },
        { num: 40, label: "Product classes" },
        { prefix: "~", num: 40000, label: "Training images" },
        { prefix: "+", num: 2, decimals: 1, suffix: " pts", label: "Gain from fine-tuning", sub: "89.5% to 91.5%" }
      ],
      table: {
        title: "Training phases",
        cols: ["Phase", "What changed", "Validation accuracy"],
        rows: [
          ["1", "Base frozen, head trained", { bar: 89.5, label: "89.5%" }],
          ["2", "Last 30 layers unfrozen, LR 1e-5", { bar: 91.5, label: "91.5%" }]
        ]
      },
      stack: ["python", "tensorflow", "keras", "cnn", "transfer", "mobilenet", "flask", "numpy", "pandas", "sklearn", "docker", "hf"],
      links: {
        github: "https://github.com/RudraKsh0091/fashion-product-classifier",
        demo: "https://huggingface.co/spaces/RudraKsh-00/stylescan"
      }
    },
    {
      id: "churn", slug: "churn-prediction", title: "Customer Churn Prediction",
      subtitle: "ANN vs Random Forest on bank customers",
      kind: "Machine learning", date: "Classification", status: "Source on GitHub",
      cats: ["ml"],
      summary: "Predicts which bank customers are likely to leave, with the class imbalance handled properly and models judged on ROC-AUC.",
      pipeline: ["Bank customer data", "Preprocessing", "Stratified split", "Balanced class weights", "ANN vs Random Forest", "ROC-AUC / F1"],
      points: [
        "Compared an ANN against a Random Forest on a 10,000-row, 14-feature bank-customer dataset.",
        "Handled the roughly 20% churn imbalance with balanced class weights and a stratified train/test split.",
        "Regularised the ANN with dropout and early stopping.",
        "Used ROC-AUC and F1 as the primary metrics, since accuracy alone hides imbalance."
      ],
      metrics: [
        { num: 0.864, decimals: 3, label: "ROC-AUC (ANN)" },
        { prefix: "~", num: 86, suffix: "%", label: "Accuracy (ANN and RF)" },
        { num: 10000, label: "Customers, 14 features" },
        { prefix: "~", num: 20, suffix: "%", label: "Churn rate in the data" }
      ],
      table: {
        title: "Model comparison",
        cols: ["Model", "Accuracy", "ROC-AUC"],
        rows: [
          ["ANN", "~86%", { bar: 86.4, label: "0.864" }],
          ["Random Forest", "~86%", { bar: 86.1, label: "0.861" }]
        ]
      },
      notes: "Both models land at about 86% accuracy. The ANN edges ahead on ROC-AUC, 0.864 against 0.861.",
      stack: ["python", "tensorflow", "keras", "ann", "rf", "sklearn", "imbalance", "pandas", "numpy", "matplotlib", "seaborn"],
      links: { github: "https://github.com/RudraKsh0091/Customer-Churn-Prediction" }
    },
    {
      id: "inpaint", slug: "image-inpainting", title: "AI Image Inpainting",
      subtitle: "Reconstructing masked or damaged image regions",
      kind: "Computer vision", date: "Deep learning", status: "Source on GitHub",
      cats: ["ml", "vision"],
      summary: "An image inpainting tool that fills in masked or damaged regions of a picture using a trained deep learning model.",
      // TODO: add the model, dataset and PSNR / SSIM here once you have them, for example:
      // metrics: [{ num: 0.92, decimals: 2, label: "SSIM" }, { num: 28.4, decimals: 1, suffix: " dB", label: "PSNR" }],
      pipeline: [],
      points: [
        "Training logs, notebooks and model evaluations are kept in the repository."
      ],
      metrics: [],
      stack: ["python"],
      links: { github: "https://github.com/RudraKsh0091/AI-Image-Impainting" }
    }
  ];

  /* ---------- Education & achievements ---------- */
  var education = [
    { date: "2024 – 2028", title: "B.Tech, Computer Science & Engineering", text: "IIIT Una · CGPA 9.25 / 10 · currently in 3rd year" },
    { date: "2024", title: "Senior Secondary, Science (CBSE)", text: "95.4%" },
    { date: "2022", title: "Secondary Education (CBSE)", text: "93.0%" }
  ];

  var awards = [
    { badge: "2×", title: "Silver Medal, first and second year", text: "Academic excellence at IIIT Una. In the first year it was for the 2nd highest CGPA in B.Tech CSE." },
    { badge: "1st", title: "Robo Trace, line-follower robot", text: "First position at IIIT Una." },
    { badge: "260+", title: "LeetCode problems solved", text: "Across recursion, graphs and dynamic programming." }
  ];

  var coursework = ["Data Structures & Algorithms", "DBMS", "Operating Systems", "OOP", "Compiler Design"];

  /* ---------- Graph helpers (shared by the map and the terminal) ---------- */
  var HUB = "python"; // used in every project, so it would connect to everything; handled specially

  function buildGraph() {
    var byId = {}, nbrs = {}, usage = {}, edgeMap = {}, edges = [];
    stack.forEach(function (n) { byId[n.id] = n; nbrs[n.id] = {}; usage[n.id] = []; });

    projects.forEach(function (p) {
      p.stack.forEach(function (id) { if (usage[id]) usage[id].push(p.id); });
    });

    function add(a, b, kind) {
      if (a === b || !byId[a] || !byId[b]) return;
      var k = a < b ? a + "|" + b : b + "|" + a;
      if (edgeMap[k]) { if (kind === "link") edgeMap[k].kind = "link"; return; }
      var e = { a: a, b: b, kind: kind, hub: a === HUB || b === HUB };
      edgeMap[k] = e; edges.push(e);
      nbrs[a][b] = true; nbrs[b][a] = true;
    }

    stackLinks.forEach(function (l) { add(l[0], l[1], "link"); });
    projects.forEach(function (p) {
      for (var i = 0; i < p.stack.length; i++)
        for (var j = i + 1; j < p.stack.length; j++) add(p.stack[i], p.stack[j], "project");
    });

    return {
      byId: byId, edges: edges, usage: usage, hub: HUB,
      neighbors: function (id) { return Object.keys(nbrs[id] || {}); }
    };
  }

  var graph = buildGraph();

  function project(idOrSlug) {
    var q = String(idOrSlug).toLowerCase();
    var n = parseInt(q, 10);
    if (!isNaN(n) && String(n) === q) return projects[n - 1] || null;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === q || projects[i].slug === q) return projects[i];
    }
    return null;
  }

  // Display string for a metric, e.g. { prefix: "~", num: 37000, suffix: "+" } -> "~37,000+"
  function fmtMetric(m) {
    var n = m.num;
    if (typeof n === "number") n = m.decimals ? n.toFixed(m.decimals) : n.toLocaleString("en-US");
    return (m.prefix || "") + n + (m.suffix || "");
  }

  return {
    links: links, profile: profile, categories: categories, stack: stack, stackLinks: stackLinks,
    projects: projects, education: education, awards: awards, coursework: coursework,
    graph: graph, project: project, fmtMetric: fmtMetric
  };
})();
