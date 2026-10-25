import Link from "next/link";
import { CLOUD_WIDTH, fontSize, layoutCloud } from "@/lib/cloud";

export type CloudComposer = {
  id: string; // seeds the layout
  slug: string;
  shortName: string;
  era: string | null;
  recordedWorks: number;
};

function tooltip(c: CloudComposer) {
  const works = `${c.recordedWorks} recorded work${c.recordedWorks === 1 ? "" : "s"}`;
  return [c.shortName, c.era, works].filter(Boolean).join(" · ");
}

export default function ComposerCloud({
  composers,
}: {
  composers: CloudComposer[];
}) {
  const maxCount = Math.max(0, ...composers.map((c) => c.recordedWorks));
  const byId = new Map(composers.map((c) => [c.id, c]));
  const { words, height } = layoutCloud(
    composers.map((c) => ({
      id: c.id,
      text: c.shortName,
      size: fontSize(c.recordedWorks, maxCount),
    })),
  );

  return (
    <div
      className="relative w-full mx-auto font-serif"
      style={{ maxWidth: CLOUD_WIDTH, height }}
    >
      {words.map((w) => (
        <Link
          key={w.id}
          href={`/composer/${byId.get(w.id)!.slug}`}
          className="group absolute leading-none p-1 whitespace-nowrap hover:z-10"
          style={{ left: `${(w.x / CLOUD_WIDTH) * 100}%`, top: w.y }}
        >
          <span className="group-hover:underline" style={{ fontSize: w.size }}>
            {w.text}
          </span>
          <span
            aria-hidden
            className="hidden group-hover:block absolute left-1 top-full mt-1 px-2 py-1 bg-bg border border-border font-sans text-xs text-muted"
          >
            {tooltip(byId.get(w.id)!)}
          </span>
        </Link>
      ))}
    </div>
  );
}
