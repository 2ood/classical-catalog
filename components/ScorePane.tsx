"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DropUpload from "./DropUpload";
import type { MovementMarks } from "@/lib/movements";

const ScoreViewer = dynamic(() => import("./ScoreViewer"), {
  ssr: false,
  loading: () => <p className="text-muted">Loading viewer…</p>,
});

type PaneScore = {
  id: string;
  label: string | null;
  movementPages: MovementMarks<number>;
};

const headerButton = "px-2 py-0.5 border border-border hover:bg-surface";

export default function ScorePane({
  workId,
  scores,
  imslpUrl,
}: {
  workId: string;
  scores: PaneScore[];
  imslpUrl: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(scores[0]?.id);
  const [error, setError] = useState<string | null>(null);
  const selected = scores.find((s) => s.id === selectedId) ?? scores[0];

  async function handleRemove() {
    if (!selected || !confirm(`Remove "${selected.label ?? "this score"}"?`)) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/scores/${selected.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => null))?.error ?? "Failed to remove",
      );
      return;
    }
    router.refresh();
  }

  return (
    <section className="h-full min-h-0 flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <h2 className="text-xs uppercase text-muted mr-auto">Score</h2>
        {scores.length > 1 && (
          <select
            aria-label="Choose a score"
            value={selected?.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-border px-2 py-0.5 bg-bg focus:outline-none focus:border-text"
          >
            {scores.map((s, i) => (
              <option key={s.id} value={s.id}>
                {s.label ?? `Score ${i + 1}`}
              </option>
            ))}
          </select>
        )}
        <a
          href={imslpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={headerButton}
        >
          IMSLP ↗
        </a>
        {selected && (
          <>
            <DropUpload workId={workId} compact />
            <button
              type="button"
              onClick={handleRemove}
              className={headerButton}
            >
              Remove
            </button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-muted">{error}</p>}
      {selected ? (
        <ScoreViewer
          key={selected.id}
          scoreId={selected.id}
          url={`/api/scores/${selected.id}/file`}
          movementPages={selected.movementPages}
        />
      ) : (
        <DropUpload workId={workId} />
      )}
    </section>
  );
}
