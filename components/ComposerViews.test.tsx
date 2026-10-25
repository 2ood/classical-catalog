import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComposerClusters from "./ComposerClusters";
import ComposerTimeline from "./ComposerTimeline";
import ViewSwitch from "./ViewSwitch";

const composer = (
  slug: string,
  shortName: string,
  era: string,
  born: number,
  died: number | null,
) => ({
  id: `00000000-0000-4000-8000-${slug.padStart(12, "0").slice(-12)}`,
  slug,
  shortName,
  era,
  born,
  died,
  recordedWorks: 1,
  schools: [] as string[],
});

const bach = composer("bach", "Bach", "Baroque", 1685, 1750);
const brahms = composer("brahms", "Brahms", "Romantic", 1833, 1897);
const part = composer("part", "Pärt", "Post-War", 1935, null);

describe("ViewSwitch", () => {
  it("links each view and marks the current one", () => {
    render(<ViewSwitch current="timeline" />);
    const link = (name: string) => screen.getByRole("link", { name });
    expect(link("Cloud")).toHaveAttribute("href", "/");
    expect(link("Timeline")).toHaveAttribute("href", "/?view=timeline");
    expect(link("Periods")).toHaveAttribute("href", "/?view=periods");
    expect(link("Movements")).toHaveAttribute("href", "/?view=movements");
    expect(link("Timeline")).toHaveAttribute("aria-current", "page");
    expect(link("Cloud")).not.toHaveAttribute("aria-current");
  });

  it("works under another page, with its own first view", () => {
    render(
      <ViewSwitch current="default" path="/library" defaultLabel="List" />,
    );
    const link = (name: string) => screen.getByRole("link", { name });
    expect(link("List")).toHaveAttribute("href", "/library");
    expect(link("List")).toHaveAttribute("aria-current", "page");
    expect(link("Timeline")).toHaveAttribute("href", "/library?view=timeline");
  });
});

describe("views of the Library", () => {
  const ravel = {
    ...composer("ravel", "Ravel", "Late Romantic", 1875, 1937),
    href: "/library?q=Maurice%20Ravel",
    muted: true,
  };

  it("fades composers not imported yet and links them where they can be", () => {
    render(
      <ComposerTimeline
        composers={[bach, ravel]}
        era={null}
        thisYear={2026}
        path="/library"
      />,
    );
    const link = screen.getByRole("link", { name: "Ravel" });
    expect(link).toHaveAttribute("href", "/library?q=Maurice%20Ravel");
    expect(link).toHaveClass("opacity-35");
    expect(screen.getByRole("link", { name: "Bach" })).not.toHaveClass(
      "opacity-35",
    );
    expect(screen.getByRole("link", { name: "Baroque" })).toHaveAttribute(
      "href",
      "/library?view=timeline&era=Baroque",
    );
  });

  it("does the same in clusters", () => {
    render(
      <ComposerClusters
        groups={[
          { name: "Impressionism", kind: "movement", composers: [ravel] },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: /Ravel/ });
    expect(link).toHaveAttribute("href", "/library?q=Maurice%20Ravel");
    expect(link.querySelector("span")).toHaveClass("opacity-35");
  });
});

describe("ComposerTimeline", () => {
  it("links each composer on the timeline, with their years", () => {
    render(
      <ComposerTimeline
        composers={[bach, brahms, part]}
        era={null}
        thisYear={2026}
      />,
    );
    const link = screen.getByRole("link", { name: "Bach" });
    expect(link).toHaveAttribute("href", "/composer/bach");
    expect(link).toHaveAttribute("title", "Bach, 1685–1750");
    expect(screen.getByRole("link", { name: "Pärt" })).toHaveAttribute(
      "title",
      "Pärt, born 1935",
    );
    expect(screen.getByText("1700")).toBeInTheDocument();
  });

  it("zooms to an era with its chip", () => {
    render(
      <ComposerTimeline
        composers={[bach, brahms, part]}
        era="Romantic"
        thisYear={2026}
      />,
    );
    const chips = screen.getByRole("navigation", { name: "Eras" });
    expect(
      within(chips).getByRole("link", { name: "Baroque" }),
    ).toHaveAttribute("href", "/?view=timeline&era=Baroque");
    expect(
      within(chips).getByRole("link", { name: "Romantic" }),
    ).toHaveAttribute("aria-current", "page");
    expect(within(chips).getByRole("link", { name: "All" })).toHaveAttribute(
      "href",
      "/?view=timeline",
    );
    expect(screen.queryByRole("link", { name: "Bach" })).toBeNull();
    expect(screen.getByRole("link", { name: "Brahms" })).toBeInTheDocument();
  });
});

describe("ComposerClusters", () => {
  it("shows one cloud per group under its name", () => {
    render(
      <ComposerClusters
        groups={[
          { name: "Baroque", kind: "period", composers: [bach] },
          { name: "Minimalism", kind: "movement", composers: [part] },
        ]}
      />,
    );
    const baroque = screen.getByRole("region", { name: "Baroque" });
    expect(within(baroque).getByRole("link", { name: /Bach/ })).toHaveAttribute(
      "href",
      "/composer/bach",
    );
    const minimalism = screen.getByRole("region", {
      name: "Minimalism movement",
    });
    expect(within(minimalism).getByText("movement")).toBeInTheDocument();
  });
});
