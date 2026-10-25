import {
  currentMovementIndex,
  movementLabel,
  nextMovementPage,
  previousMovementPage,
  type Movement,
} from "@/lib/movements";

const button =
  "px-2 py-1 border border-border hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent";

export default function MovementNav({
  movements,
  page,
  onChange,
}: {
  movements: Movement[];
  page: number;
  onChange: (page: number) => void;
}) {
  if (movements.length === 0) return null;
  const current = currentMovementIndex(movements, page);
  const previous = previousMovementPage(movements, page);
  const next = nextMovementPage(movements, page);

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        type="button"
        aria-label="Previous movement"
        disabled={previous === null}
        onClick={() => previous !== null && onChange(previous)}
        className={button}
      >
        «
      </button>
      <select
        aria-label="Movement"
        value={current === -1 ? "" : String(current)}
        onChange={(e) => onChange(movements[Number(e.target.value)].page)}
        className="max-w-56 border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text"
      >
        {current === -1 && (
          <option value="" disabled>
            —
          </option>
        )}
        {movements.map((m, i) => (
          <option key={i} value={i}>
            {movementLabel(m, i)}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Next movement"
        disabled={next === null}
        onClick={() => next !== null && onChange(next)}
        className={button}
      >
        »
      </button>
    </div>
  );
}
