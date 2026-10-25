import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LibraryBrowser, { type LibraryComposer } from "./LibraryBrowser";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const composers: LibraryComposer[] = [
  {
    openOpusId: 149,
    name: "Adams",
    completeName: "John Adams",
    born: 1947,
    died: null,
    epoch: "21st Century",
    imported: null,
  },
  {
    openOpusId: 87,
    name: "Bach",
    completeName: "Johann Sebastian Bach",
    born: 1685,
    died: 1750,
    epoch: "Baroque",
    imported: { slug: "bach", works: 981 },
  },
  {
    openOpusId: 189,
    name: "Dvořák",
    completeName: "Antonín Dvořák",
    born: 1841,
    died: 1904,
    epoch: "Romantic",
    imported: null,
  },
];

const names = () =>
  screen
    .getAllByRole("listitem")
    .map((li) => li.querySelector("span")!.textContent);

const line = (message: object) => `${JSON.stringify(message)}\n`;

/** A streamed import response whose lines the test sends one by one. */
function streamed() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start: (c) => (controller = c),
  });
  const encoder = new TextEncoder();
  return {
    response: new Response(body),
    send: (message: object) =>
      controller.enqueue(encoder.encode(line(message))),
    close: () => controller.close(),
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          line({ type: "imported", added: 153, linked: 0 }) +
            line({ type: "done", added: 153, linked: 0, movements: 80 }),
        ),
      ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("LibraryBrowser", () => {
  it("offers the eras present, in chronological order", () => {
    render(<LibraryBrowser composers={composers} />);
    const chips = screen.getAllByRole("button", { pressed: false });
    expect(chips.map((c) => c.textContent)).toEqual([
      "Baroque",
      "Romantic",
      "21st Century",
    ]);
  });

  it("filters by era", () => {
    render(<LibraryBrowser composers={composers} />);
    fireEvent.click(screen.getByRole("button", { name: "Baroque" }));
    expect(names()).toEqual(["Johann Sebastian Bach"]);
  });

  it("searches names ignoring accents", () => {
    render(<LibraryBrowser composers={composers} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "dvorak" },
    });
    expect(names()).toEqual(["Antonín Dvořák"]);
  });

  it("links an imported composer and shows their work count", () => {
    render(<LibraryBrowser composers={composers} />);
    expect(
      screen.getByRole("link", { name: "Johann Sebastian Bach" }),
    ).toHaveAttribute("href", "/composer/bach");
    expect(screen.getByText("981 works")).toBeInTheDocument();
  });

  it("imports a composer, then refreshes", async () => {
    render(<LibraryBrowser composers={composers} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Import Antonín Dvořák" }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/library/import");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ openOpusId: 189 });
  });

  it("shows progress while movements come in", async () => {
    const stream = streamed();
    vi.mocked(fetch).mockResolvedValue(stream.response);
    render(<LibraryBrowser composers={composers} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Import Antonín Dvořák" }),
    );

    stream.send({ type: "imported", added: 153, linked: 0 });
    stream.send({ type: "progress", done: 3, total: 21 });
    expect(await screen.findByText("Movements 3 / 21…")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();

    stream.send({ type: "done", added: 153, linked: 0, movements: 80 });
    stream.close();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("updates an imported composer the same way", async () => {
    render(<LibraryBrowser composers={composers} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Update Johann Sebastian Bach" }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string),
    ).toEqual({ openOpusId: 87 });
  });

  it("keeps the imported works when movements fail", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        line({ type: "imported", added: 153, linked: 0 }) +
          line({ type: "error", error: "MusicBrainz responded 503" }),
      ),
    );
    render(<LibraryBrowser composers={composers} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Import Antonín Dvořák" }),
    );

    expect(
      await screen.findByText(
        "Works imported, but movements failed: MusicBrainz responded 503",
      ),
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("says when MusicBrainz doesn't know the composer", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        line({ type: "imported", added: 153, linked: 0 }) +
          line({ type: "done", added: 153, linked: 0, movements: null }),
      ),
    );
    render(<LibraryBrowser composers={composers} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Import Antonín Dvořák" }),
    );

    expect(
      await screen.findByText(
        "Works imported, but MusicBrainz has no match for this composer, so no movements were added.",
      ),
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("shows why an import failed", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: "Open Opus responded 503" }, { status: 502 }),
    );
    render(<LibraryBrowser composers={composers} />);
    fireEvent.click(screen.getByRole("button", { name: "Import John Adams" }));

    expect(
      await screen.findByText("Open Opus responded 503"),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
