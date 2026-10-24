import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorksList from "./WorksList";

const works = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    catalogueNum: "K. 550",
    title: "Symphony No. 40",
    genre: "Symphony",
    key: "G minor",
    hasRecording: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    catalogueNum: "K. 41",
    title: "Symphony No. 7",
    genre: "Symphony",
    key: null,
    hasRecording: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    catalogueNum: "K. 525",
    title: "Eine kleine Nachtmusik",
    genre: "Serenade",
    key: "G major",
    hasRecording: false,
  },
];

// Rows render "Title, Key" as one text node.
const title = (t: string) => new RegExp(`^${t}(,|$)`);
const row = (t: string) => screen.getByText(title(t)).closest("a")!;

describe("WorksList", () => {
  it("renders genre groups in order, each sorted by catalogue number", () => {
    render(<WorksList works={works} />);
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
    render(<WorksList works={works} />);
    expect(row("Symphony No. 40")).toHaveAttribute(
      "href",
      "/work/00000000-0000-4000-8000-000000000001",
    );
  });

  it("marks works with recordings with a dot and fades the rest", () => {
    render(<WorksList works={works} />);
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
    render(<WorksList works={works} />);
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

  it("hides the chips when there is only one genre", () => {
    render(<WorksList works={works.slice(0, 2)} />);
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
  });
});
