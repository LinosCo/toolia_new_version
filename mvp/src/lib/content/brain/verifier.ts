import type { ContentContext, GeneratedArtifact, VerificationResult } from "@/lib/content/brain/types";

const STOP = new Set(["di", "del", "della", "il", "lo", "la", "le", "un", "uno", "una", "e", "che", "in", "da", "per", "con"]);

/** Parole significative (>3 char, non stopword). */
function keyTerms(s: string): string[] {
  return s.toLowerCase().split(/[^a-zàèéìòù0-9]+/i).filter((w) => w.length > 3 && !STOP.has(w));
}

/** Un mustTell è "coperto" se ALMENO metà dei suoi termini chiave compaiono nel corpo. */
function isCovered(title: string, bodyLower: string): boolean {
  const terms = keyTerms(title);
  if (terms.length === 0) return true;
  const hits = terms.filter((t) => bodyLower.includes(t)).length;
  return hits / terms.length >= 0.5;
}

export function verifyArtifact(art: GeneratedArtifact, ctx: ContentContext): VerificationResult {
  const bodyLower = `${art.title}\n${art.body}`.toLowerCase();

  const mustTellCovered: string[] = [];
  const mustTellMissing: string[] = [];
  for (const m of ctx.tension.mustTell) {
    (isCovered(m.title, bodyLower) ? mustTellCovered : mustTellMissing).push(m.title);
  }

  const avoidViolations = ctx.tension.avoid
    .map((a) => a.topic)
    .filter((topic) => topic && bodyLower.includes(topic.toLowerCase()));

  return {
    passed: mustTellMissing.length === 0 && avoidViolations.length === 0,
    mustTellCovered,
    mustTellMissing,
    avoidViolations,
  };
}
