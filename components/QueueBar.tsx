import Link from "next/link";
import type { QueueStep } from "@/lib/queue";

export type Queue = QueueStep & {
  performer: { name: string; slug: string };
  /** This work without the queue. */
  exit: string;
};

const step =
  "w-7 h-7 flex items-center justify-center border border-border rounded-sm hover:bg-surface";

/**
 * "Playing through Seong-Jin Cho · 2 / 4", with ⏮ ⏭ between works and ✕,
 * over the whole queue — the current work in the accent color.
 */
export default function QueueBar({ queue }: { queue: Queue }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 border border-border rounded-sm text-sm">
      <div className="flex items-center gap-2">
        <span className="flex-1 min-w-0 truncate">
          <span className="text-muted">Playing through </span>
          <Link
            href={`/performer/${queue.performer.slug}`}
            className="hover:underline"
          >
            {queue.performer.name}
          </Link>
          <span className="text-muted">
            {" "}
            · {queue.position} / {queue.total}
          </span>
        </span>
        {queue.previous ? (
          <Link
            href={queue.previous}
            aria-label="Previous work"
            className={step}
          >
            ⏮
          </Link>
        ) : (
          <span className={`${step} opacity-40`} aria-hidden>
            ⏮
          </span>
        )}
        {queue.next ? (
          <Link href={queue.next} aria-label="Next work" className={step}>
            ⏭
          </Link>
        ) : (
          <span className={`${step} opacity-40`} aria-hidden>
            ⏭
          </span>
        )}
        <Link
          href={queue.exit}
          aria-label="Stop playing through"
          className="text-muted hover:text-text"
        >
          ✕
        </Link>
      </div>
      <ol aria-label="Queue" className="max-h-32 overflow-auto text-xs">
        {queue.items.map((item, i) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "true" : undefined}
              className={`block truncate py-0.5 hover:text-text ${
                item.current ? "text-accent font-medium" : "text-muted"
              }`}
            >
              {i + 1}. {item.composer} · {item.work}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
