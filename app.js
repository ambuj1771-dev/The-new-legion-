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
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button class="follow-btn-top" id="followBtn" aria-label="Follow for breaking news">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            Follow
          </button>
          <button class="lock-btn" id="lockBtn" aria-label="Open control panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            Control Panel
          </button>
        </div>
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
   ADMIN:
