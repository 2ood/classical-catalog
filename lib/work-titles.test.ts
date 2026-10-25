import { describe, expect, it } from "vitest";
import {
  genreFromTitle,
  normalizeCatalogue,
  parseWorkTitle,
} from "./work-titles";

describe("parseWorkTitle", () => {
  it.each([
    // [Open Opus title, title, key, catalogue numbers (preferred first)]
    [
      "Symphony no. 5 in C minor, op. 67",
      "Symphony No. 5",
      "C minor",
      ["Op. 67"],
    ],
    [
      'Piano Sonata no. 14 in C sharp minor, op. 27 no. 2, "Moonlight"',
      "Piano Sonata No. 14 “Moonlight”",
      "C-sharp minor",
      ["Op. 27 No. 2"],
    ],
    [
      "Cello Sonata no. 4 in C major, op. 102, no. 1",
      "Cello Sonata No. 4",
      "C major",
      ["Op. 102 No. 1"],
    ],
    [
      'Piano Concerto no. 5 in E flat major, op. 73, "Emperor"',
      "Piano Concerto No. 5 “Emperor”",
      "E-flat major",
      ["Op. 73"],
    ],
    [
      "String Quartet no. 15 in E flat minor, op. 144",
      "String Quartet No. 15",
      "E-flat minor",
      ["Op. 144"],
    ],
    ["Art of the Fugue, BWV.1080", "Art of the Fugue", null, ["BWV 1080"]],
    [
      "Cantata no. 59: Wer mich liebet, der wird mein Wort halten, BWV.59",
      "Cantata No. 59: Wer mich liebet, der wird mein Wort halten",
      null,
      ["BWV 59"],
    ],
    [
      'Symphony no. 35 in D major, K.385, "Haffner"',
      "Symphony No. 35 “Haffner”",
      "D major",
      ["K. 385"],
    ],
    [
      "Symphony in B flat major, K.Anh.214",
      "Symphony",
      "B-flat major",
      ["K. Anh. 214"],
    ],
    [
      "Die schöne Müllerin, D.795, op. 25",
      "Die schöne Müllerin",
      null,
      ["D. 795", "Op. 25"],
    ],
    [
      "Auf dem Strom, for voice, piano, and horn, D.943, op. posth.119",
      "Auf dem Strom, for voice, piano, and horn",
      null,
      ["D. 943", "Op. posth. 119"],
    ],
    [
      "Symphony no. 12 in E major, Hob.I:12",
      "Symphony No. 12",
      "E major",
      ["Hob. I:12"],
    ],
    [
      "String Quartet in D major, Hob.III:49, op. 50, no. 6 ",
      "String Quartet",
      "D major",
      ["Hob. III:49", "Op. 50 No. 6"],
    ],
    [
      "Violin Concerto in A minor, op. 3, no. 6, RV.356",
      "Violin Concerto",
      "A minor",
      ["RV 356", "Op. 3 No. 6"],
    ],
    [
      "Oboe Concerto in C major, RV. 446",
      "Oboe Concerto",
      "C major",
      ["RV 446"],
    ],
    [
      "Concerto for 2 Clarinets, 2 Oboes, Strings, Continuo in C RV.560",
      "Concerto for 2 Clarinets, 2 Oboes, Strings, Continuo",
      "C major",
      ["RV 560"],
    ],
    [
      "Coronation Anthems, HWV.258-261",
      "Coronation Anthems",
      null,
      ["HWV 258-261"],
    ],
    [
      "Flute  Sonata in E minor, op. 1, no. 1b, HWV.359b",
      "Flute Sonata",
      "E minor",
      ["HWV 359b", "Op. 1 No. 1b"],
    ],
    ["An einen Säugling, WoO 108", "An einen Säugling", null, ["WoO 108"]],
    ["Deutsche Volksliede, WoO38", "Deutsche Volksliede", null, ["WoO 38"]],
    [
      "Bei Schenkung eines Flügels, WoO 26 no. 4",
      "Bei Schenkung eines Flügels",
      null,
      ["WoO 26 No. 4"],
    ],
    [
      "Ballade no. 2 in B minor, S.171, R.16",
      "Ballade No. 2",
      "B minor",
      ["S. 171", "R. 16"],
    ],
    [
      "A magyarok Istene, for chorus, S339/R635",
      "A magyarok Istene, for chorus",
      null,
      ["S. 339/R635"],
    ],
    [
      "The Wild Dove, B.198, op. 110",
      "The Wild Dove",
      null,
      ["Op. 110", "B. 198"],
    ],
    [
      "Jakobin, B.159/B.200, op. 84",
      "Jakobin",
      null,
      ["Op. 84", "B. 159/B.200"],
    ],
    [
      "String Quartet no. 1 in A minor, op. 7, BB52, Sz.40",
      "String Quartet No. 1",
      "A minor",
      ["Op. 7", "Sz. 40", "BB 52"],
    ],
    [
      "Allegro barbaro, BB63, Sz.49",
      "Allegro barbaro",
      null,
      ["Sz. 49", "BB 63"],
    ],
    [
      "Prélude à l'après-midi d'un faune, L.86",
      "Prélude à l'après-midi d'un faune",
      null,
      ["L. 86"],
    ],
    [
      "Sonata in A major, K.322, L.483",
      "Sonata",
      "A major",
      ["K. 322", "L. 483"],
    ],
    [
      'Symphony no. 1 in D, op. 25, "Classical"',
      "Symphony No. 1 “Classical”",
      "D major",
      ["Op. 25"],
    ],
    [
      'Fantasia for piano in C, D.605a, "Grazer Fantasie"',
      "Fantasia for piano “Grazer Fantasie”",
      "C major",
      ["D. 605a"],
    ],
    ["Der Taucher, D.77 and D.111", "Der Taucher", null, ["D. 77", "D. 111"]],
    ["The Nose Op.15a", "The Nose", null, ["Op. 15a"]],
    [
      "5 Melodies for Violin and Piano, op. 35bis",
      "5 Melodies for Violin and Piano",
      null,
      ["Op. 35bis"],
    ],
    [
      'Le gladiateur, cantata for 3 soloists and orchestra, L.41, "Mort aux Romains, tuez jusqu\'au dernier"',
      "Le gladiateur, cantata for 3 soloists and orchestra “Mort aux Romains, tuez jusqu'au dernier”",
      null,
      ["L. 41"],
    ],
    [
      'Symphony no. 2 in C minor, "Resurrection"',
      "Symphony No. 2 “Resurrection”",
      "C minor",
      [],
    ],
    [
      "Clarinet Trio no. 1 in E flat major, Hob.IV:Es1",
      "Clarinet Trio No. 1",
      "E-flat major",
      ["Hob. IV:Es1"],
    ],
    [
      "Allegro molto in D major, Hob.XVII:D2",
      "Allegro molto",
      "D major",
      ["Hob. XVII:D2"],
    ],
    [
      "Laudate pueri Dominum, RV.anh.30",
      "Laudate pueri Dominum",
      null,
      ["RV Anh. 30"],
    ],
    [
      'Cantata no. 140, "Wachet auf, ruft uns die Stimme", BWV.140',
      "Cantata No. 140 “Wachet auf, ruft uns die Stimme”",
      null,
      ["BWV 140"],
    ],
    [
      'Gedichte aus "Liebesfrühling", op. 37',
      "Gedichte aus “Liebesfrühling”",
      null,
      ["Op. 37"],
    ],
    [
      "Divertissement sur des motifs orginaux français, D.823, op. 63; Op.84",
      "Divertissement sur des motifs orginaux français",
      null,
      ["D. 823", "Op. 63", "Op. 84"],
    ],
    ["Boléro", "Boléro", null, []],
    ["Songs, op. 42", "Songs", null, ["Op. 42"]],
    ["Kyrie in G minor, WoO 17", "Kyrie", "G minor", ["WoO 17"]],
  ])("%s", (input, title, key, catalogueNums) => {
    expect(parseWorkTitle(input)).toEqual({ title, key, catalogueNums });
  });
});

describe("normalizeCatalogue", () => {
  it("ignores case, dots and spacing", () => {
    expect(normalizeCatalogue("Op. 27 No. 2")).toBe(
      normalizeCatalogue("op.27 no.2"),
    );
    expect(normalizeCatalogue("BWV 988")).toBe(normalizeCatalogue("BWV.988"));
    expect(normalizeCatalogue("K. 550")).not.toBe(normalizeCatalogue("K. 55"));
  });
});

describe("genreFromTitle", () => {
  it.each([
    ["Symphony No. 5", "", "Orchestral", "Symphony"],
    ["Piano Concerto No. 5 “Emperor”", "", "Orchestral", "Piano Concerto"],
    ["Double Violin Concerto", "", "Orchestral", "Violin Concerto"],
    ["Concerto for Strings", "", "Orchestral", "Concerto"],
    ["Piano Sonata No. 14 “Moonlight”", "", "Keyboard", "Piano Sonata"],
    ["Sonata", "", "Keyboard", "Sonata"],
    ["Trio Sonata", "", "Chamber", "Trio Sonata"],
    ["String Quartet No. 12", "", "Chamber", "String Quartet"],
    ["Piano Trio", "", "Chamber", "Piano Trio"],
    ["Missa Solemnis", "", "Vocal", "Mass"],
    ["Mass for soloists, chorus, organ, and orchestra", "", "Vocal", "Mass"],
    ["Cantata No. 59: Wer mich liebet", "", "Vocal", "Cantata"],
    [
      "Le gladiateur, cantata for 3 soloists and orchestra",
      "",
      "Vocal",
      "Cantata",
    ],
    ["Leonore Overture No. 3", "", "Orchestral", "Overture"],
    ["Mazurkas", "", "Keyboard", "Mazurka"],
    ["Waltzes", "", "Keyboard", "Waltz"],
    ["Variations on a March by Dressler", "", "Keyboard", "Variations"],
    // The form named first wins over one mentioned later.
    [
      "Variations on a Theme from the Opera Don Giovanni",
      "",
      "Keyboard",
      "Variations",
    ],
    // Nicknames are not forms.
    [
      "Divertimento “Salzburg Symphony no. 3”",
      "",
      "Orchestral",
      "Divertimento",
    ],
    // The subtitle names the form when the title doesn't.
    ["Ariodante", "Opera", "Stage", "Opera"],
    ["Boléro", "Ballet", "Stage", "Ballet"],
    ["Rinaldo", "Cantata", "Vocal", "Cantata"],
    // Otherwise Open Opus' broad genre.
    ["Allegro barbaro", "", "Keyboard", "Keyboard"],
    ["Gesänge", "Songs", "Vocal", "Vocal"],
  ])("%s [%s] → %s", (title, subtitle, fallback, genre) => {
    expect(genreFromTitle(title, subtitle, fallback)).toBe(genre);
  });
});
