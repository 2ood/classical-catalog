"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { labelFromFilename } from "@/lib/scores";

const isPdf = (file: File) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name);

export default function DropUpload({
  workId,
  compact = false,
}: {
  workId: string;
  /** A small "Upload" button for the pane header instead of the drop zone. */
  compact?: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!isPdf(file)) {
      setError("Only PDF files can be uploaded.");
      return;
    }

    const body = new FormData();
    body.set("workId", workId);
    body.set("label", labelFromFilename(file.name));
    body.set("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/scores/upload", { method: "POST", body });
      if (!res.ok) {
        const message = (await res.json().catch(() => null))?.error;
        throw new Error(message ?? "the server refused the file");
      }
      router.refresh();
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  const status = uploading ? "Uploading…" : error;
  const input = (
    <input
      id={inputId}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      disabled={uploading}
      onChange={(e) => {
        handleFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <label
          htmlFor={inputId}
          className="cursor-pointer px-2 py-0.5 border border-border hover:bg-surface"
        >
          Upload
        </label>
        {input}
        {status && <span className="text-xs text-muted">{status}</span>}
      </span>
    );
  }

  return (
    <label
      htmlFor={inputId}
      data-testid="drop-zone"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      className={`flex-1 flex flex-col items-center justify-center gap-2 border border-dashed cursor-pointer text-muted ${
        dragging ? "border-text text-text" : "border-border"
      }`}
    >
      {input}
      <span>Drop a PDF score here, or click to choose one</span>
      {status && <span className="text-sm">{status}</span>}
    </label>
  );
}
