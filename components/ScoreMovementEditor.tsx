"use client";

import MovementEditor, { putMovements } from "./MovementEditor";
import type { MovementMarks, WorkMovement } from "@/lib/movements";

const pageOrder = (mark: string) => (mark.trim() === "" ? null : Number(mark));

export default function ScoreMovementEditor({
  scoreId,
  movements,
  pages,
  page,
  onClose,
}: {
  scoreId: string;
  movements: WorkMovement[];
  pages: MovementMarks<number>;
  /** The page on screen, used by "Add at page N". */
  page: number;
  onClose: () => void;
}) {
  return (
    <MovementEditor
      movements={movements}
      marks={Object.fromEntries(
        Object.entries(pages).map(([id, p]) => [id, String(p)]),
      )}
      column={{
        heading: "Starts on page",
        label: "start page",
        type: "number",
        className: "w-24",
      }}
      add={{ text: `Add at page ${page}`, value: () => String(page) }}
      order={pageOrder}
      save={(rows) =>
        putMovements(
          `/api/scores/${scoreId}/movements`,
          rows.map((r) => ({ ...r, mark: pageOrder(r.mark) })),
        )
      }
      onClose={onClose}
    />
  );
}
