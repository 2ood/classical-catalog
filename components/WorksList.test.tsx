import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorksList from "./WorksList";

const works = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    catalogueNum: "K. 550",
    title: "Symphony No. 40",
    slug: "symphony-no-40-k-550",
    genre: "Symphony",
    key: "G minor",
    hasRecording: true,
    movements: [
      { id: "m1", name: "Molto allegro" },
      { id: "m2", name: "Andante" },
    ],
    recordedMovements: ["m1"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    catalogueNum: "K. 41",
    title: "Symphony No. 7",
    slug: "symphony-no-7-k-41",
    genre: "Symphony",
    key: null,
    hasRecording: false,
    movements: [],
    recordedMovements: [],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    catalogueNum: "K. 525",
    title: "Eine kleine Nachtmusik",
    slug: "eine-kleine-nachtmusik-k-525",
    genre: "Serenade",
    key: "G major",
    hasRecording: false,
    movements: [],
    recordedMovements: [],
  },
];

// Rows render "Title, Key" as one text node.
const title = (t: string) => new RegExp(`^${t}(,|$)`);
const row = (t: string) => screen.getByText(title(t)).closest("a")!;
const recordedOnly = () =>
  screen.getByRole("switch", { name: "With recordings" });

/** Every work, with or without recordings (the switch turned off). */
function renderAll() {
  render(<WorksList composerSlug="mozart" works={works} />);
  fireEvent.click(recordedOnly());
}

describe("WorksList", () => {
  it("renders genre groups in order, each sorted by catalogue number", () => {
    renderAll();
    const headings = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(headings).toEqual(["Serenade", "Symphony"]);
    const symphonies = within(
      screen.getByRole("heading", { name: "Symphony" }).parentElement!,
    )
      .getAllByRole("link")
      .map((a) => a.textContent);
    expect(symphonies[0]).toContain("K. 41");
    expect(symphonies[1]).toContain("K. 550");
  });

  it("links each row to the work page", () => {
    renderAll();
    expect(row("Symphony No. 40")).toHaveAttribute(
      "href",
      "/composer/mozart/symphony-no-40-k-550",
    );
  });

  it("marks works with recordings with a dot and fades the rest", () => {
    renderAll();
    expect(
      within(row("Symphony No. 40")).getByLabelText("Has recordings"),
    ).toBeInTheDocument();
    expect(row("Symphony No. 40")).not.toHaveClass("opacity-35");
    expect(
      within(row("Symphony No. 7")).queryByLabelText("Has recordings"),
    ).toBeNull();
    expect(row("Symphony No. 7")).toHaveClass("opacity-35");
  });

  it("filters to one genre with the chips and back to all", () => {
    renderAll();
    const all = screen.getByRole("button", { name: "All" });
    const serenade = screen.getByRole("button", { name: "Serenade" });
    expect(all).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(serenade);
    expect(serenade).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText(title("Symphony No. 40"))).toBeNull();
    expect(
      screen.getByText(title("Eine kleine Nachtmusik")),
    ).toBeInTheDocument();

    fireEvent.click(all);
    expect(screen.getByText(title("Symphony No. 40"))).toBeInTheDocument();
  });

  it("lists each work's movements under it, opening the player there", () => {
    renderAll();
    const andante = screen.getByRole("link", { name: "II. Andante" });
    expect(andante).toHaveAttribute(
      "href",
      "/composer/mozart/symphony-no-40-k-550/ii-andante",
    );
    expect(row("Symphony No. 40").closest("li")).toContainElement(andante);
    expect(
      screen.getByRole("link", { name: "I. Molto allegro" }),
    ).toBeInTheDocument();
  });

  it("fades movements no recording has a start for", () => {
    renderAll();
    expect(
      screen.getByRole("link", { name: "I. Molto allegro" }),
    ).not.toHaveClass("opacity-35");
    expect(screen.getByRole("link", { name: "II. Andante" })).toHaveClass(
      "opacity-35",
    );
  });

  it("folds a work's movements away and back", () => {
    renderAll();
    const toggle = screen.getByRole("button", {
      name: "Movements of Symphony No. 40",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "II. Andante" })).toBeNull();

    fireEvent.click(toggle);
    expect(
      screen.getByRole("link", { name: "II. Andante" }),
    ).toBeInTheDocument();
  });

  it("has no fold toggle for works without movements", () => {
    renderAll();
    expect(
      screen.queryByRole("button", { name: "Movements of Symphony No. 7" }),
    ).toBeNull();
  });

  it("searches works by title or catalogue number", () => {
    renderAll();
    const search = screen.getByRole("searchbox", { name: "Search works" });

    fireEvent.change(search, { target: { value: "nachtmusik" } });
    expect(
      screen.getByText(title("Eine kleine Nachtmusik")),
    ).toBeInTheDocument();
    expect(screen.queryByText(title("Symphony No. 40"))).toBeNull();

    // Catalogue numbers match however they are spaced or dotted.
    fireEvent.change(search, { target: { value: "k550" } });
    expect(screen.getByText(title("Symphony No. 40"))).toBeInTheDocument();
    expect(screen.queryByText(title("Symphony No. 7"))).toBeNull();

    fireEvent.change(search, { target: { value: "requiem" } });
    expect(screen.getByText("No works match.")).toBeInTheDocument();
  });

  it("shows only works with recordings at first, switchable off", () => {
    render(<WorksList composerSlug="mozart" works={works} />);
    const toggle = recordedOnly();
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(title("Symphony No. 40"))).toBeInTheDocument();
    expect(screen.queryByText(title("Symphony No. 7"))).toBeNull();
    expect(screen.queryByText(title("Eine kleine Nachtmusik"))).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(title("Symphony No. 7"))).toBeInTheDocument();
  });

  it("starts with every work when none has recordings yet", () => {
    render(
      <WorksList
        composerSlug="mozart"
        works={works.filter((w) => !w.hasRecording)}
      />,
    );
    expect(recordedOnly()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(title("Symphony No. 7"))).toBeInTheDocument();
  });

  it("hides the chips when there is only one genre", () => {
    render(<WorksList composerSlug="mozart" works={works.slice(0, 2)} />);
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
  });
});
