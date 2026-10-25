import { describe, expect, it } from "vitest";
import {
  byInstrument,
  guessKind,
  parsePerformerEdit,
  resolvePerformers,
  splitPerformers,
} from "./performers";

describe("splitPerformers", () => {
  it.each([
    ["Arcadi Volodos", ["Arcadi Volodos"]],
    ["Karajan / BPO (cycle)", ["Karajan", "BPO"]],
    [
      "Joachim Kerol / New Paris Symphony Association Chorus / Pasdeloup Orchestra / René Leibowitz",
      [
        "Joachim Kerol",
        "New Paris Symphony Association Chorus",
        "Pasdeloup Orchestra",
        "René Leibowitz",
      ],
    ],
    [
      "Sir Simon Rattle/Berliner Philharmoniker",
      ["Sir Simon Rattle", "Berliner Philharmoniker"],
    ],
    ["  Lang Lang  /  / lang lang ", ["Lang Lang"]],
    ["(live)", []],
  ])("%s", (text, parts) => {
    expect(splitPerformers(text)).toEqual(parts);
  });
});

describe("guessKind", () => {
  it.each([
    ["Berliner Philharmoniker", "orchestra"],
    ["Los Angeles Philharmonic", "orchestra"],
    ["London Symphony Orchestra", "orchestra"],
    ["Danish National Chamber Orchestra", "orchestra"],
    ["Staatskapelle Dresden", "orchestra"],
    ["BPO", "orchestra"],
    ["New Paris Symphony Association Chorus", "choir"],
    ["Wiener Singverein", "choir"],
    ["Emerson String Quartet", "ensemble"],
    ["Il Giardino Armonico Ensemble", "ensemble"],
    ["Seong-Jin Cho", "person"],
    ["Karajan", "person"],
  ])("%s → %s", (name, kind) => {
    expect(guessKind(name)).toBe(kind);
  });
});

describe("resolvePerformers", () => {
  const known = [
    { id: "p1", name: "Berliner Philharmoniker", aliases: ["BPO"] },
    { id: "p2", name: "Seong-Jin Cho", aliases: [] },
  ];

  it("finds performers by name or alias, ignoring case, accents and hyphens", () => {
    expect(resolvePerformers(["bpo", "Seong-Jin Cho"], known)).toEqual({
      ids: ["p1", "p2"],
      created: [],
    });
  });

  it("creates the ones it doesn't know, once each", () => {
    expect(resolvePerformers(["Karajan", "BPO", "karajan"], known)).toEqual({
      ids: [null, "p1"],
      created: ["Karajan"],
    });
  });
});

describe("parsePerformerEdit", () => {
  it("takes a new name, kind and instrument, trimmed", () => {
    expect(
      parsePerformerEdit({
        name: "  Herbert von Karajan ",
        kind: "person",
        instrument: " ",
      }),
    ).toEqual({
      ok: true,
      value: { name: "Herbert von Karajan", kind: "person", instrument: null },
    });
  });

  it("collapses spacing inside names without touching letters", () => {
    expect(parsePerformerEdit({ name: "Mstislav   Rostropovich" })).toEqual({
      ok: true,
      value: { name: "Mstislav Rostropovich" },
    });
  });

  it("takes only what is sent", () => {
    expect(parsePerformerEdit({ instrument: "Piano" })).toEqual({
      ok: true,
      value: { instrument: "Piano" },
    });
  });

  it.each([
    ["a blank name", { name: "  " }],
    ["an unknown kind", { kind: "band" }],
    ["too long a name", { name: "x".repeat(121) }],
    ["an instrument not in the list", { instrument: "kazoo" }],
    ["no object", null],
  ])("rejects %s", (_, body) => {
    expect(parsePerformerEdit(body).ok).toBe(false);
  });
});

describe("byInstrument", () => {
  const p = (name: string, instrument: string | null) => ({ name, instrument });

  it("groups people in the list's order (conductors, keyboards, …, voices), the rest last", () => {
    const groups = byInstrument([
      p("Seong-Jin Cho", "Piano"),
      p("Cecilia Bartoli", "Mezzo-soprano"),
      p("Herbert von Karajan", "Conductor"),
      p("Glenn Gould", "Piano"),
      p("Lang Lang", null),
      p("Hilary Hahn", "Violin"),
    ]);
    expect(
      groups.map((g) => [g.name, g.performers.map((x) => x.name)]),
    ).toEqual([
      ["Conductor", ["Herbert von Karajan"]],
      ["Piano", ["Seong-Jin Cho", "Glenn Gould"]],
      ["Violin", ["Hilary Hahn"]],
      ["Mezzo-soprano", ["Cecilia Bartoli"]],
      ["Other", ["Lang Lang"]],
    ]);
  });
});
