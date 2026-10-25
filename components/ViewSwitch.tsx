import Link from "next/link";

const VIEWS = [
  { key: "default", label: null },
  { key: "timeline", label: "Timeline" },
  { key: "periods", label: "Periods" },
  { key: "movements", label: "Movements" },
] as const;

/** "default" is the page's own view: the cloud at home, the list in the Library. */
export type View = (typeof VIEWS)[number]["key"];

export function toView(value: unknown): View {
  return VIEWS.some((v) => v.key === value) ? (value as View) : "default";
}

const chip = "px-2 py-0.5 rounded-sm text-sm";
const active = "bg-inverse-bg text-inverse-text";
const inactive = "bg-bg border border-border text-muted hover:text-text";

/** Ways of seeing composers on a page (`path`), kept in the URL as `?view=`. */
export default function ViewSwitch({
  current,
  path = "/",
  defaultLabel = "Cloud",
}: {
  current: View;
  path?: string;
  defaultLabel?: string;
}) {
  return (
    <nav aria-label="Views" className="flex justify-center gap-2 mb-6">
      {VIEWS.map((v) => (
        <Link
          key={v.key}
          href={v.key === "default" ? path : `${path}?view=${v.key}`}
          aria-current={v.key === current ? "page" : undefined}
          className={`${chip} ${v.key === current ? active : inactive}`}
        >
          {v.label ?? defaultLabel}
        </Link>
      ))}
    </nav>
  );
}
