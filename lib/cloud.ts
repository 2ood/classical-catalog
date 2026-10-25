export const CLOUD_WIDTH = 960;
export const MIN_CLOUD_HEIGHT = 560;
// Share of the cloud area the word boxes may cover before it grows taller.
const MAX_DENSITY = 0.25;
export const MIN_FONT = 16;
export const MAX_FONT = 42;
const MAX_ITERATIONS = 20;
const PADDING = 8;
// Rough average glyph width of IM Fell English, as a fraction of font size.
const CHAR_WIDTH = 0.55;
const LINE_HEIGHT = 1.2;

export type CloudWord = { id: string; text: string; size: number };
export type PlacedWord = CloudWord & {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Deterministic PRNG (string hash → mulberry32), values in [0, 1). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fontSize(count: number, maxCount: number): number {
  if (maxCount <= 0) return MIN_FONT;
  return Math.round(MIN_FONT + (count / maxCount) * (MAX_FONT - MIN_FONT));
}

export function estimateBox(text: string, size: number) {
  return {
    width: Math.ceil(text.length * size * CHAR_WIDTH) + PADDING,
    height: Math.ceil(size * LINE_HEIGHT) + PADDING,
  };
}

function overlap(a: PlacedWord, b: PlacedWord) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

/**
 * Sizes the cloud (at least `minHeight` tall) so word boxes cover at most
 * MAX_DENSITY of it, then places
 * words largest-first at seeded random positions and nudges each one out of
 * collisions for at most MAX_ITERATIONS.
 */
export function layoutCloud(
  words: CloudWord[],
  minHeight = MIN_CLOUD_HEIGHT,
): {
  words: PlacedWord[];
  height: number;
} {
  const ordered = [...words].sort(
    (a, b) => b.size - a.size || a.id.localeCompare(b.id),
  );
  const area = words.reduce((sum, w) => {
    const box = estimateBox(w.text, w.size);
    return sum + box.width * box.height;
  }, 0);
  const cloudHeight = Math.max(
    minHeight,
    Math.ceil(area / MAX_DENSITY / CLOUD_WIDTH),
  );
  const placed: PlacedWord[] = [];

  for (const word of ordered) {
    const rand = seededRandom(word.id);
    const { width, height } = estimateBox(word.text, word.size);
    const maxX = Math.max(CLOUD_WIDTH - width, 0);
    const maxY = Math.max(cloudHeight - height, 0);
    const randomSpot = () => ({
      x: rand() * maxX,
      y: rand() * maxY,
    });
    const box: PlacedWord = { ...word, ...randomSpot(), width, height };

    const collisions = (x: number, y: number) =>
      placed.filter((p) => overlap({ ...box, x, y }, p)).length;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const other = placed.find((p) => overlap(box, p));
      if (!other) break;

      // Try the four ways out of `other` plus a random jump; keep the one with
      // the fewest collisions, then the shortest move.
      const candidates = [
        { x: other.x - width - 1, y: box.y },
        { x: other.x + other.width + 1, y: box.y },
        { x: box.x, y: other.y - height - 1 },
        { x: box.x, y: other.y + other.height + 1 },
        randomSpot(),
      ]
        .map(({ x, y }) => ({ x: clamp(x, maxX), y: clamp(y, maxY) }))
        .map((c) => ({
          ...c,
          hits: collisions(c.x, c.y),
          dist: Math.abs(c.x - box.x) + Math.abs(c.y - box.y),
        }))
        .sort((a, b) => a.hits - b.hits || a.dist - b.dist);
      const best = candidates[0];

      // Pinned against an edge: no way out moves the word, so jump elsewhere.
      if (best.dist === 0) Object.assign(box, randomSpot());
      else Object.assign(box, { x: best.x, y: best.y });
    }
    placed.push(box);
  }
  return { words: placed, height: cloudHeight };
}
