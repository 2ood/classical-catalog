import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ComposerSchools from "./ComposerSchools";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const sent = () =>
  JSON.parse(vi.mocked(fetch).mock.calls.at(-1)?.[1]?.body as string);

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ schools: [] })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ComposerSchools", () => {
  it("shows the composer's movements", () => {
    render(
      <ComposerSchools
        composerId={ID}
        schools={["Impressionism", "Symbolism"]}
      />,
    );
    expect(screen.getByText("Impressionism")).toBeInTheDocument();
    expect(screen.getByText("Symbolism")).toBeInTheDocument();
  });

  it("removes one and saves the rest", async () => {
    render(
      <ComposerSchools
        composerId={ID}
        schools={["Impressionism", "Symbolism"]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove Symbolism" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `/api/composers/${ID}/schools`,
    );
    expect(sent()).toEqual({ schools: ["Impressionism"] });
  });

  it("adds one typed in", async () => {
    render(<ComposerSchools composerId={ID} schools={["Impressionism"]} />);
    const input = screen.getByRole("textbox", { name: "Add a movement" });
    fireEvent.change(input, { target: { value: "Neoclassicism" } });
    fireEvent.submit(input);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(sent()).toEqual({ schools: ["Impressionism", "Neoclassicism"] });
  });

  it("shows why saving failed", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: "At most 20 movements" }, { status: 400 }),
    );
    render(<ComposerSchools composerId={ID} schools={["Impressionism"]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Impressionism" }),
    );
    expect(await screen.findByText("At most 20 movements")).toBeInTheDocument();
  });
});
