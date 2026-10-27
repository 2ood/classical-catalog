/**
 * Likes (★) of a recording's movements — or of the recording's piece, for
 * a work without movements (movement id "").
 */
import { movementLabel, type WorkMovement } from "./movements";
import { UUID } from "./recordings";
import { movementSlug } from "./slugs";
import { compareCatalogue } from "./works";

export type Like = { recordingId: string; movementId: string; liked: boolean };

export function parseLike(
  body: unknown,
): { ok: true; value: Like } | { ok: false; error: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const recordingId = String(input.recordingId ?? "");
  if (!UUID.test(recordingId)) {
    return { ok: false, error: "Invalid recording id" };
  }
  if (typeof input.liked !== "boolean") {
    return { ok: false, error: "Say whether to like or unlike" };
  }
  const movementId = String(input.movementId ?? "");
  return { ok: true, value: { recordingId, movementId, liked: input.liked } };
}

type LikedRow = {
  movementId: string;
  recording: { id: string; performer: string; slug: string };
  composer: { slug: string; name: string; born: number | null };
  work: {
    slug: string;
    title: string;
    catalogueNum: string | null;
    movements: WorkMovement[];
  };
};

/**
 * The Liked page: by composer (in birth order), then work, movement and
 * performer, each linking to the player at that movement with that
 * recording.
 */
export function likedList(rows: LikedRow[]) {
  const entries = rows.flatMap((row) => {
    const workPath = `/composer/${row.composer.slug}/${row.work.slug}`;
    const query = `?recording=${row.recording.slug}`;
    const work = [row.work.catalogueNum, row.work.title]
      .filter(Boolean)
      .join(" ");
    if (row.movementId === "") {
      return [{ row, order: -1, label: work, href: workPath + query }];
    }
    const i = row.work.movements.findIndex((m) => m.id === row.movementId);
    if (i === -1) return [];
    const movement = row.work.movements[i];
    return [
      {
        row,
        order: i,
        label: `${work} · ${movementLabel(movement, i)}`,
        href: `${workPath}/${movementSlug(movement, i)}${query}`,
      },
    ];
  });
  entries.sort(
    (a, b) =>
      (a.row.composer.born ?? 0) - (b.row.composer.born ?? 0) ||
      a.row.composer.name.localeCompare(b.row.composer.name) ||
      compareCatalogue(a.row.work.catalogueNum, b.row.work.catalogueNum) ||
      a.row.work.title.localeCompare(b.row.work.title) ||
      a.order - b.order ||
      a.row.recording.performer.localeCompare(b.row.recording.performer),
  );
  const groups: {
    composer: string;
    items: { label: string; performer: string; href: string }[];
  }[] = [];
  for (const { row, label, href } of entries) {
    const item = { label, performer: row.recording.performer, href };
    const last = groups.at(-1);
    if (last?.composer === row.composer.name) last.items.push(item);
    else groups.push({ composer: row.composer.name, items: [item] });
  }
  return groups;
}
