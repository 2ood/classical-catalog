import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DropUpload from "./DropUpload";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const WORK_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";

function drop(file: File) {
  fireEvent.drop(screen.getByTestId("drop-zone"), {
    dataTransfer: { files: [file] },
  });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 201 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DropUpload", () => {
  it("posts a dropped PDF with its work id and label, then refreshes", async () => {
    render(<DropUpload workId={WORK_ID} />);
    drop(new File(["%PDF"], "Full_score.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/scores/upload");
    expect(init?.method).toBe("POST");
    const body = init?.body as FormData;
    expect(body.get("workId")).toBe(WORK_ID);
    expect(body.get("label")).toBe("Full score");
    expect((body.get("file") as File).name).toBe("Full_score.pdf");
  });

  it("rejects a file that is not a PDF without uploading", () => {
    render(<DropUpload workId={WORK_ID} />);
    drop(new File(["x"], "notes.txt", { type: "text/plain" }));

    expect(
      screen.getByText("Only PDF files can be uploaded."),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the server's error when the upload is refused", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: "The file is not a PDF" }, { status: 400 }),
    );
    render(<DropUpload workId={WORK_ID} />);
    drop(new File(["x"], "a.pdf", { type: "application/pdf" }));

    expect(
      await screen.findByText("Upload failed: The file is not a PDF"),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
