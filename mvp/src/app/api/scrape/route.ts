import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

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

function extractFromHtml(html: string, url: string) {
  const $ = cheerio.load(html);

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
  };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "missing url" }, { status: 400 });
    }

    const target = /^https?:\/\//.test(url) ? url : `https://${url}`;

    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `http_${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const result = extractFromHtml(html, res.url);

    return NextResponse.json({
      url: res.url,
      title: result.title,
      text: result.text,
      words: result.words,
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
