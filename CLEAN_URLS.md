# Clean URL migration

The production site now uses trailing-slash routes such as `/services/`, `/offers/`, and `/articles/example/`.

- Internal links, canonicals, structured data, and the sitemap use clean routes.
- Legacy `.html` routes remain as noindex redirect pages for GitHub Pages compatibility.
- `_redirects` contains permanent redirects for Netlify-compatible hosts.

## Cloudflare permanent redirects

GitHub Pages serves static files and cannot emit real HTTP 301 responses for old `.html` files. After GitHub Pages HTTPS is active, configure Cloudflare Redirect Rules (with Cloudflare proxy enabled) to permanently redirect each old `.html` URL to its clean equivalent. The static redirect pages remain a fallback.

Examples:

- `/index.html` → `/`
- `/services.html` → `/services/`
- `/offers.html` → `/offers/`
- `/articles/index.html` → `/articles/`
- `/articles/beard-care-guide.html` → `/articles/beard-care-guide/`
