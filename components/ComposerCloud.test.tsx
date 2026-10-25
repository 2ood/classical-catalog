import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComposerCloud from "./ComposerCloud";

const composers = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "mozart",
    shortName: "Mozart",
    era: "Classical",
    recordedWorks: 4,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "bach",
    shortName: "Bach",
    era: "Baroque",
    recordedWorks: 1,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    slug: "part",
    shortName: "Pärt",
    era: null,
    recordedWorks: 0,
  },
];

describe("ComposerCloud", () => {
  it("links each composer to their works page", () => {
    render(<ComposerCloud composers={composers} />);
    expect(screen.getByRole("link", { name: /Mozart/ })).toHaveAttribute(
      "href",
      "/composer/mozart",
    );
  });

  it("sizes names from 16px to 42px by recorded works", () => {
    render(<ComposerCloud composers={composers} />);
    expect(screen.getByText("Mozart")).toHaveStyle({ fontSize: "42px" });
    expect(screen.getByText("Pärt")).toHaveStyle({ fontSize: "16px" });
  });

  it("shows name, era and recorded-work count in the tooltip", () => {
    render(<ComposerCloud composers={composers} />);
    expect(
      screen.getByText("Mozart · Classical · 4 recorded works"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bach · Baroque · 1 recorded work"),
    ).toBeInTheDocument();
    expect(screen.getByText("Pärt · 0 recorded works")).toBeInTheDocument();
  });

  it("renders the same layout every time", () => {
    const first = render(<ComposerCloud composers={composers} />);
    const html = first.container.innerHTML;
    first.unmount();
    expect(
      render(<ComposerCloud composers={composers} />).container.innerHTML,
    ).toBe(html);
  });
});
