import { slugify, uniqueSlug } from "./slugs";
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

// File names are capped, cut at a word, so whole paths stay well inside
// Windows' 260-character limit (Explorer, backups).
const MAX_FILE_NAME = 40;
const shorten = (slug: string) =>
  slug.length <= MAX_FILE_NAME
    ? slug
    : slug.slice(0, MAX_FILE_NAME + 1).replace(/-[^-]*$/, "");

/**
 * Where a new score is stored, under SCORES_DIR:
 * "<composer>/<work>/<label>.pdf", numbered when the work has that name.
 */
export function scoreFileName(
  composerSlug: string,
  workSlug: string,
  label: string,
  taken: Set<string>,
): string {
  const folder = `${composerSlug}/${workSlug}`;
  const names = new Set(
    [...taken]
      .filter((t) => t.startsWith(`${folder}/`))
      .map((t) => t.slice(folder.length + 1).replace(/\.pdf$/, "")),
  );
  return `${folder}/${uniqueSlug(shorten(slugify(label)) || "score", names)}.pdf`;
}
