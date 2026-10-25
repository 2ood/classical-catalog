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

type Request = { movementId: string; source: SyncSource; seq: number };

type Sync = {
  /** The work's movements, shared by the score and recording panes. */
  movements: WorkMovement[];
  request: Request | null;
  /** Announce that `source` moved to a movement; the other pane follows. */
  select: (movementId: string, source: SyncSource) => void;
};

const SyncContext = createContext<Sync | null>(null);

/** Links the score and recording panes of a work by movement. */
export default function PlayerSync({
  movements,
  children,
}: {
  movements: WorkMovement[];
  children: ReactNode;
}) {
  const [request, setRequest] = useState<Request | null>(null);
  const select = useCallback(
    (movementId: string, source: SyncSource) =>
      setRequest((r) => ({ movementId, source, seq: (r?.seq ?? 0) + 1 })),
    [],
  );
  return (
    <SyncContext value={{ movements, request, select }}>{children}</SyncContext>
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
