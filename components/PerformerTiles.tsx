import { performerInitials } from "@/lib/recordings";

type TileRecording = { id: string; performer: string; year: number | null };

const tile =
  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium";
const active = "bg-inverse-bg text-inverse-text";
const inactive = "bg-surface border border-border text-muted hover:text-text";

const label = (r: TileRecording) =>
  r.year ? `${r.performer} (${r.year})` : r.performer;

export default function PerformerTiles({
  recordings,
  selectedId,
  canEdit,
  onSelect,
  onDelete,
  onAdd,
}: {
  recordings: TileRecording[];
  selectedId: string | undefined;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {recordings.map((r) => (
        <div key={r.id} className="group relative">
          <button
            type="button"
            aria-label={label(r)}
            title={label(r)}
            aria-pressed={r.id === selectedId}
            onClick={() => onSelect(r.id)}
            className={`${tile} ${r.id === selectedId ? active : inactive}`}
          >
            {performerInitials(r.performer)}
          </button>
          {canEdit && (
            <button
              type="button"
              aria-label={`Delete ${r.performer}`}
              onClick={() => onDelete(r.id)}
              className="hidden group-hover:flex group-focus-within:flex absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bg border border-border text-[10px] leading-none items-center justify-center text-muted hover:text-text"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <button
          type="button"
          aria-label="Add recording"
          title="Add recording"
          onClick={onAdd}
          className={`${tile} ${inactive} text-base`}
        >
          +
        </button>
      )}
    </div>
  );
}
