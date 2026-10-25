import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkMovements from "./WorkMovements";

const movements = [
  { id: "m1", name: "Intermezzo in a-Moll" },
  { id: "m2", name: "Intermezzo in A-Dur" },
  { id: "m3", name: "Ballade in g-Moll" },
];

describe("WorkMovements", () => {
  it("lists the work's movements, numbered, on request", () => {
    render(<WorkMovements movements={movements} />);
    const toggle = screen.getByRole("button", { name: "3 movements" });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      [
        "I. Intermezzo in a-Moll",
        "II. Intermezzo in A-Dur",
        "III. Ballade in g-Moll",
      ],
    );

    fireEvent.click(toggle);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("says so when a single movement", () => {
    render(<WorkMovements movements={movements.slice(0, 1)} />);
    expect(
      screen.getByRole("button", { name: "1 movement" }),
    ).toBeInTheDocument();
  });

  it("renders nothing for a work without movements", () => {
    const { container } = render(<WorkMovements movements={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
