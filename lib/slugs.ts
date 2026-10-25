import { toRoman, type WorkMovement } from "./movements";

const MAX_LENGTH = 80;

/** "Klavierstücke, Op. 118" → "klavierstucke-op-118" (at most 80 chars). */
export function slugify(text: string): string {
  const slug = text
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= MAX_LENGTH) return slug;
  const cut = slug.slice(0, MAX_LENGTH + 1);
  return cut.slice(0, cut.lastIndexOf("-"));
}

/** "Symphony No. 5" + "Op. 67" → "symphony-no-5-op-67" */
export function workSlug(work: {
  title: string;
  catalogueNum: string | null;
}): string {
  return slugify(`${work.title} ${work.catalogueNum ?? ""}`);
}

/** `slug`, or `slug-2`, `slug-3`, … when taken. */
export function uniqueSlug(slug: string, taken: Set<string>): string {
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

/** "ii-andante-con-moto" for the movement at `index` (0-based). */
export function movementSlug(movement: WorkMovement, index: number): string {
  return slugify(`${toRoman(index + 1)} ${movement.name}`);
}

export function movementSlugs(movements: WorkMovement[]): string[] {
  return movements.map(movementSlug);
}
