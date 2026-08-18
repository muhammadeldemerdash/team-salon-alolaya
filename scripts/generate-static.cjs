const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, '.generated');
const templates = path.join(root, 'templates');
const contentDir = path.join(root, 'content');

const read = (p) => fs.readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));
const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const assetUrl = (value) => {
  if (!value) return '';
  const image = String(value);
  return /^https?:\/\//i.test(image) || image.startsWith('/')
    ? image
    : `/${image.replace(/^\.?\//, '')}`;
};

const gtmHead = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5ZS2ZFH4');</script>
<!-- End Google Tag Manager -->`;
const gtmBody = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZS2ZFH4"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

function injectGoogleTagManager(html) {
  if (html.includes('GTM-5ZS2ZFH4')) return html;
  if (!/<head(?:\s[^>]*)?>/i.test(html) || !/<body(?:\s[^>]*)?>/i.test(html)) {
    throw new Error('Page is missing the head or body required for Google Tag Manager');
  }
  return html
    .replace(/<head(?:\s[^>]*)?>/i, `$&\n${gtmHead}`)
    .replace(/<body(?:\s[^>]*)?>/i, `$&\n${gtmBody}`);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(from, to) : fs.copyFileSync(from, to);
  }
}

function parseFrontmatter(source) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) throw new Error('Article is missing frontmatter');
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    data[key] = value;
  }
  return { data, body: match[2].trim() };
}

function inlineMarkdown(text) {
  let out = esc(text);
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" class="article-inline-image">');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>');
  return out;
}

function markdownToHtml(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push(`<ul>\n${list.map(x => `        <li>${inlineMarkdown(x)}</li>`).join('\n')}\n      </ul>`);
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    if (line.startsWith('### ')) { flushParagraph(); flushList(); blocks.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`); }
    else if (line.startsWith('## ')) { flushParagraph(); flushList(); blocks.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`); }
    else if (line.startsWith('- ')) { flushParagraph(); list.push(line.slice(2)); }
    else { flushList(); paragraph.push(line); }
  }
  flushParagraph(); flushList();
  return blocks.join('\n\n      ');
}

function replaceMarked(html, marker, replacement) {
  const pattern = new RegExp(`<!-- CMS_${marker}_START -->[\\s\\S]*?<!-- CMS_${marker}_END -->`);
  if (!pattern.test(html)) throw new Error(`Marker ${marker} not found`);
  return html.replace(pattern, `<!-- CMS_${marker}_START -->\n${replacement}\n<!-- CMS_${marker}_END -->`);
}

const site = json(path.join(contentDir, 'site.json'));
const services = json(path.join(contentDir, 'services.json')).services;
const offers = json(path.join(contentDir, 'offers.json')).offers;

const teamData = fs.existsSync(path.join(contentDir, 'team.json')) ? json(path.join(contentDir, 'team.json')).team || [] : [];
const articles = fs.readdirSync(path.join(contentDir, 'articles'))
  .filter(f => f.endsWith('.md'))
  .map(file => ({ file, ...parseFrontmatter(read(path.join(contentDir, 'articles', file))) }))
  .filter(a => a.data.published !== false)
  .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)));

const servicePages = {};
for (const file of fs.readdirSync(path.join(contentDir, 'service-pages'))) {
  if (!file.endsWith('.md')) continue;
  const page = parseFrontmatter(read(path.join(contentDir, 'service-pages', file)));
  if (page.data.published === false) continue;
  servicePages[page.data.slug] = page;
}

function applySite(html) {
  const replacements = [
    [/https:\/\/salon-team\.com/g, site.domain.replace(/\/$/, '')],
    [/\+966 55 679 2162/g, site.phoneDisplay],
    [/\+966556792162/g, site.phone],
    [/966556792162/g, site.whatsapp],
    [/العليا، بجوار مترو وزارة الداخلية، الرياض، المملكة العربية السعودية/g, site.addressFull],
    [/العليا، بجوار مترو وزارة الداخلية، الرياض/g, site.addressShort],
    [/فرع العليا/g, `فرع ${site.branchName}`],
    [/Team Salon العليا/g, site.siteName],
    [/https:\/\/www\.google\.com\/maps\/dir\/\/Team\+Salon\+Al\+Nakheel[^\"]+/g, site.mapUrl],
    [/https:\/\/www\.google\.com\/maps\?q=24\.7464426,46\.6196912&z=15&output=embed/g, site.mapEmbed]
  ];
  for (const [pattern, value] of replacements) html = html.replace(pattern, value);
  html = html.replace(/__FRESHA_URL__/g, site.freshaUrl || '#');
  return html;
}

const serviceIcons = [
  '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="8"/><path d="M10 40c2-9 8-13 14-13s12 4 14 13"/><path d="M14 16c2-7 7-11 14-10"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 11h24v8H12z"/><path d="M18 19h12l-3 22h-6z"/><path d="M15 15h18"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="13" cy="35" r="6"/><circle cx="35" cy="35" r="6"/><path d="M17 31 36 10M31 31 12 10M21 23h6"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 19c0-9 5-14 11-14s11 5 11 14v10c0 8-5 14-11 14S13 37 13 29z"/><circle cx="20" cy="23" r="1"/><circle cx="28" cy="23" r="1"/><path d="M20 32c3 2 5 2 8 0M8 14l3-1m28 1-3-1M24 1v3"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 38h22M17 38c-2-5 0-10 7-12 7 2 9 7 7 12M20 25c-2-4 0-8 4-10 4 2 6 6 4 10M22 14c-1-4 0-7 2-10 2 3 3 6 2 10"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 37V17c0-7 4-11 9-11s9 4 9 11v20"/><path d="M11 24h26M18 17h12M19 37v6m10-6v6"/><circle cx="24" cy="29" r="4"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="11" r="6"/><path d="M13 42v-9c0-8 4-13 11-13s11 5 11 13v9M13 29 7 35m28-6 6 6M19 24v18m10-18v18"/><path d="M17 34h14"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 18c3-8 8-12 14-12s11 4 14 12v15c-4 6-9 9-14 9s-10-3-14-9z"/><path d="M10 21c4 3 8 4 14 4s10-1 14-4M18 30h2m8 0h2M21 36h6"/></svg>'
];
const benefitIcons = {
  shield:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v8c0 7-4 11-11 14C9 26 5 22 5 15V7z"/><path d="m11 16 3 3 7-8"/></svg>',
  star:'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12"/><path d="m16 8 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/></svg>',
  calendar:'<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="7" width="24" height="21" rx="3"/><path d="M9 3v8m14-8v8M4 13h24"/><circle cx="16" cy="20" r="3"/></svg>',
  award:'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="13" r="9"/><path d="m10 21-2 8 8-4 8 4-2-8M16 8l1.5 3 3.5.5-2.5 2.5.6 3.5-3.1-1.7-3.1 1.7.6-3.5-2.5-2.5 3.5-.5z"/></svg>'
};
const serviceCardsHome = (text = s => s.summary) => `<div class="services-premium">
      <div class="services-grid services-grid--premium">
${services.map((s, i) => `        <article class="service-card service-card--premium">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
          <span class="service-icon">${serviceIcons[i % serviceIcons.length]}</span>
          <h3>${esc(s.title)}</h3>
          <span class="service-title-line" aria-hidden="true"></span>
          <p>${esc(text(s))}</p>
          <a class="service-read-more" href="${esc(s.url || '/services/')}">اقرأ المزيد ←</a>
        </article>`).join('\n')}
      </div>
      <div class="service-benefits" aria-label="مميزات خدماتنا">
        <div class="service-benefit"><span class="benefit-icon">${benefitIcons.shield}</span><span><strong>تعقيم وأدوات معقمة</strong><small>أعلى معايير النظافة</small></span></div>
        <div class="service-benefit"><span class="benefit-icon">${benefitIcons.star}</span><span><strong>خبرة احترافية</strong><small>حلاقون متخصصون</small></span></div>
        <div class="service-benefit"><span class="benefit-icon">${benefitIcons.calendar}</span><span><strong>مواعيد مرنة</strong><small>حجز سريع وسهل</small></span></div>
        <div class="service-benefit"><span class="benefit-icon">${benefitIcons.award}</span><span><strong>منتجات أصلية</strong><small>جودة تستحق الثقة</small></span></div>
      </div>
    </div>`;

const serviceCardsPage = serviceCardsHome(s => s.description || s.summary);

const offerImages = [
  'assets/images/hero.webp',
  'assets/images/offers/packages.webp',
  'assets/images/offers/vip.webp',
  'assets/images/offers-poster.jpg'
];
const packageArrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const offerCard = (o, index = 0) => {
  const rawImage = o.image || offerImages[index % offerImages.length];
  const image = String(rawImage).startsWith('http') || String(rawImage).startsWith('/')
    ? rawImage
    : `/${String(rawImage).replace(/^\.?\//, '')}`;
  const isVip = String(o.category).includes('VIP');
  const isDiamond = o.title === 'الباقة الماسية';
  const message = encodeURIComponent(`مرحباً، أريد الاستفسار عن ${o.title || o.category} بسعر ${o.price} ${o.currency || 'ريال'}`);
  return `<article class="package-card ${isVip ? 'package-card--vip' : ''}${isDiamond ? ' package-card--diamond' : ''}">
          <div class="package-card-inner">
            <div class="package-image-box">
              <img src="${image}" alt="${esc(o.title || o.category)}" loading="lazy">
            </div>
            <div class="package-icon-wrap">
              <a class="package-icon-box" href="https://wa.me/${site.whatsapp}?text=${message}" target="_blank" rel="noopener" aria-label="استفسر عن ${esc(o.title || o.category)}">${packageArrow}</a>
            </div>
          </div>
          <div class="package-card-content">
            <div class="package-title-row">
              <h3>${esc(o.title || o.category)}</h3>
              <span class="package-price"><b>${esc(o.price)}</b><small>${esc(o.currency || 'ريال')}</small></span>
            </div>
            <p>${esc(o.description)}</p>
            <div class="package-card-actions">
              <ul class="package-tags" aria-label="خيارات الحجز">
                <li><a class="package-tag package-tag--category" href="${esc(site.freshaUrl || '#')}" target="_blank" rel="noopener" onclick="dataLayer.push({event:'fresha_click',location:'offer_tag'})">${esc(o.category)}</a></li>
                <li><a class="package-tag package-tag--booking" href="https://wa.me/${site.whatsapp}?text=${message}" target="_blank" rel="noopener">حجز عبر واتساب</a></li>
              </ul>
            </div>
          </div>
        </article>`;
};
const featuredOffers = `<div class="packages-design-grid packages-design-grid--four home-packages-grid">\n${offers.filter(o => o.featured).slice(0, 4).map(o => `        ${offerCard(o, offers.indexOf(o))}`).join('\n')}\n      </div>`;
const categories = [...new Set(offers.map(o => o.category))];
const allOffers = categories.map(category => `<div class="package-category-group">\n        <h3 class="package-category-title"><span class="package-category-line" aria-hidden="true"></span><span class="package-category-label">${esc(category)}</span></h3>\n        <div class="packages-design-grid ${offers.filter(o => o.category === category).length > 3 ? 'packages-design-grid--four' : ''}">\n          ${offers.filter(o => o.category === category).map(o => offerCard(o, offers.indexOf(o))).join('\n          ')}\n        </div>\n      </div>`).join('\n\n      ');


const freshaIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zM9 14h2v2H9zm4 0h2v2h-2z"/></svg>';
function teamCards() {
  if (!teamData.length) return '';
  return `<div class="team-packages-grid">
${teamData.map(m => {
    const img = assetUrl(m.image);
    const bookingUrl = esc(m.freshaUrl || site.freshaUrl || '#');
    const waText = encodeURIComponent(`مرحباً، أريد الحجز مع ${m.name}`);
    return `        <article class="package-card team-package-card">
          <div class="package-card-inner">
            <div class="package-image-box">
              <img src="${img}" alt="${esc(m.name)}" loading="lazy">
            </div>
            <div class="package-icon-wrap">
              <a class="package-icon-box" href="https://wa.me/${site.whatsapp}?text=${waText}" target="_blank" rel="noopener" aria-label="تواصل عبر واتساب مع ${esc(m.name)}">${packageArrow}</a>
            </div>
          </div>
          <div class="package-card-content">
            <div class="package-title-row">
              <h3>${esc(m.name)}</h3>
              <span class="package-price team-role"><small>${esc(m.role)}</small></span>
            </div>
            <p>${esc(m.bio)}</p>
            <div class="package-card-actions">
              <ul class="package-tags" aria-label="خيارات الحجز">
                <li><a class="package-tag package-tag--category" href="${bookingUrl}" target="_blank" rel="noopener" onclick="dataLayer.push({event:'fresha_click',technician:'${esc(m.name)}',location:'team_card'})">احجز موعد على فريشا</a></li>
                <li><a class="package-tag package-tag--booking" href="https://wa.me/${site.whatsapp}?text=${waText}" target="_blank" rel="noopener">حجز عبر واتساب</a></li>
              </ul>
            </div>
          </div>
        </article>`;
  }).join('\n')}
      </div>`;
}
function articleCards() {
  return `<div class="article-grid">\n${articles.map(a => `        <a class="article-card" href="/articles/${esc(a.data.slug)}/">\n          ${a.data.image ? `<img class="article-card-image" src="${esc(assetUrl(a.data.image))}" alt="صورة مقال: ${esc(a.data.title)}" loading="lazy">` : ''}\n          <div class="article-card-content">\n            <span class="tag">${esc(a.data.category)}</span>\n            <h3>${esc(a.data.title)}</h3>\n            <p>${esc(a.data.excerpt)}</p>\n            <span class="read-more">اقرأ المقال ←</span>\n          </div>\n        </a>`).join('\n')}\n      </div>`;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));
copyDir(path.join(root, 'admin'), path.join(dist, 'admin'));

// Build regular pages from the received design.
for (const entry of fs.readdirSync(templates, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  let html = applySite(read(path.join(templates, entry.name)));
  if (entry.name === 'index.html') {
    html = replaceMarked(html, 'SERVICES', serviceCardsHome());
    html = replaceMarked(html, 'FEATURED_OFFERS', featuredOffers);
    html = replaceMarked(html, 'ARTICLES', articleCards());
    if (/<!-- CMS_TEAM_START -->/.test(html)) html = replaceMarked(html, 'TEAM', teamCards());
  } else if (entry.name === 'services.html') {
    html = replaceMarked(html, 'SERVICES', serviceCardsPage);
  } else if (entry.name === 'offers.html') {
    html = replaceMarked(html, 'OFFERS', allOffers);
  } else {
    const page = servicePages[entry.name.replace(/\.html$/, '')];
    if (page) {
      const p = page.data;
      html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.seoTitle || p.title)}</title>`);
      const description = `<meta name="description" content="${esc(p.seoDescription || p.excerpt || '')}">`;
      if (/<meta name="description" content="[^"]*">/.test(html)) {
        html = html.replace(/<meta name="description" content="[^"]*">/, description);
      } else {
        html = html.replace(/<meta name="viewport"[^>]*>/, `$&${description}`);
      }
      const main = `<main>\n  <section class="page-hero">\n    <div class="container">\n      <div class="breadcrumb"><a href="/">الرئيسية</a> / <a href="/services/">خدماتنا</a> / ${esc(p.title)}</div>\n      <h1>${esc(p.title)}</h1>\n    </div>\n  </section>\n\n  <section class="section">\n    <div class="container article-body">\n\n      ${markdownToHtml(page.body)}\n\n    </div>\n  </section>\n\n  <section class="cta-band">\n    <div class="container">\n      <h2>جاهز تحجز موعدك؟</h2>\n      <p>تواصل معنا الآن عبر واتساب أو اتصل مباشرة.</p>\n      <div class="btn-row" style="justify-content:center;">\n        <a class="btn btn-primary" href="https://wa.me/${esc(site.whatsapp)}" target="_blank" rel="noopener">احجز عبر واتساب</a>\n        <a class="btn btn-outline" href="tel:${esc(site.phone)}">اتصل الآن</a>\n      </div>\n    </div>\n  </section>\n</main>`;
      html = html.replace(/<main>[\s\S]*?<\/main>/, main);
    }
  }
  fs.writeFileSync(path.join(dist, entry.name), injectGoogleTagManager(html));
}


// Generate team page
const teamTemplatePath = path.join(templates, 'team.html');
if (fs.existsSync(teamTemplatePath)) {
  let teamHtml = applySite(read(teamTemplatePath));
  teamHtml = replaceMarked(teamHtml, 'TEAM', teamCards());
  fs.writeFileSync(path.join(dist, 'team.html'), teamHtml);
}
fs.mkdirSync(path.join(dist, 'articles'), { recursive: true });
let listing = applySite(read(path.join(templates, 'articles', 'index.html')));
listing = replaceMarked(listing, 'ARTICLES', articleCards());
fs.writeFileSync(path.join(dist, 'articles', 'index.html'), injectGoogleTagManager(listing));

const shell = read(path.join(templates, 'articles', 'article.html'));
for (const article of articles) {
  const a = article.data;
  let html = applySite(shell);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(a.seoTitle || a.title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(a.seoDescription || a.excerpt)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${site.domain.replace(/\/$/, '')}/articles/${esc(a.slug)}/">`);
  const schema = {
    '@context': 'https://schema.org', '@type': 'Article', headline: a.title,
    description: a.seoDescription || a.excerpt, datePublished: a.date,
    author: { '@type': 'Organization', name: a.author || 'فريق Team Salon' },
    publisher: { '@type': 'Organization', name: site.siteName },
    mainEntityOfPage: `${site.domain.replace(/\/$/, '')}/articles/${a.slug}/`
  };
  if (a.image) {
    const image = assetUrl(a.image);
    schema.image = /^https?:\/\//i.test(image) ? image : `${site.domain.replace(/\/$/, '')}${image}`;
  }
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`);
  const articleImage = a.image
    ? `<img class="article-featured-image" src="${esc(assetUrl(a.image))}" alt="صورة مقال: ${esc(a.title)}">`
    : '';
  const main = `<main>\n  <section class="page-hero">\n    <div class="container">\n      <div class="breadcrumb"><a href="/">الرئيسية</a> / <a href="/articles/">المقالات</a> / ${esc(a.title)}</div>\n      <h1>${esc(a.title)}</h1>\n    </div>\n  </section>\n\n  <section class="section">\n    <div class="container article-body">\n      ${articleImage}\n      <div class="article-meta"><span>${esc(a.author || 'فريق Team Salon')}</span><span>${esc(a.category)}</span><span>${esc(a.date || '')}</span></div>\n\n      ${markdownToHtml(article.body)}\n\n      <div class="btn-row" style="margin-top:2em;">\n        <a class="btn btn-primary" href="https://wa.me/${esc(site.whatsapp)}" target="_blank" rel="noopener">احجز موعدك عبر واتساب</a>\n      </div>\n    </div>\n  </section>\n</main>`;
  html = html.replace(/<main>[\s\S]*?<\/main>/, main);
  fs.writeFileSync(path.join(dist, 'articles', `${a.slug}.html`), injectGoogleTagManager(html));
}

const staticPages = ['team.html','services.html','offers.html','contact.html','haircut.html','home-haircut.html','hair-system.html','hair-fiber.html','hair-color.html','rasta.html','curly.html','facial.html','massage.html','spa.html','moroccan-bath.html','pedicure.html'];
const base = site.domain.replace(/\/$/, '');
const cleanPath = p => `/${p.replace(/\.html$/, '')}/`;
const urls = [
  { loc: `${base}/`, freq: 'weekly', priority: '1.0' },
  ...staticPages.filter(p => fs.existsSync(path.join(dist, p))).map(p => ({ loc: `${base}${cleanPath(p)}`, freq: p === 'offers.html' ? 'weekly' : 'monthly', priority: p === 'offers.html' ? '0.9' : '0.7' })),
  { loc: `${base}/team/`, freq: 'monthly', priority: '0.7' },
  { loc: `${base}/articles/`, freq: 'weekly', priority: '0.8' },
  ...articles.map(a => ({ loc: `${base}/articles/${a.data.slug}/`, freq: 'monthly', priority: '0.7' }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
const legacyRedirects = [
  '/index.html / 301',
  ...staticPages.map(p => `/${p} ${cleanPath(p)} 301`),
  '/articles/index.html /articles/ 301',
  ...articles.map(a => `/articles/${a.data.slug}.html /articles/${a.data.slug}/ 301`),
  '/admin /admin/index.html 200'
];
fs.writeFileSync(path.join(dist, '_redirects'), `${legacyRedirects.join('\n')}\n`);

console.log(`Built ${staticPages.length + articles.length + 2} pages for Astro in .generated/`);
