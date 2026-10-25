import Link from "next/link";
import { EPOCHS } from "@/lib/openopus";
import { layoutTimeline, TIMELINE_WIDTH } from "@/lib/timeline";

type TimelineComposer = {
  id: string;
  slug: string;
  shortName: string;
  era: string | null;
  born: number | null;
  died: number | null;
  href?: string;
  muted?: boolean;
};

const AXIS = 24;
const ROW = 30;

const chip = "px-2 py-0.5 rounded-sm text-sm";
const active = "bg-inverse-bg text-inverse-text";
const inactive = "bg-bg border border-border text-muted hover:text-text";

const pct = (px: number) => `${(px / TIMELINE_WIDTH) * 100}%`;

function years(c: TimelineComposer) {
  return c.died ? `${c.born}–${c.died}` : `born ${c.born}`;
}

/**
 * Composers' lifespans on a year axis, contemporaries stacked; era chips
 * zoom to one era (`?era=`).
 */
export default function ComposerTimeline({
  composers,
  era,
  thisYear,
  path = "/",
}: {
  composers: TimelineComposer[];
  era: string | null;
  thisYear: number;
  /** The page the timeline is on, for the era chips. */
  path?: string;
}) {
  const eras = EPOCHS.filter((e) => composers.some((c) => c.era === e));
  const shown = era ? composers.filter((c) => c.era === era) : composers;
  const byId = new Map(shown.map((c) => [c.id, c]));
  const { bars, rows, start, end, ticks } = layoutTimeline(
    shown.map((c) => ({ ...c, name: c.shortName })),
    thisYear,
  );
  const x = (year: number) =>
    pct(((year - start) / (end - start)) * TIMELINE_WIDTH);

  return (
    <div className="w-full mx-auto" style={{ maxWidth: TIMELINE_WIDTH }}>
      <nav aria-label="Eras" className="flex flex-wrap gap-2 mb-6">
        {[null, ...eras].map((e) => (
          <Link
            key={e ?? "all"}
            href={
              e
                ? `${path}?view=timeline&era=${encodeURIComponent(e)}`
                : `${path}?view=timeline`
            }
            aria-current={e === era ? "page" : undefined}
            className={`${chip} ${e === era ? active : inactive}`}
          >
            {e ?? "All"}
          </Link>
        ))}
      </nav>
      {bars.length === 0 ? (
        <p className="text-muted">No composers with known years.</p>
      ) : (
        <div className="relative" style={{ height: AXIS + rows * ROW }}>
          {ticks.map((year) => (
            <div
              key={year}
              className="absolute top-0 bottom-0 border-l border-border"
              style={{ left: x(year) }}
            >
              <span className="absolute -translate-x-1/2 text-xs text-muted">
                {year}
              </span>
            </div>
          ))}
          {bars.map((bar) => {
            const composer = byId.get(bar.id)!;
            const top = AXIS + bar.row * ROW;
            return (
              <div key={bar.id}>
                <Link
                  href={composer.href ?? `/composer/${composer.slug}`}
                  title={`${composer.shortName}, ${years(composer)}`}
                  className={`absolute font-serif text-sm leading-none whitespace-nowrap hover:underline ${composer.muted ? "opacity-35" : ""}`}
                  style={{ left: pct(bar.x), top }}
                >
                  {composer.shortName}
                </Link>
                {/* Living composers' bars are grey up to this year. */}
                <div
                  aria-hidden
                  className={`absolute h-[3px] min-w-0.5 ${bar.alive ? "bg-muted" : "bg-text"} ${composer.muted ? "opacity-35" : ""}`}
                  style={{
                    left: pct(bar.x),
                    width: pct(bar.width),
                    top: top + 17,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
