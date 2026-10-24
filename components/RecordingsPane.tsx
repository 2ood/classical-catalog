"use client";

import { useState } from "react";
import MediaEmbed from "./MediaEmbed";
import type { Recording } from "@/lib/schema";

export default function RecordingsPane({
  recordings,
}: {
  recordings: Recording[];
}) {
  const [selectedId, setSelectedId] = useState(recordings[0]?.id);
  const selected = recordings.find((r) => r.id === selectedId) ?? recordings[0];

  if (!selected) return <p className="text-muted">No recordings yet.</p>;

  return (
    <section className="flex-1 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {recordings.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className={`px-3 py-1 border text-sm ${
              r.id === selected.id
                ? "bg-inverse-bg text-inverse-text border-inverse-bg"
                : "border-border hover:bg-surface"
            }`}
          >
            {r.performer}
            {r.year && ` (${r.year})`}
          </button>
        ))}
      </div>
      <MediaEmbed
        mediaType={selected.mediaType}
        mediaUrl={selected.mediaUrl}
        title={selected.performer}
      />
    </section>
  );
}
