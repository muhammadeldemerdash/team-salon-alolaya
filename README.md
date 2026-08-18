# Team Salon Olaya — Astro

This is the Astro migration of the approved Team Salon Olaya website. The design, RTL layout, responsive behavior, images, CMS content, SEO output, and client-side animations are preserved.

## Architecture

- **Astro** builds the production site into `dist/`.
- **Pages CMS** continues to edit `content/*.json` and `content/articles/*.md` through `.pages.yml`.
- `scripts/generate-static.cjs` renders CMS data into the approved HTML markup.
- `scripts/html-to-astro.cjs` prepares Astro routes using raw snapshots, preventing visual markup drift during migration.
- `assets/` remains the editable source for CSS, JavaScript, and images; it is copied into `public/assets/` during preparation.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:4321`.

When CMS content or legacy templates change while the dev server is running, restart `npm run dev` so the preparation step reruns.

## Production build

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Production branch: `main`

## Pages CMS workflow

1. An editor changes content in Pages CMS.
2. Pages CMS commits JSON or Markdown to GitHub.
3. Netlify runs `npm run build`.
4. Astro regenerates and publishes the site.

## Important source locations

- `.pages.yml` — CMS fields and media paths
- `content/` — branch settings, services, offers, and articles
- `templates/` — approved HTML design templates
- `assets/` — editable CSS, JavaScript, and images
- `src/pages/` — generated Astro endpoint routes that return the approved HTML without Vite parsing inline tracking scripts

Do not hand-edit generated files in `src/pages/`, `.generated/`, or `dist/`; update the CMS content, templates, or assets instead.

## Clean URLs

Public pages use clean trailing-slash routes without `.html`. Legacy `.html` URLs are retained as redirect pages. See `CLEAN_URLS.md`.
