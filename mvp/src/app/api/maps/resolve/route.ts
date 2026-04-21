import { NextRequest, NextResponse } from "next/server";

const COORD_PATTERNS = [
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  /center=(-?\d+\.\d+),(-?\d+\.\d+)/,
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

function isShortLink(u: string) {
  return /(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(u);
}

function tryExtract(
  space: string,
): { lat: number; lng: number } | { place: string } | null {
  for (const pattern of COORD_PATTERNS) {
    const m = space.match(pattern);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return { lat, lng };
      }
    }
  }
  const place = space.match(/\/maps\/place\/([^/?]+)/);
  if (place) {
    return { place: decodeURIComponent(place[1].replace(/\+/g, " ")) };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  // Already has coordinates or place in URL — skip network call
  const fromInput = tryExtract(url);
  if (fromInput) {
    return NextResponse.json({ ...fromInput, finalUrl: url });
  }

  // Short links (maps.app.goo.gl) cannot be resolved server-side reliably
  // because Google returns a JS-redirecting interstitial to non-browser UAs.
  if (isShortLink(url)) {
    return NextResponse.json(
      { error: "short_link", finalUrl: url },
      { status: 422 },
    );
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: { "User-Agent": UA },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "invalid_link", status: res.status, finalUrl: res.url },
        { status: 422 },
      );
    }

    const body = await res.text();
    const space = res.url + "\n" + body.slice(0, 300_000);
    const extracted = tryExtract(space);
    if (extracted) {
      return NextResponse.json({ ...extracted, finalUrl: res.url });
    }

    return NextResponse.json(
      { error: "cannot_parse", finalUrl: res.url },
      { status: 422 },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
