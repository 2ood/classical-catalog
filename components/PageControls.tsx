const button =
  "px-2 py-1 border border-border hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent";

export default function PageControls({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={button}
      >
        ←
      </button>
      <span className="tabular-nums">
        {page} / {total}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        className={button}
      >
        →
      </button>
    </div>
  );
}
