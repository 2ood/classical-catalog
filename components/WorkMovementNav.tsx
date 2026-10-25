"use client";

import MovementNav from "./MovementNav";
import { usePlayerSync } from "./PlayerSync";
import { movementLabel } from "@/lib/movements";

/**
 * « Movement » in the title bar: every movement of the work, whether or not
 * a score or recording marks it. Choosing one sends both panes there; it
 * follows whichever pane moves on.
 */
export default function WorkMovementNav() {
  const { movements, current, select } = usePlayerSync();
  // In work order: a movement's "start" is its position.
  const placed = movements.map((m, i) => ({
    id: m.id,
    label: movementLabel(m, i),
    start: i,
  }));
  const at = movements.findIndex((m) => m.id === current);
  return (
    <MovementNav
      movements={placed}
      at={at}
      onSelect={(m) => select(m.id, "link")}
    />
  );
}
