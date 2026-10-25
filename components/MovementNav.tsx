import {
  currentMovementIndex,
  nextMovementStart,
  previousMovementStart,
  type PlacedMovement,
} from "@/lib/movements";

const button =
  "px-2 py-1 border border-border hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent";

export default function MovementNav({
  movements,
  at,
  onSelect,
}: {
  /** Marked movements sorted by start (see placeMovements). */
  movements: PlacedMovement[];
  /** Current position, in the same unit as the movements' starts. */
  at: number;
  onSelect: (movement: PlacedMovement) => void;
}) {
  if (movements.length === 0) return null;
  const current = currentMovementIndex(movements, at);
  const previous = previousMovementStart(movements, at);
  const next = nextMovementStart(movements, at);
  const byStart = (start: number | null) =>
    movements.find((m) => m.start === start);

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        type="button"
        aria-label="Previous movement"
        disabled={previous === null}
        onClick={() => onSelect(byStart(previous)!)}
        className={button}
      >
        «
      </button>
      <select
        aria-label="Movement"
        value={current === -1 ? "" : movements[current].id}
        onChange={(e) =>
          onSelect(movements.find((m) => m.id === e.target.value)!)
        }
        className="max-w-56 border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text"
      >
        {current === -1 && (
          <option value="" disabled>
            —
          </option>
        )}
        {movements.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Next movement"
        disabled={next === null}
        onClick={() => onSelect(byStart(next)!)}
        className={button}
      >
        »
      </button>
    </div>
  );
}
