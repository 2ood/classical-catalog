"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractYouTubeId } from "@/lib/media";

/** Paste a YouTube link to map its pieces on its concert page. */
export default function AddConcert() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const videoId = extractYouTubeId(url);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (videoId) router.push(`/concert/${videoId}`);
      }}
      className="flex gap-2 mb-6 text-sm"
    >
      <input
        placeholder="YouTube link of a concert"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text"
      />
      <button
        type="submit"
        disabled={!videoId}
        className="px-3 py-1 bg-inverse-bg text-inverse-text hover:bg-[#333] disabled:opacity-40"
      >
        + Add concert
      </button>
    </form>
  );
}
