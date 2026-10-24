const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

/** Natural catalogue-number order (`K. 9` < `K. 550`); blanks sort last. */
export function compareCatalogue(a: string | null, b: string | null): number {
  if (!a || !b) return (a ? 0 : 1) - (b ? 0 : 1);
  return collator.compare(a, b);
}

type Groupable = { genre: string; catalogueNum: string | null; title: string };

export function groupByGenre<T extends Groupable>(
  works: T[],
): { genre: string; works: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const work of works) {
    groups.set(work.genre, [...(groups.get(work.genre) ?? []), work]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => collator.compare(a, b))
    .map(([genre, list]) => ({
      genre,
      works: list.sort(
        (a, b) =>
          compareCatalogue(a.catalogueNum, b.catalogueNum) ||
          collator.compare(a.title, b.title),
      ),
    }));
}
