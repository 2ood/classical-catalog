/** Width the timeline is laid out at; rendered as percentages of it. */
export const TIMELINE_WIDTH = 960;
// Names are 13px serif text: rough glyph width plus padding.
const CHAR_WIDTH = 7.5;
const LABEL_PADDING = 8;
const GAP = 6;

export type TimelineItem = {
  id: string;
  name: string;
  born: number | null;
  died: number | null;
};

export type TimelineBar = TimelineItem & {
  x: number;
  width: number;
  labelWidth: number;
  row: number;
  alive: boolean;
};

/**
 * Lifespan bars on a year axis rounded out to whole half-centuries (or
 * quarter-centuries for short spans). Each composer goes on the first row
 * where neither their bar nor their name overlaps the one before;
 * contemporaries end up stacked, later composers reuse rows.
 */
export function layoutTimeline(
  items: TimelineItem[],
  thisYear: number,
): {
  bars: TimelineBar[];
  rows: number;
  start: number;
  end: number;
  ticks: number[];
} {
  const dated = items
    .filter((i): i is TimelineItem & { born: number } => i.born !== null)
    .sort((a, b) => a.born - b.born || a.id.localeCompare(b.id));
  if (dated.length === 0) {
    return { bars: [], rows: 0, start: 0, end: 0, ticks: [] };
  }

  const first = Math.min(...dated.map((i) => i.born));
  const last = Math.max(...dated.map((i) => i.died ?? thisYear));
  let step = 50;
  let start = Math.floor(first / step) * step;
  let end = Math.ceil(last / step) * step;
  if (end - start <= 100) {
    step = 25;
    start = Math.floor(first / step) * step;
    end = Math.ceil(last / step) * step;
  }
  const perYear = TIMELINE_WIDTH / (end - start);

  const rowEnds: number[] = [];
  const bars = dated.map((i) => {
    const x = (i.born - start) * perYear;
    const width = ((i.died ?? thisYear) - i.born) * perYear;
    const labelWidth = i.name.length * CHAR_WIDTH + LABEL_PADDING;
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= x);
    if (row === -1) row = rowEnds.push(0) - 1;
    rowEnds[row] = x + Math.max(width, labelWidth) + GAP;
    return { ...i, x, width, labelWidth, row, alive: i.died === null };
  });

  const ticks: number[] = [];
  for (let year = start; year <= end; year += step) ticks.push(year);
  return { bars, rows: rowEnds.length, start, end, ticks };
}
