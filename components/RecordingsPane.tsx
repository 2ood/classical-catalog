"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AddRecordingForm from "./AddRecordingForm";
import RecordingList from "./RecordingList";
import RecordingPlayer from "./RecordingPlayer";
import SuggestedRecordings from "./SuggestedRecordings";
import type { Recording } from "@/lib/schema";

export default function RecordingsPane({
  workId,
  recordings,
  query,
  workTitle,
}: {
  workId: string;
  recordings: Recording[];
  /** Names a single piece's one track. */
  workTitle: string;
  /** Search words for the work, for suggestions. */
  query: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(recordings[0]?.id);
  const [adding, setAdding] = useState(false);
  // A suggested album the add form starts from.
  const [addUrl, setAddUrl] = useState("");
  // A recording being edited, shown in the same form.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = recordings.find((r) => r.id === editingId);
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
      <div className="flex items-center gap-2">
        <h2 className="text-xs uppercase text-muted mr-auto">Recordings</h2>
        <button
          type="button"
          aria-expanded={adding}
          onClick={() => {
            setAddUrl("");
            setEditingId(null);
            setAdding((a) => !a);
          }}
          className="text-sm px-2 py-0.5 border border-border hover:bg-surface"
        >
          + Add
        </button>
      </div>
      {recordings.length > 0 && (
        <div className="shrink-0 max-h-[45%] overflow-auto">
          <RecordingList
            recordings={recordings}
            selectedId={selected?.id}
            workTitle={workTitle}
            onSelect={(id) => {
              setSelectedId(id);
              setEditingId(null);
            }}
            onDelete={handleDelete}
            onEdit={(id) => {
              setAdding(false);
              setEditingId((e) => (e === id ? null : id));
            }}
          />
        </div>
      )}
      {error && <p className="text-sm text-muted">{error}</p>}
      {editing && (
        <AddRecordingForm
          // Distinct from the player's key: both can be this recording.
          key={`edit-${editing.id}`}
          workId={workId}
          recording={editing}
          onAdded={() => setEditingId(null)}
          onCancel={() => setEditingId(null)}
        />
      )}
      {adding && (
        <AddRecordingForm
          key={`add-${addUrl}`}
          workId={workId}
          initialUrl={addUrl}
          onAdded={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}
      {selected ? (
        <RecordingPlayer key={`player-${selected.id}`} recording={selected} />
      ) : (
        !adding && (
          <SuggestedRecordings
            workId={workId}
            query={query}
            onAdd={(url) => {
              setAddUrl(url);
              setAdding(true);
            }}
          />
        )
      )}
    </section>
  );
}
