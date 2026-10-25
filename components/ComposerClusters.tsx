import ComposerCloud, { type CloudComposer } from "./ComposerCloud";
import type { Cluster } from "@/lib/clusters";
import { slugify } from "@/lib/slugs";

const MIN_HEIGHT = 120;

/** One small composer cloud per period or movement, under its name. */
export default function ComposerClusters({
  groups,
}: {
  groups: Cluster<CloudComposer>[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => {
        const id = `cluster-${group.kind}-${slugify(group.name)}`;
        return (
          <section key={id} aria-labelledby={id}>
            <h2
              id={id}
              className="flex items-baseline gap-2 text-xs uppercase text-muted border-t border-border pt-2 mb-2"
            >
              {group.name}{" "}
              {group.kind === "movement" && (
                <span className="normal-case">movement</span>
              )}
            </h2>
            <ComposerCloud composers={group.composers} minHeight={MIN_HEIGHT} />
          </section>
        );
      })}
    </div>
  );
}
