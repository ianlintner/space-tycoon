/**
 * Pure substring-match helper for the AutocompleteInput widget.
 *
 * Substring rather than fuzzy because (a) the typical entry list here is
 * small (~300 system names), (b) users almost always know the leading
 * characters, and (c) the ranking is easy to reason about: prefix matches
 * beat infix matches, then alphabetical tiebreak.
 */

export interface AutocompleteCandidate {
  id: string;
  label: string;
  sublabel?: string;
}

export interface AutocompleteMatchOptions {
  /** Hard cap on returned matches. */
  limit?: number;
  /**
   * If true, an empty query returns the first `limit` candidates verbatim
   * (useful for "show recent" behaviour). Default false → empty query
   * returns no matches.
   */
  showAllOnEmpty?: boolean;
}

/**
 * Score by match position — lower is better.
 *   0 → prefix match
 *   1 → word-boundary match (after space/dash/underscore)
 *   2 → other infix match
 *  -1 → no match
 */
export function matchScore(query: string, label: string): number {
  if (query === "") return 0;
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.startsWith(q)) return 0;
  const idx = l.indexOf(q);
  if (idx < 0) return -1;
  const prev = l.charAt(idx - 1);
  if (prev === " " || prev === "-" || prev === "_" || prev === "/") return 1;
  return 2;
}

export function filterAutocomplete<T extends AutocompleteCandidate>(
  candidates: readonly T[],
  query: string,
  options: AutocompleteMatchOptions = {},
): T[] {
  const limit = options.limit ?? 8;
  const q = query.trim();

  if (q === "") {
    return options.showAllOnEmpty ? candidates.slice(0, limit) : [];
  }

  const scored: Array<{ item: T; score: number }> = [];
  for (const c of candidates) {
    const score = matchScore(q, c.label);
    if (score < 0) continue;
    scored.push({ item: c, score });
  }

  // Stable sort: score asc, then alphabetical label.
  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.item.label.localeCompare(b.item.label);
  });

  return scored.slice(0, limit).map((s) => s.item);
}
