export interface ChunkOptions {
  /** dimensione massima del chunk in caratteri */
  size: number;
  /** sovrapposizione fra chunk consecutivi in caratteri */
  overlap: number;
}

/**
 * Divide il testo in chunk sovrapposti, deterministico.
 * step = size - overlap. Restituisce [] per input vuoto/whitespace.
 */
export function chunkText(text: string, opts: ChunkOptions): string[] {
  const clean = text.trim();
  if (clean.length === 0) return [];
  const size = Math.max(1, opts.size);
  const overlap = Math.min(Math.max(0, opts.overlap), size - 1);
  const step = size - overlap;
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  for (let start = 0; start < clean.length; start += step) {
    const piece = clean.slice(start, start + size);
    chunks.push(piece);
    // Break only if we've already consumed all remaining text
    if (start + step >= clean.length) break;
  }
  return chunks;
}
