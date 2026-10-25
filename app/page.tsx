import { Suspense } from "react";
import ComposerCloud from "@/components/ComposerCloud";
import { getComposersWithCounts } from "@/lib/queries";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col justify-center p-6">
      <h1 className="sr-only">Composers</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Cloud />
      </Suspense>
    </main>
  );
}

async function Cloud() {
  const composers = await getComposersWithCounts();
  if (composers.length === 0) {
    return <p className="text-muted">No composers yet.</p>;
  }
  return <ComposerCloud composers={composers} />;
}
