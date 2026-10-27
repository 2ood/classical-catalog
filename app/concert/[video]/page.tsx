import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ConcertEditor from "@/components/ConcertEditor";
import { extractYouTubeId } from "@/lib/media";
import { getConcert } from "@/lib/queries";
import { videoTitle } from "@/lib/youtube";

export default function ConcertPage({ params }: PageProps<"/concert/[video]">) {
  return (
    // Full viewport minus the 3rem header in the root layout.
    <main className="h-[calc(100dvh-3rem)] flex flex-col">
      <div className="px-6 py-3 border-b border-border">
        <Link
          href="/concerts"
          aria-label="Back to concerts"
          className="text-muted hover:text-text"
        >
          ←
        </Link>
      </div>
      <Suspense fallback={<p className="p-6 text-muted">Loading…</p>}>
        <Concert params={params} />
      </Suspense>
    </main>
  );
}

async function Concert({
  params,
}: Pick<PageProps<"/concert/[video]">, "params">) {
  const { video } = await params;
  if (extractYouTubeId(`https://youtu.be/${video}`) !== video) notFound();
  const [pieces, title] = await Promise.all([
    getConcert(video),
    videoTitle(video).catch(() => null),
  ]);
  return <ConcertEditor videoId={video} title={title} pieces={pieces} />;
}
