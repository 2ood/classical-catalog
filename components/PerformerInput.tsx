"use client";

import { useEffect, useId, useState } from "react";
import { performerKey } from "@/lib/performers";

type Found = { name: string; kind: string; instrument: string | null };

/**
 * A recording's performers ("Karajan / BPO"), offering known performers
 * like the one being typed (after the last slash), misspelt or romanized
 * otherwise; one not known is kept as typed, a new performer once saved.
 */
export default function PerformerInput({
  value,
  onChange,
  className = "",
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}) {
  const parts = value.split("/");
  const typing = parts.at(-1)!.trim();
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<{ query: string; performers: Found[] }>({
    query: "",
    performers: [],
  });
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();

  useEffect(() => {
    if (!open || !typing) return;
    let stale = false;
    fetch(`/api/performers/search?q=${encodeURIComponent(typing)}`)
      .then((res) => res.json())
      .then(
        (answer) =>
          !stale &&
          setFound({ query: typing, performers: answer.performers ?? [] }),
      )
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [open, typing]);

  const performers = found.query === typing ? found.performers : [];
  const known = performers.some(
    (p) => performerKey(p.name) === performerKey(typing),
  );
  // The known performers, then (unless known) the name as typed.
  const options = [
    ...performers.map((p) => p.name),
    ...(typing && performers.length > 0 && !known ? [null] : []),
  ];
  const shown = open && typing !== "" && options.length > 0;

  function choose(name: string | null) {
    if (name !== null) {
      onChange([...parts.slice(0, -1).map((p) => p.trim()), name].join(" / "));
    }
    setOpen(false);
    setHighlight(-1);
  }

  return (
    <div className={`relative ${className}`}>
      <input
        placeholder="Performer"
        required={required}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!shown) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setHighlight((h) => (h + step + options.length) % options.length);
          } else if (e.key === "Enter" && highlight !== -1) {
            e.preventDefault();
            choose(options[highlight]);
          } else if (e.key === "Escape") {
            // Closes the list, not the form around it.
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className="w-full border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text"
      />
      {shown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 inset-x-0 top-full bg-bg border border-border max-h-72 overflow-y-auto"
        >
          {options.map((name, i) => {
            const p = performers[i];
            return (
              <li
                key={name ?? ""}
                role="option"
                aria-selected={i === highlight}
                // Chosen before the input's blur closes the list.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(name)}
                className={`flex gap-2 px-2 py-1 cursor-pointer truncate hover:bg-surface ${
                  i === highlight ? "bg-surface" : ""
                }`}
              >
                {name === null ? (
                  <span className="text-muted">+ New performer “{typing}”</span>
                ) : (
                  <>
                    <span className="truncate">{name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {p.instrument ?? p.kind}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
