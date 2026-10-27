import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PerformerInput from "./PerformerInput";

const found: Record<
  string,
  { name: string; kind: string; instrument: string | null }[]
> = {
  sungjin: [{ name: "Seong-Jin Cho", kind: "person", instrument: "Piano" }],
  bpo: [
    { name: "Berliner Philharmoniker", kind: "orchestra", instrument: null },
  ],
  "seong-jin cho": [
    { name: "Seong-Jin Cho", kind: "person", instrument: "Piano" },
  ],
};

function Field({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <PerformerInput value={value} onChange={setValue} />
      <output>{value}</output>
    </>
  );
}

const type = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText("Performer"), {
    target: { value: text },
  });

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const q = new URL(url, "http://localhost").searchParams.get("q") ?? "";
      return Response.json({ performers: found[q] ?? [] });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PerformerInput", () => {
  it("offers known performers like what is typed, and takes one", async () => {
    render(<Field />);
    type("sungjin");
    fireEvent.click(
      await screen.findByRole("option", { name: /Seong-Jin Cho/ }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Seong-Jin Cho");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("searches the performer being typed after a slash", async () => {
    render(<Field />);
    type("Karajan / bpo");
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/performers/search?q=bpo",
      ),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: /Berliner Philharmoniker/ }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Karajan / Berliner Philharmoniker",
    );
  });

  it("keeps a new performer as typed", async () => {
    render(<Field />);
    type("sungjin");
    fireEvent.click(
      await screen.findByRole("option", { name: "+ New performer “sungjin”" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("sungjin");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("offers no new performer for a name already known", async () => {
    render(<Field />);
    type("seong-jin cho");
    await screen.findByRole("option", { name: /Seong-Jin Cho/ });
    expect(screen.queryByRole("option", { name: /New performer/ })).toBeNull();
  });

  it("takes the highlighted one with the arrow keys and Enter", async () => {
    render(<Field />);
    type("sungjin");
    await screen.findByRole("option", { name: /Seong-Jin Cho/ });
    const input = screen.getByPlaceholderText("Performer");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent("Seong-Jin Cho");
  });
});
