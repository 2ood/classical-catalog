"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";

export default function AddRecordingForm({ workId }: { workId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);

    const res = await fetch("/api/recordings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workId,
        ...Object.fromEntries(new FormData(form)),
      }),
    });

    setPending(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to add");
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-wrap gap-2 items-center text-sm"
    >
      <input
        name="performer"
        placeholder="Performer"
        required
        className={input}
      />
      <input
        name="year"
        placeholder="Year"
        inputMode="numeric"
        className={`${input} w-20`}
      />
      <select name="mediaType" defaultValue="youtube" className={input}>
        <option value="youtube">YouTube</option>
        <option value="spotify">Spotify</option>
      </select>
      <input
        name="mediaUrl"
        placeholder="URL"
        required
        className={`${input} flex-1 min-w-64`}
      />
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-1 bg-inverse-bg text-inverse-text hover:bg-[#333] disabled:opacity-40"
      >
        + Add
      </button>
      {error && <p className="w-full text-muted">{error}</p>}
    </form>
  );
}
