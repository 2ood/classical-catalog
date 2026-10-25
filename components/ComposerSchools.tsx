"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const chip = "px-2 py-0.5 rounded-sm text-sm border border-border";

/** A composer's movements (schools) as chips: remove one, or type one in. */
export default function ComposerSchools({
  composerId,
  schools,
}: {
  composerId: string;
  schools: string[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(next: string[]) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/composers/${composerId}/schools`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schools: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Saving failed");
      return;
    }
    setAdding("");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {schools.map((school) => (
        <span key={school} className={`${chip} flex items-center gap-1`}>
          {school}
          <button
            type="button"
            aria-label={`Remove ${school}`}
            disabled={saving}
            onClick={() => save(schools.filter((s) => s !== school))}
            className="text-muted hover:text-text"
          >
            ×
          </button>
        </span>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (adding.trim()) save([...schools, adding.trim()]);
        }}
      >
        <input
          aria-label="Add a movement"
          placeholder="+ Movement"
          value={adding}
          disabled={saving}
          onChange={(e) => setAdding(e.target.value)}
          className="w-36 text-sm border border-transparent px-2 py-0.5 bg-bg focus:outline-none focus:border-border"
        />
      </form>
      {error && <p className="w-full text-sm text-muted">{error}</p>}
    </div>
  );
}
