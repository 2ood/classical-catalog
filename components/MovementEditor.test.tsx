import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MovementEditor from "./MovementEditor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const SCORE_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const existing = [
  { name: "Allegro con brio", page: 3 },
  { name: "Allegro", page: 63 },
];

function renderEditor(page = 41) {
  const onClose = vi.fn();
  render(
    <MovementEditor
      scoreId={SCORE_ID}
      movements={existing}
      page={page}
      onClose={onClose}
    />,
  );
  return { onClose };
}

const names = () =>
  screen
    .getAllByRole("textbox")
    .map((input) => (input as HTMLInputElement).value);

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ movements: [] })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("MovementEditor", () => {
  it("labels the columns and numbers movements automatically", () => {
    renderEditor();
    expect(screen.getByText("Name (tempo)")).toBeInTheDocument();
    expect(screen.getByText("Starts on page")).toBeInTheDocument();
    expect(screen.getByLabelText("Movement I name")).toHaveValue(
      "Allegro con brio",
    );
    expect(screen.getByLabelText("Movement II start page")).toHaveValue(63);
  });

  it("inserts a movement at the current page in page order", () => {
    renderEditor(41);
    fireEvent.click(screen.getByRole("button", { name: "Add at page 41" }));
    expect(names()).toEqual(["Allegro con brio", "", "Allegro"]);
    expect(screen.getByLabelText("Movement II start page")).toHaveValue(41);
    expect(screen.getByLabelText("Movement II name")).toHaveFocus();
  });

  it("saves names and start pages, refreshes and closes", async () => {
    const { onClose } = renderEditor(41);
    fireEvent.click(screen.getByRole("button", { name: "Add at page 41" }));
    fireEvent.change(screen.getByLabelText("Movement II name"), {
      target: { value: "Andante con moto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`/api/scores/${SCORE_ID}/movements`);
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({
      movements: [
        { name: "Allegro con brio", page: 3 },
        { name: "Andante con moto", page: 41 },
        { name: "Allegro", page: 63 },
      ],
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("removes a movement", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Remove movement I" }));
    expect(names()).toEqual(["Allegro"]);
  });

  it("shows the server's error and stays open", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { error: "Names must be 1–200 characters" },
        { status: 400 },
      ),
    );
    const { onClose } = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Names must be 1–200 characters"),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("explains a server failure that has no message", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Saving failed (server error 500)"),
    ).toBeInTheDocument();
  });
});
