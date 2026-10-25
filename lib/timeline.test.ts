import { describe, expect, it } from "vitest";
import { layoutTimeline, TIMELINE_WIDTH, type TimelineItem } from "./timeline";

const item = (
  id: string,
  born: number | null,
  died: number | null,
  name = id,
): TimelineItem => ({ id, name, born, died });

describe("layoutTimeline", () => {
  const composers = [
    item("Bach", 1685, 1750),
    item("Handel", 1685, 1759),
    item("Mozart", 1756, 1791),
    item("Beethoven", 1770, 1827),
    item("Brahms", 1833, 1897),
  ];
  const layout = layoutTimeline(composers, 2026);

  it("spans whole half-centuries around the lifespans", () => {
    expect(layout.start).toBe(1650);
    expect(layout.end).toBe(1900);
    expect(layout.ticks).toEqual([1650, 1700, 1750, 1800, 1850, 1900]);
  });

  it("places bars at their years", () => {
    const bach = layout.bars.find((b) => b.id === "Bach")!;
    const perYear = TIMELINE_WIDTH / 250;
    expect(bach.x).toBeCloseTo(35 * perYear);
    expect(bach.width).toBeCloseTo(65 * perYear);
  });

  it("puts contemporaries on separate rows", () => {
    const row = (id: string) => layout.bars.find((b) => b.id === id)!.row;
    expect(row("Bach")).not.toBe(row("Handel"));
    // Brahms was born after Bach died: he can share Bach's row.
    expect(row("Brahms")).toBe(0);
  });

  it("never overlaps bars or names on a row", () => {
    const many = Array.from({ length: 120 }, (_, i) =>
      item(
        `c${i}`,
        1600 + ((i * 37) % 400),
        1600 + ((i * 37) % 400) + 30 + (i % 50),
        `Composer ${i}`,
      ),
    );
    const { bars, rows } = layoutTimeline(many, 2026);
    for (let r = 0; r < rows; r++) {
      const onRow = bars.filter((b) => b.row === r).sort((a, b) => a.x - b.x);
      for (let i = 1; i < onRow.length; i++) {
        const prev = onRow[i - 1];
        expect(onRow[i].x).toBeGreaterThanOrEqual(
          prev.x + Math.max(prev.width, prev.labelWidth),
        );
      }
    }
  });

  it("runs living composers' bars to this year and leaves out unknown births", () => {
    const { bars, end } = layoutTimeline(
      [item("Pärt", 1935, null), item("Anonymous", null, 1500)],
      2026,
    );
    expect(bars.map((b) => b.id)).toEqual(["Pärt"]);
    expect(end).toBe(2050);
    expect(bars[0].alive).toBe(true);
  });

  it("marks ticks every 25 years on a short span", () => {
    const { ticks } = layoutTimeline([item("Mozart", 1756, 1791)], 2026);
    expect(ticks).toEqual([1750, 1775, 1800]);
  });

  it("is empty without dated composers", () => {
    expect(layoutTimeline([], 2026)).toEqual({
      bars: [],
      rows: 0,
      start: 0,
      end: 0,
      ticks: [],
    });
  });
});
