# anarusdiati.github.io

My personal website — home, blog, projects (with tag filtering), hobby, and about. Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com), light mode, hosted free on GitHub Pages.

## Quick start

```bash
npm install      # install dependencies
npm run dev      # start dev server at http://localhost:4321
npm run build    # build static site to ./dist
npm run preview  # preview the production build locally
```

Requires Node 18+ (Node 20 recommended).

## Project structure

```
anarusdiati.github.io/
├── .github/workflows/deploy.yml   # auto-deploy to GitHub Pages on push
├── public/                        # static assets (favicon, images)
│   └── favicon.svg
├── src/
│   ├── components/                # reusable UI (Nav, Footer, cards, Tag)
│   ├── content/
│   │   ├── config.ts              # schema for blog & projects
│   │   ├── blog/                  # blog posts (.md) — add files here
│   │   └── projects/              # projects (.md) — add files here
│   ├── layouts/BaseLayout.astro   # shared page shell
│   ├── pages/                     # routes
│   │   ├── index.astro            # Home
│   │   ├── about.astro            # About
│   │   ├── hobby.astro            # Hobby
│   │   ├── blog/                  # blog list + [slug] detail
│   │   └── projects/index.astro   # Projects + tag filter
│   ├── styles/global.css          # Tailwind + base styles
│   └── consts.ts                  # site name, nav links, social links
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Make it yours

1. **Site info & nav** — edit `src/consts.ts` (name, email, GitHub, social links).
2. **Colors** — change the `primary` palette in `tailwind.config.mjs`.
3. **Home / About / Hobby** — edit the matching files in `src/pages/`.

## Adding a blog post

Create a new `.md` file in `src/content/blog/`:

```md
---
title: "My Post Title"
description: "One-line summary shown in the list."
date: 2026-07-15
tags: ["Tutorial", "Web"]
draft: false
---

Write your post in Markdown here.
```

## Adding a project (with tags for the filter)

Create a new `.md` file in `src/content/projects/`:

```md
---
title: "My Project"
description: "What it is, in one line."
tags: ["AI", "Design"]      # these tags power the filter buttons
date: 2026-06-01
link: "https://live-demo.com"           # optional
github: "https://github.com/you/repo"   # optional
featured: true                          # shows on the home page
---

A longer write-up of the project.
```

The **Projects page filter is automatic** — it collects every unique tag across all
projects and generates a filter button for each. Just add tags and they appear.

## Deploy to GitHub Pages (free)

1. Create a repo named **`anarusdiati.github.io`** (must match your GitHub username exactly for a root user site).
2. Push this code to the `main` branch.
3. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
4. Every push to `main` builds and deploys automatically. Your site goes live at `https://anarusdiati.github.io`.

> Using a **project repo** instead (e.g. `github.com/you/portfolio`)? Set `base: '/portfolio'`
> and `site: 'https://you.github.io'` in `astro.config.mjs`, and the site will live at
> `https://you.github.io/portfolio`.

## Renaming from the placeholder

Replace `anarusdiati` with your real GitHub username in:

- the repo/folder name
- `astro.config.mjs` (`site`)
- `src/consts.ts` (`github` link)
- `package.json` (`name`) — optional

## Blog stats: views, likes & share

Each blog post shows **Share** buttons (X, LinkedIn, WhatsApp, Copy link) — these work
right away, no setup. **Views** and **Likes** need two free external services because
GitHub Pages is a static host. Fill in `ANALYTICS` in `src/consts.ts` to turn them on.

### Views — GoatCounter (free)

1. Sign up at https://www.goatcounter.com and pick a code, e.g. `anarusdiati`
   (your address becomes `https://anarusdiati.goatcounter.com`).
2. In GoatCounter → **Settings**, turn ON **"Allow adding visitor counts on your website"**.
3. In `src/consts.ts`, set `goatcounterCode: 'anarusdiati'`.

Counts only appear on the **live site** (GoatCounter ignores `localhost`), and are cached
for up to ~4 hours.

### Likes — Lyket (free)

1. Sign up at https://lyket.dev and copy your **public API key**.
2. In Lyket settings, restrict the key to your domain (`anarusdiati.github.io`).
3. In `src/consts.ts`, set `lyketApiKey: 'your-public-key'`.

Leave either value as `''` to hide that feature and keep only the Share buttons.
