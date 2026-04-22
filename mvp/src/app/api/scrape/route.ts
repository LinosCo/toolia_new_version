import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const MAX_PAGES = 20; // tetto hard per non esplodere
const PER_PAGE_TIMEOUT_MS = 10000;
const GLOBAL_TIMEOUT_MS = 60000;
const MIN_PAGE_WORDS = 40; // sotto questa soglia consideriamo la pagina non utile

const JUNK_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "footer",
  "header",
  "[role=navigation]",
  "[role=banner]",
  "[role=contentinfo]",
  ".cookie",
  ".cookies",
  ".cookie-banner",
  ".cookieconsent",
  ".cookie-consent",
  ".consent",
  "#cookie",
  "#cookies",
  "#cookie-banner",
  "#cookie-consent",
  ".privacy",
  ".privacy-policy",
  "[aria-label*=cookie i]",
  "[aria-label*=consent i]",
  ".menu",
  ".sidebar",
  ".widget",
  ".breadcrumb",
  ".breadcrumbs",
  ".share",
  ".social",
  ".social-share",
  ".ad",
  ".ads",
  ".advertisement",
  ".newsletter",
  ".subscribe",
  "form",
  "iframe",
];

const JUNK_LINE_KEYWORDS = [
  "cookie",
  "privacy policy",
  "privacy",
  "trattamento dei dati",
  "trattamento dei tuoi dati",
  "condizioni d'uso",
  "termini e condizioni",
  "informativa",
  "gdpr",
  "preferenze cookie",
  "accetta tutti",
  "accetta i cookie",
  "consenso",
  "rifiuta",
  "gestisci i cookie",
];

// URL path da saltare (legal, carrello, login, ecc.)
const SKIP_PATH_PATTERNS = [
  /\/privacy/i,
  /\/cookie/i,
  /\/termini/i,
  /\/terms/i,
  /\/legal/i,
  /\/login/i,
  /\/signup/i,
  /\/sign-up/i,
  /\/register/i,
  /\/cart/i,
  /\/carrello/i,
  /\/checkout/i,
  /\/account/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/feed(\/|$)/i,
  /\/(tag|category|author)\//i,
];

// Estensioni file da saltare
const SKIP_EXT =
  /\.(pdf|zip|rar|tar|gz|mp3|mp4|mov|avi|webm|png|jpe?g|gif|svg|webp|ico|css|js|xml|json|txt)(\?|$)/i;

function isJunkLine(line: string): boolean {
  const lower = line.toLowerCase();
  return JUNK_LINE_KEYWORDS.some((k) => lower.includes(k)) && line.length < 260;
}

function cleanText(raw: string): string {
  return raw
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .filter((l) => l.length >= 30 || /[.!?]$/.test(l))
    .filter((l) => !isJunkLine(l))
    .join("\n");
}

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = "";
    // strip query params tracking comuni
    const paramsToKeep = new URLSearchParams();
    u.searchParams.forEach((v, k) => {
      if (!/^(utm_|fbclid|gclid|mc_cid|mc_eid|ref|source)$/i.test(k)) {
        paramsToKeep.set(k, v);
      }
    });
    u.search = paramsToKeep.toString();
    return u.toString();
  } catch {
    return null;
  }
}

function sameSite(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    // consideriamo stesso sito se dominio è uguale (anche www varianti)
    const strip = (h: string) => h.replace(/^www\./, "");
    return strip(ua.hostname) === strip(ub.hostname);
  } catch {
    return false;
  }
}

function shouldSkipUrl(u: string): boolean {
  if (SKIP_EXT.test(u)) return true;
  if (SKIP_PATH_PATTERNS.some((re) => re.test(u))) return true;
  return false;
}

function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const out = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const norm = normalizeUrl(href, baseUrl);
    if (!norm) return;
    if (!sameSite(norm, baseUrl)) return;
    if (shouldSkipUrl(norm)) return;
    out.add(norm);
  });
  return Array.from(out);
}

function extractFromHtml(html: string, url: string) {
  const $ = cheerio.load(html);

  // Raccogli link PRIMA di rimuovere nav/footer (li potremmo volere per navigazione)
  const links = extractLinks($, url);

  JUNK_SELECTORS.forEach((sel) => $(sel).remove());

  // Forza separazione tra elementi adiacenti (evita "alForte" da concatenazione inline)
  $("br").replaceWith(" ");
  $(
    "p, div, section, article, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption, dt, dd, label, button, a, span, strong, em, b, i",
  ).each((_, el) => {
    $(el).prepend(" ");
    $(el).append(" ");
  });

  const title =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $("title").text().replace(/\s+/g, " ").trim() ||
    $('meta[property="og:title"]').attr("content") ||
    url;

  const candidates = [
    "main",
    "article",
    '[role="main"]',
    ".main-content",
    "#main-content",
    "#content",
    ".content",
    "body",
  ];

  let text = "";
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length) {
      text = el.text();
      if (text.trim().length > 200) break;
    }
  }
  if (!text.trim()) text = $("body").text();

  const cleaned = cleanText(text);
  return {
    title,
    text: cleaned,
    words: cleaned.split(/\s+/).filter(Boolean).length,
    links,
  };
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PER_PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|xhtml/i.test(ct)) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function tryFetchSitemap(origin: string): Promise<string[]> {
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/wp-sitemap.xml`,
  ];
  for (const sm of candidates) {
    try {
      const res = await fetch(sm, {
        headers: { "User-Agent": UA },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const xml = await res.text();
      // Rudimentale estrazione <loc>
      const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
        .map((m) => m[1].trim())
        .filter(Boolean);
      if (locs.length > 0) return locs;
    } catch {
      // ignore
    }
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "missing url" }, { status: 400 });
    }

    const startUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    const startOrigin = new URL(startUrl).origin;

    const started = Date.now();
    const visited = new Set<string>();
    const pages: { url: string; title: string; text: string; words: number }[] =
      [];
    const queue: string[] = [startUrl];

    // Seed coda con sitemap (priorità bassa: dopo la pagina di partenza)
    const sitemapUrls = await tryFetchSitemap(startOrigin);
    sitemapUrls
      .filter((u) => sameSite(u, startUrl) && !shouldSkipUrl(u))
      .slice(0, 30)
      .forEach((u) => queue.push(u));

    while (queue.length > 0 && pages.length < MAX_PAGES) {
      if (Date.now() - started > GLOBAL_TIMEOUT_MS) break;
      const next = queue.shift();
      if (!next) break;
      const normNext = normalizeUrl(next, startUrl);
      if (!normNext || visited.has(normNext)) continue;
      if (!sameSite(normNext, startUrl)) continue;
      if (shouldSkipUrl(normNext)) continue;
      visited.add(normNext);

      const html = await fetchHtml(normNext);
      if (!html) continue;

      const result = extractFromHtml(html, normNext);
      if (result.words >= MIN_PAGE_WORDS) {
        pages.push({
          url: normNext,
          title: result.title,
          text: result.text,
          words: result.words,
        });
      }

      // Alimenta la coda con i nuovi link trovati, fino al tetto
      if (pages.length < MAX_PAGES) {
        for (const link of result.links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
          if (queue.length > 200) break; // evita esplosione memoria
        }
      }
    }

    if (pages.length === 0) {
      return NextResponse.json({ error: "empty_content" }, { status: 502 });
    }

    // Dedup testo per-linea cross-pagina (rimuove header/footer residui che si ripetono)
    const lineCount = new Map<string, number>();
    pages.forEach((p) => {
      p.text.split("\n").forEach((l) => {
        if (l.length < 120) {
          lineCount.set(l, (lineCount.get(l) ?? 0) + 1);
        }
      });
    });
    const isRepeatedBoilerplate = (l: string) =>
      l.length < 120 &&
      (lineCount.get(l) ?? 0) >= Math.max(3, pages.length / 2);

    const compactText = pages
      .map((p) => {
        const body = p.text
          .split("\n")
          .filter((l) => !isRepeatedBoilerplate(l))
          .join("\n");
        return `# ${p.title}\n[fonte: ${p.url}]\n\n${body}`;
      })
      .join("\n\n---\n\n");

    const totalWords = compactText.split(/\s+/).filter(Boolean).length;

    // titolo principale = titolo della pagina di partenza (prima pagina visitata) o primo
    const primary = pages.find((p) => p.url === startUrl) ?? pages[0];

    return NextResponse.json({
      url: primary.url,
      title: primary.title,
      text: compactText,
      words: totalWords,
      pages: pages.length,
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
