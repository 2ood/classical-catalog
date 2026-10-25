/** "Mozart_K550_full-score.pdf" → "Mozart K550 full score" */
export function labelFromFilename(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Google search restricted to imslp.org; IMSLP's own search is unreliable. */
export function imslpSearchUrl(work: {
  catalogueNum: string | null;
  title: string;
  key: string | null;
  composer: string;
}): string {
  const title = work.key ? `${work.title}, ${work.key}` : work.title;
  const query = ["site:imslp.org", work.catalogueNum, title, work.composer]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
