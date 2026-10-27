import type { ReactNode } from "react";

/** A floating player's minimize button: an underscore, like a window's. */
export function MinimizeButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded
      onClick={onClick}
      className={`shrink-0 text-base text-muted hover:text-text ${className}`}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-[1em]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      >
        <path d="M3 13h10" />
      </svg>
    </button>
  );
}

/**
 * A minimized floating player: ⏯, then its title; a click anywhere else
 * expands it. (Its title is a button for the keyboard, yet drags the
 * players like the rest of the bar: see YouTubeDock.)
 */
export function MinimizedBar({
  playing,
  onPlayPause,
  subject,
  expandLabel,
  onExpand,
  className = "",
  children,
}: {
  playing: boolean;
  onPlayPause: () => void;
  /** Named on ⏯, e.g. "the video" for "Pause the video". */
  subject?: string;
  expandLabel: string;
  onExpand: () => void;
  className?: string;
  children: ReactNode;
}) {
  const action = `${playing ? "Pause" : "Play"}${subject ? ` ${subject}` : ""}`;
  return (
    <div
      onClick={onExpand}
      className={`flex items-center gap-2 cursor-pointer ${className}`}
    >
      <button
        type="button"
        aria-label={action}
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
        className="w-5 shrink-0 text-center hover:opacity-70"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <button
        type="button"
        aria-label={expandLabel}
        aria-expanded={false}
        data-drag
        className="flex-1 min-w-0 truncate text-left cursor-pointer"
      >
        {children}
      </button>
    </div>
  );
}

/** Folds its content away (or out), animated; hidden from all but sight. */
export function Fold({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
