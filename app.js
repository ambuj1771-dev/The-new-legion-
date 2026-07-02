/* =========================================================
   THE ONE JOURNAL — app.js
   Single-file SPA: front page, sections, article view,
   password-protected control panel, view tracking,
   privacy/about/contact pages.
   Data persists in localStorage.
   ========================================================= */

const ADMIN_PW = "solojournal2026";
const SESSION_KEY = "toj_admin_session";

const SECTIONS = ["World", "Regional Watch", "Tech", "HTML Journal"];

const CONTACT_EMAIL = "theonejournal2026@gmail.com";
const PHONE_NUMBER = "+91 6393079532";
const YT_NAME = "ADI GEOSPACE";
const YT_URL = "https://www.youtube.com/@Adigeospace";
const UPI_ID = "6393079532@fam";
const QR_CODE_IMAGE = "upi-qr.jpeg"; // place this file next to index.html and app.js
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xeebkkyp";

/* ---------- Supabase config (shared database for all visitors) ---------- */
const SUPABASE_URL = "https://uphlhpzgozzswxsacuam.supabase.co";
const SUPABASE_KEY = "sb_publishable_ihyMlIjeD1YJk6yZDvEbgQ_3VUrDfAR";
const SUPABASE_REST = `${SUPABASE_URL}/rest/v1/articles`;
const SUPABASE_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

/* ---------- seed data so the site isn't empty on first load ---------- */
const SEED_ARTICLES = [
  {
    id: "seed-1",
    section: "World",
    headline: "Global Leaders Convene as Diplomatic Talks Resume in Geneva",
    deck: "Delegates from a dozen nations returned to the negotiating table today, signaling a renewed push toward a long-stalled accord.",
    byline: "Maria Hendricks",
    body: "Diplomatic delegations from across the globe gathered in Geneva this week for the first formal round of talks in over eight months.\n\nOfficials described the atmosphere as cautiously optimistic, with several delegations signaling new flexibility on long-standing sticking points.\n\nAnalysts caution that meaningful progress will likely take weeks, if not months, to materialize into a formal agreement.",
    image: null,
    caption: "",
    breaking: true,
    featured: true,
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: "seed-2",
    section: "Tech",
    headline: "Chipmakers Report Surge in Demand for On-Device AI Hardware",
    deck: "Quarterly earnings point to a sharp pivot toward local processing as device makers race to ship AI features.",
    byline: "Daniel Osei",
    body: "Major semiconductor firms posted unexpectedly strong quarterly results, driven largely by demand for chips capable of running AI workloads locally on consumer devices.\n\nExecutives pointed to a broader industry shift away from cloud-dependent processing, citing both cost and privacy considerations.\n\nThe trend is expected to accelerate through the rest of the year as more manufacturers integrate dedicated AI silicon into mainstream products.",
    image: null,
    caption: "",
    breaking: false,
    featured: false,
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    id: "seed-3",
    section: "World",
    headline: "Coastal Cities Accelerate Flood-Defense Spending",
    deck: "Municipal budgets earmark record sums for sea walls and drainage upgrades amid rising tide forecasts.",
    byline: "Priya Nakamura",
    body: "Several coastal municipalities have announced expanded infrastructure budgets aimed at flood mitigation, citing updated tide and storm-surge forecasts.\n\nEngineers say the new spending, while substantial, only partially closes the gap identified in recent climate-resilience audits.\n\nLocal officials emphasized that further federal support will likely be necessary to complete the most ambitious proposals.",
    image: null,
    caption: "",
    breaking: false,
    featured: false,
    timestamp: Date.now() - 1000 * 60 * 60 * 11,
  },
  {
    id: "seed-4",
    section: "HTML Journal",
    headline: "Welcome to HTML Journal",
    deck: "A dedicated space for long-form pieces and archival documents, imported straight from HTML source files.",
    byline: "The Editors",
    body: "HTML Journal is a special section for longer-form writing and archival material.\n\nArticles here can be authored directly in the control panel, or imported from an existing .html file — the importer automatically strips markup and pulls in the plain text.",
    image: null,
    caption: "",
    breaking: false,
    featured: false,
    timestamp: Date.now() - 1000 * 60 * 60 * 20,
  },
];

/* ---------- storage helpers (Supabase-backed, shared across all visitors) ---------- */
let seedAttempted = false;

async function loadArticles() {
  try {
    const res = await fetch(`${SUPABASE_REST}?select=*&order=timestamp.desc`, {
      headers: SUPABASE_HEADERS,
    });
    if (!res.ok) throw new Error(`Supabase load failed: ${res.status}`);
    const rows = await res.json();

    if (rows.length === 0 && !seedAttempted) {
      seedAttempted = true;
      await seedDatabase();
      const res2 = await fetch(`${SUPABASE_REST}?select=*&order=timestamp.desc`, {
        headers: SUPABASE_HEADERS,
      });
      const rows2 = await res2.json();
      return rows2.map(normalizeRow);
    }

    return rows.map(normalizeRow);
  } catch (e) {
    console.error("Failed to load articles from Supabase", e);
    showToast("Could not connect to the database. Check your connection and reload.");
    return [];
  }
}

function normalizeRow(row) {
  return {
    id: row.id,
    section: row.section,
    headline: row.headline,
    deck: row.deck,
    byline: row.byline,
    body: row.body,
    image: row.image,
    caption: row.caption,
    breaking: row.breaking,
    featured: row.featured,
    timestamp: row.timestamp,
    views: row.views || 0,
    tags: row.tags || "",
  };
}

async function seedDatabase() {
  try {
    await fetch(SUPABASE_REST, {
      method: "POST",
      headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify(SEED_ARTICLES),
    });
  } catch (e) {
    console.error("Failed to seed database", e);
  }
}

async function insertArticle(article) {
  try {
    const res = await fetch(SUPABASE_REST, {
      method: "POST",
      headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify([article]),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Insert failed: ${res.status} ${errText}`);
    }
    return true;
  } catch (e) {
    console.error("Failed to insert article", e);
    showToast("Could not publish — check your connection and try again.");
    return false;
  }
}

async function updateArticleRemote(id, fields) {
  try {
    const res = await fetch(`${SUPABASE_REST}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Update failed: ${res.status} ${errText}`);
    }
    return true;
  } catch (e) {
    console.error("Failed to update article", e);
    showToast("Could not save changes — check your connection and try again.");
    return false;
  }
}

async function deleteArticleRemote(id) {
  try {
    const res = await fetch(`${SUPABASE_REST}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: SUPABASE_HEADERS,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Delete failed: ${res.status} ${errText}`);
    }
    return true;
  } catch (e) {
    console.error("Failed to delete article", e);
    showToast("Could not delete — check your connection and try again.");
    return false;
  }
}

function getViewCount(id) {
  const article = state.articles.find((a) => a.id === id);
  return article ? article.views || 0 : 0;
}

async function incrementView(id) {
  const article = state.articles.find((a) => a.id === id);
  if (!article) return;
  const newCount = (article.views || 0) + 1;
  article.views = newCount; // optimistic local update so UI reflects it immediately
  try {
    await fetch(`${SUPABASE_REST}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ views: newCount }),
    });
  } catch (e) {
    console.error("Failed to increment view count", e);
  }
}

/* ---------- app state ---------- */
let state = {
  articles: [],
  route: parseRoute(),
  loading: true,
};

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash || "";
}

window.addEventListener("hashchange", () => {
  state.route = parseRoute();
  render();
  window.scrollTo(0, 0);
});

/* ---------- utility ---------- */
function uid() {
  return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2paragraphs(body) {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fullDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function sectionSlug(section) {
  return section.toLowerCase().replace(/\s+/g, "-");
}

function slugToSection(slug) {
  return SECTIONS.find((s) => sectionSlug(s) === slug);
}

function parseTags(tagsString) {
  if (!tagsString) return [];
  return tagsString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function tagSlug(tag) {
  return tag.toLowerCase().trim().replace(/\s+/g, "-");
}

function getArticlesByTag(slug) {
  return state.articles
    .filter((a) => parseTags(a.tags).some((t) => tagSlug(t) === slug))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function getArticlesBySection(section) {
  return state.articles
    .filter((a) => a.section === section)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function getAllSorted() {
  return [...state.articles].sort((a, b) => b.timestamp - a.timestamp);
}

function getLeadStory() {
  const featured = state.articles.filter((a) => a.featured).sort((a, b) => b.timestamp - a.timestamp);
  if (featured.length) return featured[0];
  return getAllSorted()[0] || null;
}

function findArticle(id) {
  return state.articles.find((a) => a.id === id);
}

function setMetaDescription(text) {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", text ? text.slice(0, 160) : "");
}

function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function isAdminUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/* =========================================================
   SHELL: masthead, ticker, nav, footer
   ========================================================= */

function renderShell(innerHtml) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const tickerItems = getAllSorted().slice(0, 8);
  const tickerHtml = tickerItems.length
    ? tickerItems.map((a) => `<span>${a.breaking ? "BREAKING — " : ""}${escapeHtml(a.headline)}</span>`).join("")
    : `<span>Welcome to The One Journal — your stories will appear here once published.</span>`;

  const route = state.route;
  const navActive = (key) => (route === key ? "active" : "");

  return `
    <div class="masthead-wrap">
      <div class="masthead-top">
        <div class="date-line">
          <span>${escapeHtml(today)}</span>
        </div>
        <button class="lock-btn" id="lockBtn" aria-label="Open control panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          Control Panel
        </button>
      </div>
      <div class="masthead">
        <a href="#/" style="display:inline-block;">
          <h1><span class="the">The</span>One Journal</h1>
        </a>
        <div class="tagline">Daily News · World &amp; Technology</div>
      </div>
      <button class="support-bar" id="supportBarBtn" aria-label="Support independent journalism">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span>Support Independent Journalism</span>
      </button>
      <nav class="main-nav">
        <div class="nav-inner">
          <a href="#/" class="${navActive("")}">Front Page</a>
          <a href="#/section/world" class="${route === "section/world" ? "active" : ""}">World</a>
          <a href="#/section/regional-watch" class="${route === "section/regional-watch" ? "active" : ""}">Regional Watch</a>
          <a href="#/section/tech" class="${route === "section/tech" ? "active" : ""}">Tech</a>
          <a href="#/section/html-journal" class="${route === "section/html-journal" ? "active" : ""}">HTML Journal</a>
        </div>
      </nav>
    </div>
    <div class="ticker-wrap">
      <div class="ticker-label">Latest</div>
      <div class="ticker-track-outer">
        <div class="ticker-track">${tickerHtml}${tickerHtml}</div>
      </div>
    </div>
    <main id="main">${innerHtml}</main>
    ${renderFooter()}
  `;
}

function renderFooter() {
  return `
    <footer>
      <div class="footer-inner">
        <div>
          <div class="footer-brand">The One Journal</div>
          <p>Independent daily reporting on World affairs and Technology — clear, timely, and to the point.</p>
        </div>
        <div>
          <h5>Sections</h5>
          <div class="footer-links">
            <a href="#/section/world">World</a>
            <a href="#/section/regional-watch">Regional Watch</a>
            <a href="#/section/tech">Tech</a>
            <a href="#/section/html-journal">HTML Journal</a>
          </div>
        </div>
        <div>
          <h5>Site</h5>
          <div class="footer-links">
            <a href="#/about">About Us</a>
            <a href="#/contact">Contact Us</a>
            <a href="#/privacy">Privacy Policy</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} The One Journal. All rights reserved.</div>
    </footer>
  `;
}

/* =========================================================
   FRONT PAGE
   ========================================================= */

function renderFrontPage() {
  const all = getAllSorted();
  if (!all.length) {
    return `
      <div class="empty-state">No articles published yet. Open the control panel to publish your first story.</div>
    `;
  }

  const lead = getLeadStory();
  const rest = all.filter((a) => a.id !== lead.id).slice(0, 8);

  const leadHtml = `
    <article class="lead-story${lead.image ? "" : " no-img"}">
      ${
        lead.image
          ? `<div>
        <img class="lead-img" src="${lead.image}" alt="${escapeHtml(lead.headline)}">${lead.caption ? `<div class="lead-img-cap">${escapeHtml(lead.caption)}</div>` : ""}
      </div>`
          : ""
      }
      <div>
        <div class="section-eyebrow">
          ${lead.breaking ? `<span class="tag-breaking">Breaking</span>` : ""}
          <span>${escapeHtml(lead.section)}</span>
        </div>
        <h2><a href="#/article/${lead.id}">${escapeHtml(lead.headline)}</a></h2>
        <p class="deck">${escapeHtml(lead.deck)}</p>
        <div class="byline-row">By <b>${escapeHtml(lead.byline)}</b> · ${relativeTime(lead.timestamp)}</div>
      </div>
    </article>
  `;

  const listHtml = rest
    .map(
      (a) => `
    <article class="story-row ${a.image ? "" : "no-img"}">
      <div>
        <div class="section-eyebrow">
          ${a.breaking ? `<span class="tag-breaking">Breaking</span>` : ""}
          <span>${escapeHtml(a.section)}</span>
        </div>
        <h3><a href="#/article/${a.id}">${escapeHtml(a.headline)}</a></h3>
        <p class="deck">${escapeHtml(a.deck)}</p>
        <div class="byline-row">By <b>${escapeHtml(a.byline)}</b> · ${relativeTime(a.timestamp)}</div>
      </div>
      ${a.image ? `<img class="thumb" src="${a.image}" alt="">` : ""}
    </article>
  `
    )
    .join("");

  return `
    ${leadHtml}
    <div class="section-rail">
      <div class="story-list">${listHtml}</div>
      <div class="rail">
        ${renderRail("World")}
        ${renderRail("Regional Watch")}
        ${renderRail("Tech")}
      </div>
    </div>
  `;
}

function renderRail(section) {
  const items = getArticlesBySection(section).slice(0, 4);
  if (!items.length) return "";
  return `
    <h4>${escapeHtml(section)}</h4>
    ${items
      .map(
        (a) => `
      <div class="rail-item">
        <a href="#/article/${a.id}">${escapeHtml(a.headline)}</a>
        <div class="meta">${a.breaking ? "BREAKING · " : ""}${relativeTime(a.timestamp)}</div>
      </div>
    `
      )
      .join("")}
  `;
}

/* =========================================================
   SECTION PAGE
   ========================================================= */

function renderSectionPage(slug) {
  const section = slugToSection(slug);
  if (!section) {
    return `<div class="empty-state">Section not found.</div>`;
  }
  const items = getArticlesBySection(section);
  document.title = `${section} — The One Journal`;

  if (!items.length) {
    return `
      <h1 class="page-title">${escapeHtml(section)}</h1>
      <div class="empty-state">No ${escapeHtml(section)} articles yet. Check back soon.</div>
    `;
  }

  return `
    <h1 class="page-title">${escapeHtml(section)}</h1>
    <div class="story-list">
      ${items
        .map(
          (a) => `
        <article class="story-row ${a.image ? "" : "no-img"}">
          <div>
            <div class="section-eyebrow">
              ${a.breaking ? `<span class="tag-breaking">Breaking</span>` : ""}
              <span>${escapeHtml(a.section)}</span>
            </div>
            <h3><a href="#/article/${a.id}">${escapeHtml(a.headline)}</a></h3>
            <p class="deck">${escapeHtml(a.deck)}</p>
            <div class="byline-row">By <b>${escapeHtml(a.byline)}</b> · ${relativeTime(a.timestamp)}</div>
          </div>
          ${a.image ? `<img class="thumb" src="${a.image}" alt="">` : ""}
        </article>
      `
        )
        .join("")}
    </div>
  `;
}

function renderTagPage(slug) {
  const items = getArticlesByTag(slug);
  const displayName = items.length ? parseTags(items[0].tags).find((t) => tagSlug(t) === slug) : slug.replace(/-/g, " ");
  document.title = `${displayName} — Tagged Articles — The One Journal`;
  setMetaDescription(`Articles tagged "${displayName}" on The One Journal.`);

  if (!items.length) {
    return `
      <h1 class="page-title">Tag: ${escapeHtml(displayName)}</h1>
      <div class="empty-state">No articles found with this tag yet.</div>
    `;
  }

  return `
    <h1 class="page-title">Tag: ${escapeHtml(displayName)}</h1>
    <div class="story-list">
      ${items
        .map(
          (a) => `
        <article class="story-row ${a.image ? "" : "no-img"}">
          <div>
            <div class="section-eyebrow">
              ${a.breaking ? `<span class="tag-breaking">Breaking</span>` : ""}
              <span>${escapeHtml(a.section)}</span>
            </div>
            <h3><a href="#/article/${a.id}">${escapeHtml(a.headline)}</a></h3>
            <p class="deck">${escapeHtml(a.deck)}</p>
            <div class="byline-row">By <b>${escapeHtml(a.byline)}</b> · ${relativeTime(a.timestamp)}</div>
          </div>
          ${a.image ? `<img class="thumb" src="${a.image}" alt="">` : ""}
        </article>
      `
        )
        .join("")}
    </div>
  `;
}

/* =========================================================
   ARTICLE PAGE
   ========================================================= */

let viewedThisSession = new Set();

function renderArticlePage(id) {
  const article = findArticle(id);
  if (!article) {
    return `<div class="empty-state">Article not found. <br><br><a href="#/" class="btn ghost" style="margin-top:10px;display:inline-block;">Back to Front Page</a></div>`;
  }

  document.title = `${article.headline} — The One Journal`;
  setMetaDescription(article.deck);

  if (!viewedThisSession.has(id)) {
    incrementView(id);
    viewedThisSession.add(id);
  }
  const views = getViewCount(id);
  const tags = parseTags(article.tags);

  return `
    <a href="#/" class="article-back">&larr; Back</a>
    <div class="article-head">
      <div class="section-eyebrow">
        ${article.breaking ? `<span class="tag-breaking">Breaking</span>` : ""}
        <span>${escapeHtml(article.section)}</span>
      </div>
      <h1>${escapeHtml(article.headline)}</h1>
      <p class="deck">${escapeHtml(article.deck)}</p>
      <div class="article-meta">
        <span>By <b>${escapeHtml(article.byline)}</b></span>
        <span>${fullDate(article.timestamp)}</span>
        <span>${views} views</span>
      </div>
    </div>
    ${
      article.image
        ? `<figure class="article-figure"><img src="${article.image}" alt="${escapeHtml(article.headline)}">${article.caption ? `<figcaption>${escapeHtml(article.caption)}</figcaption>` : ""}</figure>`
        : ""
    }
    <div class="article-body">${nl2paragraphs(article.body)}</div>
    ${
      tags.length
        ? `<div class="tag-row" style="max-width:680px;margin:0 auto 20px;">
            ${tags.map((t) => `<a href="#/tag/${tagSlug(t)}" class="tag-chip">${escapeHtml(t)}</a>`).join("")}
          </div>`
        : ""
    }
    <div style="max-width:680px;margin:36px auto 0;">
      <a href="#/" class="article-back">&larr; Back to Front Page</a>
    </div>
  `;
}

/* =========================================================
   STATIC PAGES: About, Privacy, Contact
   ========================================================= */

function renderAboutPage() {
  document.title = "About Us — The One Journal";
  return `
    <div class="static-page">
      <h1>About Us</h1>
      <span class="updated">The One Journal</span>
      <p>The One Journal is an independent digital publication delivering daily news and analysis across World affairs, Technology, and beyond. Our mission is simple: to bring readers clear, timely, and trustworthy reporting in a fast-changing world.</p>
      <p>We believe good journalism doesn't need to be complicated — just accurate, well-written, and easy to follow. Whether it's a breaking development overseas or the latest shift in the tech industry, our goal is to keep you informed without the noise.</p>
      <p>The One Journal is run independently, with a focus on quality over quantity. We're constantly growing, and we welcome readers, feedback, and ideas as we build this publication forward.</p>
      <h2>Follow Along</h2>
      <p>Video coverage and behind-the-scenes updates are shared on our ${YT_NAME} YouTube channel: <a href="${YT_URL}" target="_blank" rel="noopener noreferrer" style="color:var(--red);">${YT_URL}</a></p>
    </div>
  `;
}

function renderPrivacyPage() {
  document.title = "Privacy Policy — The One Journal";
  return `
    <div class="static-page">
      <h1>Privacy Policy</h1>
      <span class="updated">Last updated: ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>

      <p>This Privacy Policy explains how The One Journal ("we," "us," or "our") collects, uses, and protects information when you visit our website. By using this site, you agree to the terms described below.</p>

      <h2>1. Information We Collect</h2>
      <p>We may collect limited information automatically when you visit our site, including your IP address, browser type, device type, pages viewed, and time spent on the site. If you use our contact form, we collect the name, email address, and message you voluntarily provide.</p>

      <h2>2. Cookies</h2>
      <p>Our site may use cookies and similar tracking technologies to improve your browsing experience, remember preferences, and analyze site traffic. You can disable cookies through your browser settings, though some features of the site may not function properly without them.</p>

      <h2>3. Third-Party Advertising</h2>
      <p>We may use third-party advertising companies, such as Google AdSense, to serve ads when you visit our site. These companies may use cookies and similar technologies to collect information about your visits to this and other websites in order to provide advertisements about goods and services of interest to you. Google's use of advertising cookies enables it and its partners to serve ads based on your visits to this site and/or other sites on the Internet.</p>
      <p>You may opt out of personalized advertising by visiting Google's Ads Settings, and you can learn more about how Google uses data at Google's Privacy &amp; Terms page.</p>

      <h2>4. How We Use Information</h2>
      <ul>
        <li>To operate, maintain, and improve our website</li>
        <li>To respond to inquiries submitted through our contact form</li>
        <li>To analyze site traffic and reader engagement</li>
        <li>To display relevant advertising through third-party partners</li>
      </ul>

      <h2>5. Data Sharing</h2>
      <p>We do not sell your personal information. We may share limited data with service providers (such as analytics or advertising partners) strictly to operate and monetize the site, in accordance with their own privacy policies.</p>

      <h2>6. Data Security</h2>
      <p>We take reasonable measures to protect information collected through this site. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.</p>

      <h2>7. Children's Privacy</h2>
      <p>This site is not directed at children under 13, and we do not knowingly collect personal information from children.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.</p>

      <h2>9. Contact Us</h2>
      <p>If you have questions about this Privacy Policy or how your information is handled, please contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:var(--red);">${CONTACT_EMAIL}</a>.</p>
    </div>
  `;
}

function renderContactPage() {
  document.title = "Contact Us — The One Journal";
  return `
    <div class="static-page" style="max-width:900px;">
      <h1>Contact Us</h1>
      <span class="updated">We'd love to hear from you</span>
      <p>Have a tip, a correction, or feedback on a story? Reach out using the details below or send us a message directly.</p>

      <div class="contact-grid">
        <div class="contact-card">
          <h3>Email</h3>
          <div class="val"><a class="val-link" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></div>
          <h3 style="margin-top:16px;">Phone</h3>
          <div class="val">${escapeHtml(PHONE_NUMBER)}</div>
          <h3 style="margin-top:16px;">YouTube</h3>
          <div class="val"><a class="val-link" href="${YT_URL}" target="_blank" rel="noopener noreferrer">${YT_NAME}</a></div>
        </div>
        <form class="contact-card" id="contactForm">
          <h3>Send a Message</h3>
          <div class="form-field">
            <label for="cf-name">Name</label>
            <input id="cf-name" name="name" type="text" required>
          </div>
          <div class="form-field">
            <label for="cf-email">Email</label>
            <input id="cf-email" name="email" type="email" required>
          </div>
          <div class="form-field">
            <label for="cf-msg">Message</label>
            <textarea id="cf-msg" name="message" required></textarea>
          </div>
          <button type="submit" class="btn red" id="cfSubmitBtn">Send Message</button>
          <div id="cfStatus" style="margin-top:10px;font-size:13px;font-family:var(--mono);"></div>
        </form>
      </div>
    </div>
  `;
}

/* =========================================================
   ADMIN: lock modal
   ========================================================= */

function renderLockModal() {
  return `
    <div class="modal-overlay" id="lockOverlay">
      <div class="modal-box">
        <h2>Control Panel</h2>
        <p>Enter the admin password to manage articles.</p>
        <form id="lockForm">
          <div class="form-field">
            <label for="pwInput">Password</label>
            <input id="pwInput" type="password" autocomplete="current-password" autofocus>
          </div>
          <div id="lockErr" class="modal-err"></div>
          <div class="modal-actions">
            <button type="submit" class="btn red">Unlock</button>
            <button type="button" class="btn ghost" id="lockCancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function mountLockModal() {
  const root = document.getElementById("modalRoot");
  root.innerHTML = renderLockModal();
  const overlay = document.getElementById("lockOverlay");
  const form = document.getElementById("lockForm");
  const input = document.getElementById("pwInput");
  const err = document.getElementById("lockErr");

  input.focus();

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) root.innerHTML = "";
  });
  document.getElementById("lockCancel").addEventListener("click", () => {
    root.innerHTML = "";
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === ADMIN_PW) {
      sessionStorage.setItem(SESSION_KEY, "1");
      root.innerHTML = "";
      window.location.hash = "#/admin";
    } else {
      err.textContent = "Incorrect password. Try again.";
      input.value = "";
      input.focus();
    }
  });
}

function renderSupportModal() {
  return `
    <div class="modal-overlay" id="supportOverlay">
      <div class="modal-box support-modal">
        <button class="support-close" id="supportClose" aria-label="Close">&times;</button>
        <div class="support-heart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <h2>Support Independent Journalism</h2>
        <p class="support-copy">
          The One Journal is not funded by any government, agency, or organization. This site runs entirely on one person's ambition — to build independent, non-biased journalism, free from outside influence. Your single donation directly powers that ambition.
        </p>
        <div class="support-qr-wrap">
          ${QR_CODE_IMAGE ? `<img src="${QR_CODE_IMAGE}" alt="UPI QR Code" class="support-qr">` : `<div class="support-qr-placeholder">QR Code</div>`}
        </div>
        <div class="support-upi-row">
          <span class="support-upi-label">UPI ID</span>
          <span class="support-upi-id" id="upiIdText">${escapeHtml(UPI_ID)}</span>
          <button class="btn ghost support-copy-btn" id="copyUpiBtn" type="button">Copy</button>
        </div>
        <p class="support-thanks">Every contribution, big or small, helps keep this journal independent. Thank you.</p>
      </div>
    </div>
  `;
}

function mountSupportModal() {
  const root = document.getElementById("modalRoot");
  root.innerHTML = renderSupportModal();
  const overlay = document.getElementById("supportOverlay");

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) root.innerHTML = "";
  });
  document.getElementById("supportClose").addEventListener("click", () => {
    root.innerHTML = "";
  });
  document.getElementById("copyUpiBtn").addEventListener("click", async () => {
    const btn = document.getElementById("copyUpiBtn");
    try {
      await navigator.clipboard.writeText(UPI_ID);
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = "Copy"; }, 1800);
    } catch (e) {
      showToast("Could not copy — please copy the UPI ID manually.");
    }
  });
}


/* =========================================================
   ADMIN PANEL
   ========================================================= */

let adminTab = "publish"; // 'publish' | 'manage'
let editingId = null; // article id currently being edited, or null for new
let pendingDeleteId = null;
let sortKey = "timestamp";
let sortDir = "desc";
let draftImage = null; // base64 string staged from file input

function blankDraft() {
  return {
    section: "World",
    headline: "",
    deck: "",
    byline: "",
    body: "",
    image: null,
    caption: "",
    breaking: false,
    featured: false,
    tags: "",
  };
}

let formDraft = blankDraft();

function renderAdminPage() {
  if (!isAdminUnlocked()) {
    return `
      <div class="empty-state">
        The control panel is locked.<br><br>
        <button class="btn red" id="adminUnlockBtn">Enter Password</button>
      </div>
    `;
  }

  document.title = "Control Panel — The One Journal";

  return `
    <div class="admin-shell">
      <div class="admin-bar">
        <h1>Control Panel</h1>
        <button class="btn ghost" id="adminLogoutBtn">Lock Panel</button>
      </div>
      <div class="admin-tabs">
        <button data-tab="publish" class="${adminTab === "publish" ? "active" : ""}">${editingId ? "Edit Article" : "Publish New Article"}</button>
        <button data-tab="manage" class="${adminTab === "manage" ? "active" : ""}">Manage Articles (${state.articles.length})</button>
      </div>
      ${adminTab === "publish" ? renderPublishForm() : renderManageTable()}
    </div>
  `;
}

function renderPublishForm() {
  const d = formDraft;
  const isHtmlJournal = d.section === "HTML Journal";

  return `
    <form id="publishForm">
      <div class="admin-grid">
        <div>
          <fieldset>
            <legend>Article Details</legend>
            <div class="form-field">
              <label for="f-section">Section</label>
              <select id="f-section">
                ${SECTIONS.map((s) => `<option value="${s}" ${d.section === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="f-headline">Headline</label>
              <input id="f-headline" type="text" value="${escapeHtml(d.headline)}" placeholder="e.g. Markets Rally After Rate Decision">
            </div>
            <div class="form-field">
              <label for="f-deck">Deck / Summary</label>
              <textarea id="f-deck" placeholder="One or two sentences summarizing the story" style="min-height:70px;">${escapeHtml(d.deck)}</textarea>
            </div>
            <div class="form-field">
              <label for="f-byline">Byline (Author)</label>
              <input id="f-byline" type="text" value="${escapeHtml(d.byline)}" placeholder="e.g. Jordan Lee">
            </div>
            <div class="form-field">
              <label for="f-tags">Tags (comma-separated)</label>
              <input id="f-tags" type="text" value="${escapeHtml(d.tags || "")}" placeholder="e.g. Iran, War, Middle East">
            </div>
          </fieldset>

          <fieldset>
            <legend>Flags</legend>
            <div class="checkbox-row breaking">
              <input type="checkbox" id="f-breaking" ${d.breaking ? "checked" : ""}>
              <label for="f-breaking">Mark as Breaking News</label>
            </div>
            <div class="checkbox-row">
              <input type="checkbox" id="f-featured" ${d.featured ? "checked" : ""}>
              <label for="f-featured">Feature on Front Page (lead story)</label>
            </div>
          </fieldset>
        </div>

        <div>
          ${
            isHtmlJournal
              ? `
          <div class="htmljournal-box">
            <p><b>HTML Journal import:</b> upload an .html file to automatically strip the markup, extract the plain text into the body field below, and keep this article filed under HTML Journal.</p>
            <div class="file-drop" id="htmlDrop">
              <span id="htmlDropLabel">Choose .html file from device</span>
              <input type="file" id="f-htmlfile" accept=".html,.htm,text/html">
            </div>
          </div>
          `
              : ""
          }

          <fieldset>
            <legend>Body</legend>
            <div class="form-field">
              <label for="f-body">Body text (separate paragraphs with a blank line)</label>
              <textarea id="f-body" style="min-height:220px;" placeholder="Write the article body here...">${escapeHtml(d.body)}</textarea>
            </div>
          </fieldset>

          <fieldset>
            <legend>Image</legend>
            <div class="file-drop ${draftImage ? "has-file" : ""}" id="imgDrop">
              <span id="imgDropLabel">${draftImage ? "Photo selected — click to change" : "Choose photo from device"}</span>
              <input type="file" id="f-imagefile" accept="image/*">
            </div>
            ${draftImage ? `<img class="img-preview" id="imgPreview" src="${draftImage}" alt="Preview">` : `<img class="img-preview" id="imgPreview" style="display:none;" alt="Preview">`}
            <div class="form-field" style="margin-top:12px;">
              <label for="f-caption">Image caption (optional)</label>
              <input id="f-caption" type="text" value="${escapeHtml(d.caption)}" placeholder="Photo credit or caption">
            </div>
            ${draftImage ? `<button type="button" class="btn ghost" id="removeImgBtn" style="margin-top:8px;">Remove photo</button>` : ""}
          </fieldset>
        </div>
      </div>

      <div class="modal-actions" style="margin-top:6px;">
        <button type="submit" class="btn red">${editingId ? "Save Changes" : "Publish Article"}</button>
        ${editingId ? `<button type="button" class="btn ghost" id="cancelEditBtn">Cancel Edit</button>` : `<button type="button" class="btn ghost" id="clearFormBtn">Clear Form</button>`}
      </div>
    </form>
  `;
}

function renderManageTable() {
  if (!state.articles.length) {
    return `<div class="empty-state">No articles yet. Publish your first one from the "Publish New Article" tab.</div>`;
  }

  let rows = state.articles.map((a) => ({ ...a, views: a.views || 0 }));

  rows.sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const maxViews = Math.max(...rows.map((r) => r.views), 0);

  const sortArrow = (key) => (sortKey === key ? "sorted" : "");

  return `
    <div style="overflow-x:auto;">
    <table class="article-table">
      <thead>
        <tr>
          <th class="${sortArrow("headline")}" data-sort="headline">Headline</th>
          <th class="${sortArrow("section")}" data-sort="section">Section</th>
          <th class="${sortArrow("timestamp")}" data-sort="timestamp">Published</th>
          <th class="${sortArrow("views")}" data-sort="views">Views</th>
          <th>Flags</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((a) => {
            const isTop = a.views === maxViews && maxViews > 0;
            if (pendingDeleteId === a.id) {
              return `
                <tr class="confirm-row">
                  <td colspan="6">
                    <div class="confirm-inline">
                      Delete "<b>${escapeHtml(a.headline)}</b>" permanently? This cannot be undone.
                      <button class="btn red" data-action="confirm-delete" data-id="${a.id}" type="button">Yes, Delete</button>
                      <button class="btn ghost" data-action="cancel-delete" type="button">Cancel</button>
                    </div>
                  </td>
                </tr>
              `;
            }
            return `
            <tr>
              <td><a href="#/article/${a.id}" style="font-weight:600;">${escapeHtml(a.headline)}</a></td>
              <td>${escapeHtml(a.section)}</td>
              <td>${relativeTime(a.timestamp)}</td>
              <td><span class="views-pill ${isTop ? "top" : ""}">${a.views}</span></td>
              <td>
                ${a.breaking ? `<span class="badge-pill breaking">Breaking</span>` : ""}
                ${a.featured ? `<span class="badge-pill featured">Featured</span>` : ""}
              </td>
              <td>
                <div class="row-actions">
                  <button type="button" data-action="edit" data-id="${a.id}">Edit</button>
                  <button type="button" class="danger" data-action="delete" data-id="${a.id}">Delete</button>
                </div>
              </td>
            </tr>
          `;
          })
          .join("")}
      </tbody>
    </table>
    </div>
  `;
}

/* =========================================================
   ADMIN: event binding (form submit, file uploads, table actions)
   ========================================================= */

function htmlToPlainText(htmlString) {
  const doc = new DOMParser().parseFromString(htmlString, "text/html");
  doc.querySelectorAll("script,style").forEach((el) => el.remove());

  // Convert block-level breaks into double newlines so paragraphs survive.
  doc.querySelectorAll("p,div,br,h1,h2,h3,h4,h5,h6,li").forEach((el) => {
    el.insertAdjacentText("afterend", "\n\n");
  });

  const text = doc.body ? doc.body.textContent : doc.documentElement.textContent;
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function bindAdminEvents() {
  const unlockBtn = document.getElementById("adminUnlockBtn");
  if (unlockBtn) {
    unlockBtn.addEventListener("click", mountLockModal);
    return;
  }

  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      render();
    });
  }

  document.querySelectorAll(".admin-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      adminTab = btn.dataset.tab;
      if (adminTab === "publish" && !editingId) formDraft = blankDraft();
      render();
    });
  });

  if (adminTab === "publish") bindPublishFormEvents();
  if (adminTab === "manage") bindManageTableEvents();
}

function bindPublishFormEvents() {
  const form = document.getElementById("publishForm");
  if (!form) return;

  const sectionSel = document.getElementById("f-section");
  sectionSel.addEventListener("change", () => {
    formDraft.section = sectionSel.value;
    captureFormIntoDraft();
    render();
  });

  const imgInput = document.getElementById("f-imagefile");
  if (imgInput) {
    imgInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataURL(file);
        draftImage = dataUrl;
        captureFormIntoDraft();
        render();
      } catch (err) {
        showToast("Could not read that image file.");
      }
    });
  }

  const removeImgBtn = document.getElementById("removeImgBtn");
  if (removeImgBtn) {
    removeImgBtn.addEventListener("click", () => {
      draftImage = null;
      captureFormIntoDraft();
      render();
    });
  }

  const htmlInput = document.getElementById("f-htmlfile");
  if (htmlInput) {
    htmlInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const raw = await readFileAsText(file);
        const plain = htmlToPlainText(raw);
        captureFormIntoDraft();
        formDraft.body = plain;
        if (!formDraft.headline) {
          const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch) formDraft.headline = titleMatch[1].trim();
        }
        formDraft.section = "HTML Journal";
        showToast("HTML file imported — text extracted into the body field.");
        render();
      } catch (err) {
        showToast("Could not read that HTML file.");
      }
    });
  }

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      editingId = null;
      formDraft = blankDraft();
      draftImage = null;
      render();
    });
  }

  const clearFormBtn = document.getElementById("clearFormBtn");
  if (clearFormBtn) {
    clearFormBtn.addEventListener("click", () => {
      formDraft = blankDraft();
      draftImage = null;
      render();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    captureFormIntoDraft();

    if (!formDraft.headline.trim()) { showToast("Please add a headline before publishing."); return; }
    if (!formDraft.deck.trim()) { showToast("Please add a deck/summary before publishing."); return; }
    if (!formDraft.byline.trim()) { showToast("Please add a byline before publishing."); return; }
    if (!formDraft.body.trim()) { showToast("Please add body text before publishing."); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = editingId ? "Saving…" : "Publishing…";

    let success = false;

    if (editingId) {
      const idx = state.articles.findIndex((a) => a.id === editingId);
      const updatedFields = { ...formDraft, image: draftImage };
      success = await updateArticleRemote(editingId, updatedFields);
      if (success && idx !== -1) {
        state.articles[idx] = { ...state.articles[idx], ...updatedFields };
      }
      if (success) showToast("Article updated.");
      editingId = null;
    } else {
      const newArticle = {
        id: uid(),
        ...formDraft,
        image: draftImage,
        timestamp: Date.now(),
        views: 0,
      };
      success = await insertArticle(newArticle);
      if (success) {
        state.articles.push(newArticle);
        showToast("Article published.");
      }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;

    if (success) {
      formDraft = blankDraft();
      draftImage = null;
      adminTab = "manage";
    }
    render();
  });
}

function captureFormIntoDraft() {
  const get = (id) => document.getElementById(id);
  if (get("f-section")) formDraft.section = get("f-section").value;
  if (get("f-headline")) formDraft.headline = get("f-headline").value;
  if (get("f-deck")) formDraft.deck = get("f-deck").value;
  if (get("f-byline")) formDraft.byline = get("f-byline").value;
  if (get("f-tags")) formDraft.tags = get("f-tags").value;
  if (get("f-body")) formDraft.body = get("f-body").value;
  if (get("f-caption")) formDraft.caption = get("f-caption").value;
  if (get("f-breaking")) formDraft.breaking = get("f-breaking").checked;
  if (get("f-featured")) formDraft.featured = get("f-featured").checked;
}

function bindManageTableEvents() {
  document.querySelectorAll(".article-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = key === "views" ? "desc" : "desc";
      }
      render();
    });
  });

  document.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const a = findArticle(id);
      if (!a) return;
      editingId = id;
      formDraft = {
        section: a.section,
        headline: a.headline,
        deck: a.deck,
        byline: a.byline,
        body: a.body,
        image: a.image,
        caption: a.caption || "",
        breaking: a.breaking,
        featured: a.featured,
        tags: a.tags || "",
      };
      draftImage = a.image || null;
      adminTab = "publish";
      render();
    });
  });

  document.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingDeleteId = btn.dataset.id;
      render();
    });
  });

  document.querySelectorAll('[data-action="cancel-delete"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingDeleteId = null;
      render();
    });
  });

  document.querySelectorAll('[data-action="confirm-delete"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = "Deleting…";
      const success = await deleteArticleRemote(id);
      if (success) {
        state.articles = state.articles.filter((a) => a.id !== id);
        showToast("Article deleted.");
      }
      pendingDeleteId = null;
      render();
    });
  });
}

/* =========================================================
   GLOBAL EVENTS: lock button, contact form
   ========================================================= */

function bindGlobalEvents() {
  const lockBtn = document.getElementById("lockBtn");
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      if (isAdminUnlocked()) {
        window.location.hash = "#/admin";
      } else {
        mountLockModal();
      }
    });
  }

  const supportBarBtn = document.getElementById("supportBarBtn");
  if (supportBarBtn) {
    supportBarBtn.addEventListener("click", () => {
      mountSupportModal();
    });
  }

  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("cfSubmitBtn");
      const status = document.getElementById("cfStatus");
      const formData = new FormData(contactForm);

      btn.disabled = true;
      btn.textContent = "Sending…";
      status.textContent = "";
      status.style.color = "";

      try {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          showToast("Message sent — we'll get back to you soon.");
          contactForm.reset();
          status.textContent = "Sent successfully.";
          status.style.color = "var(--ok)";
        } else {
          const data = await res.json().catch(() => null);
          const msg = data && data.errors ? data.errors.map((er) => er.message).join(", ") : "Something went wrong sending your message.";
          status.textContent = msg;
          status.style.color = "var(--red)";
        }
      } catch (err) {
        status.textContent = "Could not send — check your connection and try again.";
        status.style.color = "var(--red)";
      } finally {
        btn.disabled = false;
        btn.textContent = "Send Message";
      }
    });
  }
}

/* =========================================================
   ROUTER / RENDER
   ========================================================= */

function render() {
  const route = state.route;
  let html = "";
  document.title = "The One Journal — Daily News, World & Tech";

  if (state.loading) {
    document.getElementById("app").innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Source Serif 4',Georgia,serif;font-size:18px;color:#5A6472;">
        Loading The One Journal…
      </div>
    `;
    return;
  }

  if (route === "") {
    html = renderFrontPage();
  } else if (route.startsWith("section/")) {
    html = renderSectionPage(route.replace("section/", ""));
  } else if (route.startsWith("article/")) {
    html = renderArticlePage(route.replace("article/", ""));
  } else if (route.startsWith("tag/")) {
    html = renderTagPage(route.replace("tag/", ""));
  } else if (route === "about") {
    html = renderAboutPage();
  } else if (route === "privacy") {
    html = renderPrivacyPage();
  } else if (route === "contact") {
    html = renderContactPage();
  } else if (route === "admin") {
    html = renderAdminPage();
  } else {
    html = `<div class="empty-state">Page not found. <br><br><a href="#/" class="btn ghost" style="margin-top:10px;display:inline-block;">Back to Front Page</a></div>`;
  }

  document.getElementById("app").innerHTML = renderShell(html) + `<div id="modalRoot"></div>`;
  bindGlobalEvents();
  if (route === "admin") bindAdminEvents();
}

async function init() {
  render(); // show loading state immediately
  state.articles = await loadArticles();
  state.loading = false;
  render();
}

init();
