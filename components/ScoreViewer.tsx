"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import PageControls from "./PageControls";

// Must be set in the module that renders <Document> (see react-pdf README).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Decoder assets copied to public/pdfjs on postinstall. Without wasmUrl,
// JBIG2 images (most scanned scores) are silently dropped and pages render
// blank. Defined at module level so <Document> doesn't reload on re-render.
const options = {
  wasmUrl: "/pdfjs/wasm/",
  cMapUrl: "/pdfjs/cmaps/",
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  iccUrl: "/pdfjs/iccs/",
};

/** Client-only: load with next/dynamic and `ssr: false`. */
export default function ScoreViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(Math.floor(entry.contentRect.height)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto flex justify-center"
      >
        <Document
          file={url}
          options={options}
          suspense={false}
          loading={<p className="text-muted">Loading score…</p>}
          error={<p className="text-muted">Could not load this PDF.</p>}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {height !== null && (
            <Page
              pageNumber={page}
              height={height}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={null}
            />
          )}
        </Document>
      </div>
      {numPages > 0 && (
        <PageControls page={page} total={numPages} onChange={setPage} />
      )}
    </div>
  );
}
