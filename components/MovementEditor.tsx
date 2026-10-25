"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toRoman, type Movement } from "@/lib/movements";

type Row = { key: number; name: string; page: string; isNew?: boolean };

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";
const button = "px-2 py-1 border border-border hover:bg-surface";

let nextKey = 0;
const toRow = (m: Movement): Row => ({
  key: nextKey++,
  name: m.name,
  page: String(m.page),
});

export default function MovementEditor({
  scoreId,
  movements,
  page,
  onClose,
}: {
  scoreId: string;
  movements: Movement[];
  /** The page currently shown, used by "Add at page N". */
  page: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => movements.map(toRow));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Insert in page order so the automatic numbering stays right.
  function addAtCurrentPage() {
    setRows((rs) => {
      const row = { key: nextKey++, name: "", page: String(page), isNew: true };
      const at = rs.findIndex((r) => Number(r.page) > page);
      return at === -1
        ? [...rs, row]
        : [...rs.slice(0, at), row, ...rs.slice(at)];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/scores/${scoreId}/movements`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movements: rows.map((r) => ({ name: r.name, page: Number(r.page) })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => null))?.error;
      setError(message ?? `Saving failed (server error ${res.status})`);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="flex flex-col gap-2 border border-border p-3 text-sm">
      <h3 className="text-xs uppercase text-muted">Movements</h3>
      {rows.length === 0 ? (
        <p className="text-muted">
          No movements yet. Turn to the page where one starts and add it.
        </p>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-8">No.</span>
          <span className="flex-1">Name (tempo)</span>
          <span className="w-24">Starts on page</span>
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
              className={`${input} flex-1`}
            />
            <input
              aria-label={`Movement ${numeral} start page`}
              type="number"
              min={1}
              value={r.page}
              onChange={(e) => update(r.key, { page: e.target.value })}
              className={`${input} w-24`}
            />
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
      <div className="flex gap-2">
        <button type="button" onClick={addAtCurrentPage} className={button}>
          Add at page {page}
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
