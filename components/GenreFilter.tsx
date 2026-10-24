const chip = "px-2 py-0.5 rounded-sm text-sm";
const active = "bg-inverse-bg text-inverse-text";
const inactive = "bg-bg border border-border text-muted hover:text-text";

export default function GenreFilter({
  genres,
  selected,
  onSelect,
}: {
  genres: string[];
  selected: string | null;
  onSelect: (genre: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {[null, ...genres].map((genre) => (
        <button
          key={genre ?? "all"}
          type="button"
          aria-pressed={genre === selected}
          onClick={() => onSelect(genre)}
          className={`${chip} ${genre === selected ? active : inactive}`}
        >
          {genre ?? "All"}
        </button>
      ))}
    </div>
  );
}
