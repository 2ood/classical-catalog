"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INSTRUMENTS, KINDS, type PerformerKind } from "@/lib/performers";

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";
const button = "px-3 py-1 border border-border hover:bg-surface";

/** Rename, set what a performer is, or merge them into another. */
export default function PerformerEditor({
  performer,
  others,
}: {
  performer: {
    id: string;
    name: string;
    kind: PerformerKind;
    instrument: string | null;
  };
  /** Performers this one could be merged into. */
  others: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(performer.name);
  const [kind, setKind] = useState<PerformerKind>(performer.kind);
  const [instrument, setInstrument] = useState(performer.instrument ?? "");
  const [into, setInto] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, method: string, body: object) {
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const answer = await res.json().catch(() => null);
    if (!res.ok) setError(answer?.error ?? "Saving failed");
    return res.ok ? answer : null;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const done = await send(`/api/performers/${performer.id}`, "PATCH", {
      name,
      kind,
      // Only people have an instrument or role.
      instrument: kind === "person" ? instrument : "",
    });
    if (done) router.refresh();
  }

  async function merge() {
    const target = others.find((o) => o.id === into);
    if (
      !target ||
      !confirm(
        `Merge ${performer.name} into ${target.name}? “${performer.name}” will become another name for them.`,
      )
    ) {
      return;
    }
    const done = await send(`/api/performers/${performer.id}/merge`, "POST", {
      into,
    });
    if (done) router.push(`/performer/${done.slug}`);
  }

  return (
    <div className="flex flex-col gap-3 border border-border p-3 text-sm">
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${input} flex-1 min-w-48`}
        />
        <select
          aria-label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as PerformerKind)}
          className={input}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        {kind === "person" && (
          <select
            aria-label="Instrument or role"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className={input}
          >
            <option value="">Instrument or role —</option>
            {INSTRUMENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className={button}>
          Save
        </button>
      </form>
      {others.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Same performer as</span>
          <select
            aria-label="Merge into"
            value={into}
            onChange={(e) => setInto(e.target.value)}
            className={`${input} flex-1 min-w-48`}
          >
            <option value="">—</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!into}
            onClick={merge}
            className={`${button} disabled:opacity-40`}
          >
            Merge
          </button>
        </div>
      )}
      {error && <p className="text-muted">{error}</p>}
    </div>
  );
}
