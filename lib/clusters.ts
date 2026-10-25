import { EPOCHS } from "./openopus";

type Clusterable = {
  era: string | null;
  born: number | null;
  schools: string[];
};

export type Cluster<T> = {
  name: string;
  kind: "period" | "movement";
  composers: T[];
};

const OTHER = "Other";

function rank(era: string): number {
  if (era === OTHER) return EPOCHS.length + 2;
  const i = EPOCHS.indexOf(era);
  return i === -1 ? EPOCHS.length + 1 : i;
}

/**
 * One group per era, Medieval → 21st Century; eras typed by hand that Open
 * Opus doesn't use come next (alphabetically), then composers without one.
 */
export function byPeriod<T extends Clusterable>(composers: T[]): Cluster<T>[] {
  const groups = new Map<string, T[]>();
  for (const composer of composers) {
    const era = composer.era || OTHER;
    groups.set(era, [...(groups.get(era) ?? []), composer]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([name, members]) => ({ name, kind: "period", composers: members }));
}

const averageBorn = (members: Clusterable[]) => {
  const years = members.flatMap((m) => (m.born === null ? [] : [m.born]));
  return years.length
    ? years.reduce((sum, y) => sum + y, 0) / years.length
    : Infinity;
};

/**
 * One group per movement (a composer in several appears in each); composers
 * without one fall under their period. Groups run by their members' average
 * birth year, so movements sit among the periods they belong to.
 */
export function byMovement<T extends Clusterable>(
  composers: T[],
): Cluster<T>[] {
  const schools = new Map<string, T[]>();
  for (const composer of composers) {
    for (const school of composer.schools) {
      schools.set(school, [...(schools.get(school) ?? []), composer]);
    }
  }
  const untagged = composers.filter((c) => c.schools.length === 0);
  return [
    ...[...schools.entries()].map(([name, members]): Cluster<T> => ({
      name,
      kind: "movement",
      composers: members,
    })),
    ...byPeriod(untagged),
  ]
    .map((group) => ({ group, born: averageBorn(group.composers) }))
    .sort((a, b) => a.born - b.born || a.group.name.localeCompare(b.group.name))
    .map(({ group }) => group);
}
