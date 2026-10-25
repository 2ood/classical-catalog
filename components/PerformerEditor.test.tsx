import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PerformerEditor from "./PerformerEditor";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const bpo = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "BPO",
  kind: "orchestra" as const,
  instrument: null,
};
const others = [
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Berliner Philharmoniker",
  },
  { id: "00000000-0000-4000-8000-000000000003", name: "Wiener Philharmoniker" },
];

const sent = (method: string) => {
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([, init]) => init?.method === method);
  return { url: call?.[0], body: JSON.parse(call?.[1]?.body as string) };
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(Response.json({ slug: "berliner-philharmoniker" })),
  );
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PerformerEditor", () => {
  it("renames the performer", async () => {
    render(<PerformerEditor performer={bpo} others={others} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Berlin Phil" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(sent("PATCH")).toEqual({
      url: `/api/performers/${bpo.id}`,
      body: { name: "Berlin Phil", kind: "orchestra", instrument: "" },
    });
  });

  it("picks a person's instrument or role from the list", async () => {
    render(
      <PerformerEditor
        performer={{ ...bpo, name: "Seong-Jin Cho", kind: "person" }}
        others={others}
      />,
    );
    const instrument = screen.getByRole("combobox", {
      name: "Instrument or role",
    });
    expect(
      screen.queryByRole("textbox", { name: "Instrument or role" }),
    ).toBeNull();
    fireEvent.change(instrument, { target: { value: "Piano" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(sent("PATCH").body).toMatchObject({
      kind: "person",
      instrument: "Piano",
    });
  });

  it("has no instrument for orchestras, choirs and ensembles", () => {
    render(<PerformerEditor performer={bpo} others={others} />);
    expect(
      screen.queryByRole("combobox", { name: "Instrument or role" }),
    ).toBeNull();
  });

  it("merges into another performer and goes to them", async () => {
    render(<PerformerEditor performer={bpo} others={others} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Merge into" }), {
      target: { value: others[0].id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/performer/berliner-philharmoniker"),
    );
    expect(confirm).toHaveBeenCalledWith(
      "Merge BPO into Berliner Philharmoniker? “BPO” will become another name for them.",
    );
    expect(sent("POST")).toEqual({
      url: `/api/performers/${bpo.id}/merge`,
      body: { into: others[0].id },
    });
  });

  it("shows why saving failed", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { error: "Another performer has that name" },
        { status: 409 },
      ),
    );
    render(<PerformerEditor performer={bpo} others={others} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Another performer has that name"),
    ).toBeInTheDocument();
  });
});
