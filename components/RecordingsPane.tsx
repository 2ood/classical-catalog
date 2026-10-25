"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AddRecordingForm from "./AddRecordingForm";
import PerformerTiles from "./PerformerTiles";
import RecordingPlayer from "./RecordingPlayer";
import SuggestedRecordings from "./SuggestedRecordings";
import type { Recording } from "@/lib/schema";

export default function RecordingsPane({
  workId,
  recordings,
  query,
}: {
  workId: string;
  recordings: Recording[];
  /** Search words for the work, for suggestions. */
  query: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(recordings[0]?.id);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = recordings.find((r) => r.id === selectedId) ?? recordings[0];

  async function handleDelete(id: string) {
    const recording = recordings.find((r) => r.id === id);
    if (
      !recording ||
      !confirm(`Delete the recording by ${recording.performer}?`)
    ) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/recordings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => null))?.error ?? "Failed to delete",
      );
      return;
    }
    router.refresh();
  }

  return (
    <section className="h-full min-h-0 flex flex-col gap-3 p-4">
      <PerformerTiles
        recordings={recordings}
        selectedId={selected?.id}
        onSelect={setSelectedId}
        onDelete={handleDelete}
        onAdd={() => setAdding((a) => !a)}
      />
      {error && <p className="text-sm text-muted">{error}</p>}
      {adding && (
        <AddRecordingForm workId={workId} onAdded={() => setAdding(false)} />
      )}
      {selected ? (
        <RecordingPlayer key={selected.id} recording={selected} />
      ) : (
        !adding && <SuggestedRecordings workId={workId} query={query} />
      )}
    </section>
  );
}
