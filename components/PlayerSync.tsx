"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode,
} from "react";
import type { WorkMovement } from "@/lib/movements";

export type SyncSource = "score" | "recording";

// "link": chosen outside the panes (the works list, the title bar's
// movement dropdown); both panes follow.
type Source = SyncSource | "link";

type Request = { movementId: string; source: Source; seq: number };

type Sync = {
  /** The work's movements, shared by the score and recording panes. */
  movements: WorkMovement[];
  request: Request | null;
  /** The movement being looked at or listened to, as far as known. */
  current: string | null;
  /** Announce that `source` moved to a movement; the other pane follows. */
  select: (movementId: string, source: Source) => void;
  /** A pane reached a movement on its own (e.g. a page turn); nobody follows. */
  report: (movementId: string | null) => void;
};

const SyncContext = createContext<Sync | null>(null);

/** Links the score and recording panes of a work by movement. */
export default function PlayerSync({
  movements,
  initialMovement,
  children,
}: {
  movements: WorkMovement[];
  /** Movement to open at, e.g. from `?movement=` on the work page. */
  initialMovement?: string;
  children: ReactNode;
}) {
  const [request, setRequest] = useState<Request | null>(() =>
    initialMovement
      ? { movementId: initialMovement, source: "link", seq: 1 }
      : null,
  );
  const [current, setCurrent] = useState<string | null>(
    initialMovement ?? null,
  );
  const select = useCallback((movementId: string, source: Source) => {
    setRequest((r) => ({ movementId, source, seq: (r?.seq ?? 0) + 1 }));
    setCurrent(movementId);
  }, []);
  return (
    <SyncContext
      value={{ movements, request, current, select, report: setCurrent }}
    >
      {children}
    </SyncContext>
  );
}

export function usePlayerSync(): Sync {
  const sync = use(SyncContext);
  if (!sync) throw new Error("usePlayerSync must be used within PlayerSync");
  return sync;
}

/** Calls `onRequest` whenever the *other* pane moves to a movement. */
export function useMovementRequests(
  source: SyncSource,
  onRequest: (movementId: string) => void,
) {
  const { request } = usePlayerSync();
  const handle = useEffectEvent(onRequest);
  useEffect(() => {
    if (request && request.source !== source) handle(request.movementId);
  }, [request, source]);
}
