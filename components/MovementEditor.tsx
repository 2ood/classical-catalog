"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toRoman, type WorkMovement } from "@/lib/movements";

/** A row as edited: `mark` is the raw text of the mark column. */
export type EditedMovement = { id?: string; name: string; mark: string };

type Row = EditedMovement & { key: number; isNew?: boolean };

export type MarkColumn = {
  heading: string;
  /** Accessible name suffix, e.g. "start page" → "Movement II start page". */
  label: string;
  type?: "number" | "text";
  placeholder?: string;
  className: string;
  /** Optional per-row button that fills the mark, e.g. with the current time. */
  fill?: { text: string; label: string; value: () => string };
};

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";
const button = "px-2 py-1 border border-border hover:bg-surface";

let nextKey = 0;

/** PUTs edited rows; resolves to an error message, or null on success. */
export async function putMovements(
  url: string,
  movements: unknown[],
): Promise<string | null> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ movements }),
  });
  if (res.ok) return null;
  const message = (await res.json().catch(() => null))?.error;
  return message ?? `Saving failed (server error ${res.status})`;
}

/**
 * Edits a work's movement names plus one mark per movement (a score's start
 * page, a recording's start time or track). Numbers follow the row order.
 */
export default function MovementEditor({
  movements,
  marks,
  column,
  add,
  order,
  save,
  onClose,
}: {
  movements: WorkMovement[];
  /** Current mark text per movement id. */
  marks: Record<string, string>;
  column: MarkColumn;
  add: { text: string; value: () => string };
  /** Sort key of a mark, so added rows land in order; omit to append. */
  order?: (mark: string) => number | null;
  /** Resolves to an error message, or null when saved. */
  save: (rows: EditedMovement[]) => Promise<string | null>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    movements.map((m) => ({
      key: nextKey++,
      id: m.id,
      name: m.name,
      mark: marks[m.id] ?? "",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addRow() {
    const mark = add.value();
    const row: Row = { key: nextKey++, name: "", mark, isNew: true };
    setRows((rs) => {
      const at = order?.(mark);
      const index =
        at == null
          ? -1
          : rs.findIndex((r) => {
              const o = order!(r.mark);
              return o !== null && o > at;
            });
      return index === -1
        ? [...rs, row]
        : [...rs.slice(0, index), row, ...rs.slice(index)];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const message = await save(
      rows.map(({ id, name, mark }) => ({ id, name, mark })),
    );
    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="flex flex-col gap-2 border border-border p-3 text-sm">
      <h3 className="text-xs uppercase text-muted">Movements</h3>
      {rows.length === 0 ? (
        <p className="text-muted">No movements yet.</p>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-8">No.</span>
          <span className="flex-1">Name (tempo)</span>
          <span className={column.className}>{column.heading}</span>
          {column.fill && <span className="w-12" />}
          <span className="w-5" />
        </div>
      )}
      {rows.map((r, i) => {
        const numeral = toRoman(i + 1);
        return (
          <div key={r.key} className="flex items-center gap-2">
            <span className="w-8 text-muted">{numeral}.</span>
            <input
              aria-label={`Movement ${numeral} name`}
              placeholder="e.g. Allegro con brio"
              value={r.name}
              autoFocus={r.isNew}
              onChange={(e) => update(r.key, { name: e.target.value })}
              className={`${input} flex-1 min-w-0`}
            />
            <input
              aria-label={`Movement ${numeral} ${column.label}`}
              type={column.type ?? "text"}
              min={column.type === "number" ? 1 : undefined}
              placeholder={column.placeholder}
              value={r.mark}
              onChange={(e) => update(r.key, { mark: e.target.value })}
              className={`${input} ${column.className}`}
            />
            {column.fill && (
              <button
                type="button"
                aria-label={`${column.fill.label} for movement ${numeral}`}
                onClick={() => update(r.key, { mark: column.fill!.value() })}
                className={`${button} w-12`}
              >
                {column.fill.text}
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove movement ${numeral}`}
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              className="w-5 text-muted hover:text-text"
            >
              ✕
            </button>
          </div>
        );
      })}
      {error && <p className="text-muted">{error}</p>}
      <p className="text-xs text-muted">
        Names and order are shared by every score and recording of this work.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={addRow} className={button}>
          {add.text}
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onClose} className={button}>
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="px-3 py-1 bg-inverse-bg text-inverse-text hover:bg-[#333] disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
