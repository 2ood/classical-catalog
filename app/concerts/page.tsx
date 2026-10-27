import Link from "next/link";
import { Suspense } from "react";
import AddConcert from "@/components/AddConcert";
import { getConcerts } from "@/lib/queries";
import { videoTitle } from "@/lib/youtube";

export default function ConcertsPage() {
  return (
    <main className="p-6 w-full max-w-3xl mx-auto">
      <h1 className="text-xl font-serif mb-4">Concerts</h1>
      <AddConcert />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Concerts />
      </Suspense>
    </main>
  );
}

async function Concerts() {
  const concerts = await getConcerts();
  if (concerts.length === 0) {
    return (
      <p className="text-muted">
        No concerts yet — paste a video above, then add its pieces where they
        start.
      </p>
    );
  }
  const titles = await Promise.all(
    concerts.map((c) => videoTitle(c.videoId).catch(() => null)),
  );
  return (
    <ul>
      {concerts.map(({ videoId, pieces }, i) => {
        const performers = [...new Set(pieces.map((p) => p.performer))];
        return (
          <li key={videoId}>
            <Link
              href={`/concert/${videoId}`}
              className="flex items-baseline gap-3 py-1 hover:bg-surface"
            >
              <span className="flex-1 min-w-0 truncate">
                {titles[i] ?? videoId}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {performers.join(" · ")} · {pieces.length}{" "}
                {pieces.length === 1 ? "piece" : "pieces"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
