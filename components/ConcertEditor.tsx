"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import PerformerInput from "./PerformerInput";
import {
  PlayModeToggle,
  shouldLoad,
  useYouTube,
  useYouTubeEvents,
} from "./YouTubeDock";
import { spanEnds } from "@/lib/concerts";
import { trackJump, type Track } from "@/lib/playback";
import { runImport } from "@/lib/import-client";
import {
  formatTimestamp,
  movementLabel,
  parseTimestamp,
  type WorkMovement,
} from "@/lib/movements";
import type { ConcertPiece } from "@/lib/queries";

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";
const small = "text-xs text-muted hover:text-text";

type FoundWork = {
  id: string;
  title: string;
  catalogueNum: string | null;
  movements: WorkMovement[];
  composer: string;
};

// A piece picked: a work, or one of its movements.
type Picked = { work: FoundWork; movementId: string | null };

/** "Robert Schumann · Op. 15 Kinderszenen", "… — VII. Träumerei" */
function pieceLabel(
  composer: string,
  work: {
    title: string;
    catalogueNum: string | null;
    movements: WorkMovement[];
  },
  movementId: string | null = null,
) {
  const label = `${composer} · ${[work.catalogueNum, work.title]
    .filter(Boolean)
    .join(" ")}`;
  const i = work.movements.findIndex((m) => m.id === movementId);
  return i === -1 ? label : `${label} — ${movementLabel(work.movements[i], i)}`;
}

const time = (s: number | null | undefined) =>
  s == null ? "" : formatTimestamp(s);

/**
 * One YouTube video holding many pieces, e.g. a concert: the video beside
 * its pieces, each a span (start, end) saved as a recording of its work.
 * A piece without an end of its own plays until the next one starts.
 */
export default function ConcertEditor({
  videoId,
  title,
  pieces,
}: {
  videoId: string;
  /** The video's title, if YouTube told it. */
  title: string | null;
  pieces: ConcertPiece[];
}) {
  const router = useRouter();
  const {
    video,
    status,
    load,
    seekTo,
    play,
    pause,
    currentTime,
    slot,
    playMode,
  } = useYouTube();
  const recordingId = `concert-${videoId}`;
  const holding = video?.recordingId === recordingId;
  const docked = {
    recordingId,
    videoId,
    title: title ?? "Concert",
    href: `/concert/${videoId}`,
  };
  const [now, setNow] = useState<number | null>(null);
  // Pieces being added, not saved yet (numbered for keys).
  const [added, setAdded] = useState<number[]>([]);
  const ends = spanEnds(pieces);
  // In the order they are played.
  const ordered = [...pieces].sort(
    (a, b) => (a.startSeconds ?? 0) - (b.startSeconds ?? 0),
  );

  // On arrival, cue the video, unless another one is playing.
  const arrive = useEffectEvent(() => {
    const loaded = video && { recordingId: video.recordingId, status };
    if (shouldLoad(loaded, recordingId, false)) {
      load(docked, { autoplay: false });
    }
  });
  useLayoutEffect(() => arrive(), []);

  // Playing along skips the gap after a piece with its own end (applause);
  // looping goes back to the piece's start at its end.
  const tracks: Track[] = ordered.map((p) => ({
    id: p.id,
    start: p.startSeconds ?? 0,
    end: ends[p.id],
    stop: p.endSeconds !== null,
  }));
  const playingPiece = useRef<string | null>(null);
  useYouTubeEvents(recordingId, {
    onTime: (seconds) => {
      setNow(seconds);
      const { current, jump } = trackJump(
        tracks,
        playingPiece.current,
        seconds,
        playMode,
      );
      playingPiece.current = current;
      if (jump === "pause") pause();
      else if (jump !== null) seekTo(jump);
    },
    onEnded: () => {
      // The video ran out in the last piece: looping, play it again.
      const piece = tracks.find((t) => t.id === playingPiece.current);
      if (playMode === "loop" && piece) {
        seekTo(piece.start);
        play();
      }
    },
  });

  const playAt = (seconds: number) => {
    if (holding) {
      seekTo(seconds);
      play();
    } else {
      load(docked, { start: seconds, autoplay: true });
    }
  };
  const position = () => (holding ? currentTime() : null);
  const last = ordered.at(-1);

  return (
    <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-border">
      <section className="p-4 flex flex-col gap-2 min-h-0">
        <h1 className="text-lg">{title ?? "Concert"}</h1>
        <div className="flex-1 min-h-0">
          {holding ? (
            <div ref={slot} className="w-full h-full" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 border border-border text-sm text-muted">
              {video && <p>Playing: {video.title}</p>}
              <button
                type="button"
                onClick={() => load(docked, { autoplay: true })}
                className="px-2 py-0.5 border border-border text-text hover:bg-surface"
              >
                ▶ Play this concert here
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="p-4 flex flex-col gap-3 min-h-0 overflow-y-auto">
        <div className="flex items-center gap-2">
          <h2 className="text-xs uppercase text-muted mr-auto">Pieces</h2>
          <PlayModeToggle />
          <button
            type="button"
            onClick={() => setAdded((a) => [...a, (a.at(-1) ?? 0) + 1])}
            className="text-sm px-2 py-0.5 border border-border hover:bg-surface"
          >
            + Add piece
          </button>
        </div>
        {pieces.length === 0 && added.length === 0 && (
          <p className="text-sm text-muted">
            No pieces yet. Play the video and add each piece where it starts.
          </p>
        )}
        <ul className="flex flex-col">
          {ordered.map((p) => {
            const end = ends[p.id];
            const playing =
              now !== null &&
              now >= (p.startSeconds ?? 0) &&
              (end === null || now < end);
            return (
              <PieceRow
                key={p.id}
                videoId={videoId}
                piece={p}
                endHint={time(end)}
                playing={playing}
                position={position}
                onPlay={playAt}
                onSaved={() => router.refresh()}
              />
            );
          })}
          {added.map((n) => (
            <PieceRow
              key={`new-${n}`}
              videoId={videoId}
              prefill={{
                start: time(position()),
                performer: last?.performer ?? "",
                year: last?.year ? String(last.year) : "",
              }}
              endHint=""
              playing={false}
              position={position}
              onPlay={playAt}
              onSaved={() => {
                setAdded((a) => a.filter((x) => x !== n));
                router.refresh();
              }}
              onRemove={() => setAdded((a) => a.filter((x) => x !== n))}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

/** One piece of the video: its span, work, performer and year. */
function PieceRow({
  videoId,
  piece,
  prefill,
  endHint,
  playing,
  position,
  onPlay,
  onSaved,
  onRemove,
}: {
  videoId: string;
  /** A saved piece; without one, a new piece. */
  piece?: ConcertPiece;
  prefill?: { start: string; performer: string; year: string };
  /** Where it ends without an end of its own (the next piece's start). */
  endHint: string;
  playing: boolean;
  /** The video's position, if it is loaded here. */
  position: () => number | null;
  onPlay: (seconds: number) => void;
  onSaved: () => void;
  onRemove?: () => void;
}) {
  const [start, setStart] = useState(
    piece ? time(piece.startSeconds) : (prefill?.start ?? ""),
  );
  const [end, setEnd] = useState(time(piece?.endSeconds));
  const [performer, setPerformer] = useState(
    piece?.performer ?? prefill?.performer ?? "",
  );
  const [year, setYear] = useState(
    piece ? (piece.year ? String(piece.year) : "") : (prefill?.year ?? ""),
  );
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // One movement of its work, rather than the whole work.
  const excerpt = piece ? piece.movementId : (picked?.movementId ?? null);
  const label = piece
    ? pieceLabel(piece.composer.name, piece.work, excerpt)
    : picked && pieceLabel(picked.work.composer, picked.work, excerpt);
  const nowInto = (set: (t: string) => void) => () => {
    const seconds = position();
    if (seconds !== null) set(formatTimestamp(seconds));
  };

  async function save() {
    const seconds = (text: string) =>
      text.trim() === "" ? null : parseTimestamp(text);
    const startSeconds = seconds(start);
    const endSeconds = seconds(end);
    if (
      (start.trim() && startSeconds === null) ||
      (end.trim() && endSeconds === null)
    ) {
      setError("Write the start and end as m:ss, e.g. 12:34");
      return;
    }
    if (!piece && !picked) {
      setError("Pick the piece's work");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch(
      piece ? `/api/recordings/${piece.id}` : "/api/recordings",
      {
        method: piece ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(piece ? {} : { workId: picked!.work.id }),
          performer,
          year,
          mediaType: "youtube",
          mediaUrl: piece?.mediaUrl ?? `https://youtu.be/${videoId}`,
          startSeconds,
          endSeconds,
          // A movement starts where the piece does.
          ...(excerpt && {
            movementId: excerpt,
            movementStarts: { [excerpt]: startSeconds ?? 0 },
          }),
        }),
      },
    ).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      setError(
        (await res?.json().catch(() => null))?.error ?? "Failed to save",
      );
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!piece || !confirm(`Delete this piece (${label})?`)) return;
    const res = await fetch(`/api/recordings/${piece.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (res?.ok) onSaved();
    else setError("Failed to delete");
  }

  const startSeconds = parseTimestamp(start);
  return (
    <li className="flex flex-col gap-1 py-2 border-b border-border last:border-0 text-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Play from ${start || "0:00"}`}
          disabled={start.trim() !== "" && startSeconds === null}
          onClick={() => onPlay(startSeconds ?? 0)}
          className={`w-6 h-6 shrink-0 rounded-sm hover:bg-surface text-xs ${
            playing ? "text-accent" : ""
          }`}
        >
          ▶
        </button>
        {piece ? (
          <Link
            href={`/composer/${piece.composer.slug}/${piece.work.slug}?recording=${piece.slug}`}
            className={`flex-1 truncate hover:underline ${
              playing ? "text-accent font-medium" : ""
            }`}
          >
            {label}
          </Link>
        ) : picked ? (
          <span className="flex-1 truncate">
            {label}{" "}
            <button
              type="button"
              onClick={() => setPicked(null)}
              className={small}
            >
              change
            </button>
          </span>
        ) : (
          <WorkPicker onPick={setPicked} />
        )}
        {piece ? (
          <button
            type="button"
            aria-label="Delete this piece"
            onClick={remove}
            className={small}
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            aria-label="Remove this piece"
            onClick={onRemove}
            className={small}
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-8">
        <input
          aria-label="Start"
          placeholder="0:00"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={`${input} w-20`}
        />
        <button type="button" onClick={nowInto(setStart)} className={small}>
          Now
        </button>
        <span className="text-muted">–</span>
        <input
          aria-label="End"
          placeholder={endHint || "end"}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className={`${input} w-20`}
        />
        <button type="button" onClick={nowInto(setEnd)} className={small}>
          Now
        </button>
        <PerformerInput
          value={performer}
          onChange={setPerformer}
          className="flex-1 min-w-32"
        />
        <input
          placeholder="Year"
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={`${input} w-16`}
        />
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="px-2 py-0.5 border border-border hover:bg-surface disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {error && <p className="pl-8 text-muted">{error}</p>}
    </li>
  );
}

/**
 * Searches every composer's works; picking one, or one of its movements,
 * sets the piece. A composer named in the search but not in the library
 * yet can be imported right here (from Open Opus), then searched again.
 */
function WorkPicker({ onPick }: { onPick: (picked: Picked) => void }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{
    works: FoundWork[];
    composers: { openOpusId: number; name: string }[];
  }>({ works: [], composers: [] });
  const [importing, setImporting] = useState<string | null>(null);
  // Raised to search again after an import.
  const [imports, setImports] = useState(0);
  useEffect(() => {
    if (!query.trim()) return;
    let stale = false;
    fetch(`/api/works/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((answer) => !stale && setFound(answer))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [query, imports]);

  async function handleImport(composer: { openOpusId: number; name: string }) {
    setImporting(`Importing ${composer.name}…`);
    const failed = await runImport(composer.openOpusId, (message) => {
      if (message.type === "progress") {
        setImporting(
          `Importing ${composer.name}: movements ${message.done} / ${message.total}…`,
        );
      }
    });
    setImporting(failed);
    setImports((n) => n + 1);
  }

  const option = "block w-full text-left px-2 py-1 hover:bg-surface truncate";
  const open =
    query.trim() !== "" &&
    (found.works.length > 0 || found.composers.length > 0 || importing);
  return (
    <div className="flex-1 relative">
      <input
        type="search"
        placeholder="Search works"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${input} w-full`}
      />
      {open && (
        <div className="absolute z-10 inset-x-0 top-full bg-bg border border-border max-h-72 overflow-y-auto">
          {found.works.map((w) => (
            <div key={w.id}>
              <button
                type="button"
                onClick={() => onPick({ work: w, movementId: null })}
                className={option}
              >
                {pieceLabel(w.composer, w)}
              </button>
              {w.movements.length > 1 &&
                w.movements.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-label={pieceLabel(w.composer, w, m.id)}
                    onClick={() => onPick({ work: w, movementId: m.id })}
                    className={`${option} pl-6 text-muted hover:text-text`}
                  >
                    {movementLabel(m, i)}
                  </button>
                ))}
            </div>
          ))}
          {importing ? (
            <p className="px-2 py-1 text-muted">{importing}</p>
          ) : (
            found.composers.map((c) => (
              <button
                key={c.openOpusId}
                type="button"
                onClick={() => handleImport(c)}
                className={`${option} text-muted hover:text-text`}
              >
                Import {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
