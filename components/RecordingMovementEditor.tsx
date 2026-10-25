"use client";

import MovementEditor, { putMovements } from "./MovementEditor";
import {
  formatTimestamp,
  parseTimestamp,
  toRoman,
  type MovementMarks,
  type WorkMovement,
} from "@/lib/movements";

export default function RecordingMovementEditor({
  recordingId,
  mediaType,
  movements,
  starts,
  currentTime,
  onClose,
}: {
  recordingId: string;
  mediaType: "youtube" | "spotify";
  movements: WorkMovement[];
  starts: MovementMarks<number | string>;
  /** The player's position in seconds, if it has one. */
  currentTime: () => number | null;
  onClose: () => void;
}) {
  const url = `/api/recordings/${recordingId}/movements`;

  if (mediaType === "spotify") {
    return (
      <MovementEditor
        movements={movements}
        marks={starts as MovementMarks<string>}
        column={{
          heading: "Track link",
          label: "track link",
          placeholder: "https://open.spotify.com/track/…",
          className: "flex-1 min-w-0",
        }}
        add={{ text: "Add movement", value: () => "" }}
        save={(rows) =>
          putMovements(
            url,
            rows.map((r) => ({ ...r, mark: r.mark.trim() || null })),
          )
        }
        onClose={onClose}
      />
    );
  }

  const now = () => formatTimestamp(currentTime() ?? 0);
  const timeOrder = (mark: string) => parseTimestamp(mark);
  return (
    <MovementEditor
      movements={movements}
      marks={Object.fromEntries(
        Object.entries(starts).map(([id, s]) => [
          id,
          formatTimestamp(Number(s)),
        ]),
      )}
      column={{
        heading: "Starts at",
        label: "start time",
        placeholder: "m:ss",
        className: "w-20",
        fill: { text: "Now", label: "Use current time", value: now },
      }}
      add={{ text: `Add at ${now()}`, value: now }}
      order={timeOrder}
      save={async (rows) => {
        const bad = rows.findIndex(
          (r) => r.mark.trim() !== "" && parseTimestamp(r.mark) === null,
        );
        if (bad !== -1) {
          return `Movement ${toRoman(bad + 1)}: write the time as m:ss, e.g. 7:21`;
        }
        return putMovements(
          url,
          rows.map((r) => ({
            ...r,
            mark: r.mark.trim() === "" ? null : parseTimestamp(r.mark),
          })),
        );
      }}
      onClose={onClose}
    />
  );
}
