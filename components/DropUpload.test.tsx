import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DropUpload from "./DropUpload";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@vercel/blob/client", () => ({ upload }));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const WORK_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const BLOB_URL = "https://abc.public.blob.vercel-storage.com/scores/a-Xy.pdf";

function drop(file: File) {
  fireEvent.drop(screen.getByTestId("drop-zone"), {
    dataTransfer: { files: [file] },
  });
}

beforeEach(() => {
  upload.mockResolvedValue({ url: BLOB_URL });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 201 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DropUpload", () => {
  it("uploads a dropped PDF to Blob, saves the score, and refreshes", async () => {
    render(<DropUpload workId={WORK_ID} />);
    drop(new File(["%PDF"], "Full_score.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith(
      `scores/${WORK_ID}/Full_score.pdf`,
      expect.any(File),
      expect.objectContaining({
        access: "public",
        handleUploadUrl: "/api/scores/upload",
      }),
    );
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/scores");
    expect(JSON.parse(String(init?.body))).toEqual({
      workId: WORK_ID,
      blobUrl: BLOB_URL,
      label: "Full score",
    });
  });

  it("rejects a file that is not a PDF without uploading", () => {
    render(<DropUpload workId={WORK_ID} />);
    drop(new File(["x"], "notes.txt", { type: "text/plain" }));

    expect(
      screen.getByText("Only PDF files can be uploaded."),
    ).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it("shows an error when the upload fails", async () => {
    upload.mockRejectedValue(new Error("network down"));
    render(<DropUpload workId={WORK_ID} />);
    drop(new File(["%PDF"], "a.pdf", { type: "application/pdf" }));

    expect(await screen.findByText(/Upload failed/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
