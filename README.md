# Rudraksh Garg: Portfolio (v3)

A static portfolio site built with plain HTML, CSS and JavaScript. There is no build step and no dependencies, so you can open `index.html` directly or deploy the folder as it is.

```
portfolio/
├── index.html            page skeleton (hero, about, sections, modal, terminal shell)
├── css/
│   ├── style.css         theme colours (dark + light), layout, stack map, project cards
│   └── terminal.css      terminal mode styling
├── js/
│   ├── config.js         contact email, contact-form key, typing roles   <- edit
│   ├── data.js           ALL content: projects, numbers, stack, education  <- edit
│   ├── background.js     full-page neural mesh (reacts to mouse like fabric) + hero AI core
│   ├── icons.js          logos for the tech-stack bubbles
│   ├── stack.js          the clickable tech-stack map
│   ├── terminal.js       terminal mode and its commands
│   └── main.js           theme, nav, project cards, case-study modal, form
└── assets/
    ├── fonts/            self-hosted Space Grotesk, Inter, JetBrains Mono
    ├── favicon.svg
    └── photo.jpg         <- add your photo here
```

The one idea to remember: **`js/data.js` is the single source of truth.** The project cards, the case-study pop-ups, the stack map and the terminal all read from it, so you change a number once and it updates everywhere.

## 1. Add your photo

1. Take a portrait photo, ideally 4:5 (for example 800 x 1000 px), under 300 KB.
2. Name it exactly `photo.jpg` and put it in the `assets/` folder.
3. Refresh. It appears in the About section automatically. Until then, a monogram shows.

To use a PNG or WebP, change `assets/photo.jpg` in `index.html` (search for `photo.jpg`).

## 2. Turn on the contact form (mail arrives from your own Gmail)

The form sends the visitor's name, optional email and message through **EmailJS**, using your own Gmail account. Setup (5 minutes, free):

1. Sign up at <https://www.emailjs.com> with `rudrakshgarg.ai@gmail.com`.
2. Email Services, Add New Service, Gmail, connect it. Copy the **Service ID**.
3. Email Templates, Create New Template: To Email `rudrakshgarg.ai@gmail.com`, Reply To `{{reply_to}}`, Subject `{{subject}}`, Content `From: {{from_name}} ({{reply_to}})` then `{{message}}`. Copy the **Template ID**.
4. Account, General: copy the **Public Key**.
5. Paste all three into `js/config.js` (`emailjs: {...}`), redeploy, send yourself a test.
6. In EmailJS Account, Security, add your site's domain to the allow-list.

Until then the form falls back to Web3Forms (if a key is set) or opens the visitor's mail app. Email is optional in the form; without it you can't reply to that visitor.

## Colours, themes, fonts

- Dark/light toggle plus a palette button with 5 colour modes: Jarvis, Ultron, Matrix, Nebula, Solar. Light defaults to burgundy, dark to cyan. Tokens are at the top of `css/style.css`.
- Terminal: `accent matrix`, `theme light`.
- Logos: simple-icons (CC0) and devicon (MIT). Concept icons (RAG, CNN...) are hand-drawn.

## 3. Fill in the last project (AI Image Inpainting)

I couldn't find a description, dataset or scores for it in the repository, so its card is intentionally plain. Open `js/data.js`, find the `inpaint` project, and add real details, for example:

```js
summary: "Partial-convolution inpainting network trained on ...",
pipeline: ["Masked image", "Encoder", "Partial conv blocks", "Decoder", "Restored image"],
metrics: [
  { num: 0.92, decimals: 2, label: "SSIM" },
  { num: 28.4, decimals: 1, suffix: " dB", label: "PSNR" }
],
```

Only add numbers you can explain: an interviewer may ask how each one was measured. The same goes for the other projects; every number currently comes from your resume or your GitHub READMEs.

## 4. Where the project numbers came from

| Project | Numbers | Source |
|---|---|---|
| TLDW AI | latency, index time, storage, 3 follow-ups | resume |
| Voice Cloning | 6 to 10 s audio, 60 to 85% similarity, CPU time, 40 to 50% on similar voices | resume (CPU time also matches the repo README) |
| PowerForecast | 37,000+ rows, 32 states, MAE 210.45, RMSE 463.15 | resume |
| StyleScan | 91.5% val accuracy, 40 classes, ~40,000 images, 89.5% to 91.5% | GitHub README |
| Churn | ROC-AUC 0.864 (ANN) / 0.861 (RF), ~86% accuracy, 10,000 rows, ~20% churn | GitHub README |

## 5. Terminal mode

Press the `` ` `` key (backtick) or click **terminal** in the nav. Try `help`, `projects`, `project 4`, `stack tensorflow`, `neofetch`, `cat projects/stylescan.md`, `map keras` and `mail Hi Rudraksh...`. Tab completes, the arrow keys recall history, Esc closes.

To add a command, add an entry to the `COMMANDS` object in `js/terminal.js`.

## 6. Tech-stack map

Circles are the tools in `stack` inside `js/data.js`. Their size comes from how many projects list them in their own `stack` array. Lines come from the tools used together in a project, plus the `stackLinks` pairs (like Keras and TensorFlow). To add a tool, add one line to `stack`, then list its id in the projects that use it.

## 7. Change the tagline, roles or colours

- Hero headline: `index.html`, inside `<h1 class="hero__title">`.
- Typing roles: `js/config.js`, the `roles` list.
- Colours: top of `css/style.css`. One block for dark, one for light (`--accent`, `--bg`, and the six `--c-*` category colours).

## 8. Deploy (pick one, all free)

**Netlify (fastest):** open <https://app.netlify.com/drop> and drag the `portfolio` folder onto the page. You get a live URL in seconds.

**GitHub Pages:**
1. Create a repo, for example `RudraKsh0091.github.io`, and upload the contents of this folder so `index.html` is at the top level.
2. Repo Settings, Pages, deploy from the `main` branch, root folder.
3. The site goes live at `https://rudraksh0091.github.io`.

**Vercel:** import the GitHub repo at <https://vercel.com/new>. A static site needs no configuration.

## 9. Browser notes

Tested in headless Chromium at desktop and phone widths, in both themes. Animations switch off automatically for visitors who have "reduce motion" turned on. Fonts load from Google Fonts and fall back to system fonts if blocked.
