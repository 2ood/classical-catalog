/** A composer's movements ("movement", P135) from Wikidata. */
import { cleanSchool } from "./schools";

const SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "classical-catalog/0.1 ( https://github.com/2ood/classical-catalog )";

/** School names for a Wikidata item, without period-like ones. */
export async function wikidataSchools(qid: string): Promise<string[]> {
  if (!/^Q\d+$/.test(qid)) throw new Error(`Not a Wikidata item: ${qid}`);
  const query = `SELECT ?mLabel WHERE { wd:${qid} wdt:P135 ?m . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
  const res = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
    },
  });
  if (!res.ok) throw new Error(`Wikidata responded ${res.status}`);
  const body = await res.json();
  const labels: string[] = body.results.bindings.map(
    (b: { mLabel: { value: string } }) => b.mLabel.value,
  );
  return [...new Set(labels.map(cleanSchool).filter((s): s is string => !!s))];
}
