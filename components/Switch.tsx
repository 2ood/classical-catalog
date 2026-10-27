/** An on/off switch with its label, e.g. "With recordings". */
export default function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="shrink-0 flex items-center gap-2 text-sm text-muted hover:text-text"
    >
      <span
        aria-hidden
        className={`w-7 h-4 p-0.5 flex rounded-full transition-colors ${
          checked ? "bg-inverse-bg justify-end" : "bg-border"
        }`}
      >
        <span className="w-3 h-3 rounded-full bg-bg" />
      </span>
      {children}
    </button>
  );
}
