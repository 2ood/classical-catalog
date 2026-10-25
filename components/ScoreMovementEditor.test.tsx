import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScoreMovementEditor from "./ScoreMovementEditor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const SCORE_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const movements = [
  { id: "m1", name: "Allegro con brio" },
  { id: "m2", name: "Andante con moto" },
  { id: "m3", name: "Allegro" },
];
const pages = { m1: 3, m3: 63 };

function renderEditor(page = 41) {
  const onClose = vi.fn();
  render(
    <ScoreMovementEditor
      scoreId={SCORE_ID}
      movements={movements}
      pages={pages}
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
const sent = () =>
  JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).movements;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ScoreMovementEditor", () => {
  it("lists the work's movements with this score's start pages", () => {
    renderEditor();
    expect(screen.getByText("Name (tempo)")).toBeInTheDocument();
    expect(screen.getByText("Starts on page")).toBeInTheDocument();
    expect(names()).toEqual([
      "Allegro con brio",
      "Andante con moto",
      "Allegro",
    ]);
    expect(screen.getByLabelText("Movement I start page")).toHaveValue(3);
    expect(screen.getByLabelText("Movement II start page")).toHaveValue(null);
  });

  it("inserts a movement at the current page in page order", () => {
    renderEditor(50);
    fireEvent.click(screen.getByRole("button", { name: "Add at page 50" }));
    expect(names()).toEqual([
      "Allegro con brio",
      "Andante con moto",
      "",
      "Allegro",
    ]);
    expect(screen.getByLabelText("Movement III start page")).toHaveValue(50);
    expect(screen.getByLabelText("Movement III name")).toHaveFocus();
  });

  it("saves ids, names and pages, refreshes and closes", async () => {
    const { onClose } = renderEditor();
    fireEvent.change(screen.getByLabelText("Movement II start page"), {
      target: { value: "41" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`/api/scores/${SCORE_ID}/movements`);
    expect(init?.method).toBe("PUT");
    expect(sent()).toEqual([
      { id: "m1", name: "Allegro con brio", mark: 3 },
      { id: "m2", name: "Andante con moto", mark: 41 },
      { id: "m3", name: "Allegro", mark: 63 },
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("sends a new movement without an id and a blank page as null", async () => {
    const { onClose } = renderEditor(80);
    fireEvent.click(screen.getByRole("button", { name: "Add at page 80" }));
    fireEvent.change(screen.getByLabelText("Movement IV name"), {
      target: { value: "Allegro" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent()[1]).toEqual({
      id: "m2",
      name: "Andante con moto",
      mark: null,
    });
    expect(sent()[3]).toEqual({ name: "Allegro", mark: 80 });
  });

  it("removes a movement", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Remove movement I" }));
    expect(names()).toEqual(["Andante con moto", "Allegro"]);
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
