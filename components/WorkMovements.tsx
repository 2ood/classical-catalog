"use client";

import { useState } from "react";
import { movementLabel, type WorkMovement } from "@/lib/movements";

/**
 * The work's movement list behind a toggle, so it can be checked before any
 * score or recording marks where the movements start.
 */
export default function WorkMovements({
  movements,
}: {
  movements: WorkMovement[];
}) {
  const [open, setOpen] = useState(false);
  if (movements.length === 0) return null;

  return (
    <div className="relative ml-auto text-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-muted hover:text-text"
      >
        {movements.length} {movements.length === 1 ? "movement" : "movements"}
      </button>
      {open && (
        <ol className="absolute right-0 top-full mt-2 z-10 w-96 max-h-[60vh] overflow-auto bg-bg border border-border p-3 flex flex-col gap-1">
          {movements.map((m, i) => (
            <li key={m.id}>{movementLabel(m, i)}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
