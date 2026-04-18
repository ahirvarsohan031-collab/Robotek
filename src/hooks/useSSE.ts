'use client';

import { useEffect, useRef, useCallback } from 'react';

type UseSSEOptions = {
  /** Module names to watch: 'delegations' | 'tickets' | 'ims' | 'i2r' | 'party-management' | 'checklists' */
  modules: string[];
  /** Called with the list of modules that changed. Trigger your SWR mutate() here. */
  onUpdate: (changedModules: string[]) => void;
  /** Set false to disable SSE (e.g. for unauthenticated pages) */
  enabled?: boolean;
};

/**
 * useSSE — Server-Sent Events hook for real-time data change detection.
 *
 * How it works:
 * - Connects to /api/events with the last known row counts per module
 * - Server reads only the ID column (1 column) for each module and detects count changes
 * - If a module's row count changed → onUpdate() is called → you call mutate() to refetch
 * - If nothing changed → tiny heartbeat response (~100 bytes), no full data fetch
 * - Connection closes after each check (Lambda-safe), auto-reconnects after 30s
 *
 * Detects: new records added, records deleted.
 * Does NOT detect: field-level updates (e.g. status changes by other users).
 * For those, the 5-minute SWR refreshInterval acts as a fallback.
 */
export function useSSE({ modules, onUpdate, enabled = true }: UseSSEOptions) {
  const countsRef = useRef<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(false);
  // Use ref for onUpdate to avoid re-creating connect() on every render
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    if (!isMountedRef.current || typeof window === 'undefined' || !enabled) return;

    // Clean up any existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const params = new URLSearchParams({
      modules: modules.join(','),
      counts: JSON.stringify(countsRef.current),
    });

    const es = new EventSource(`/api/events?${params}`);
    esRef.current = es;

    // Server detected row count change in one or more modules
    es.addEventListener('change', (e: MessageEvent) => {
      try {
        const data: { modules: string[]; counts: Record<string, number> } = JSON.parse(e.data);
        if (data.counts) {
          countsRef.current = { ...countsRef.current, ...data.counts };
        }
        if (data.modules?.length > 0) {
          onUpdateRef.current(data.modules);
        }
      } catch {
        // ignore parse errors
      }
    });

    // No changes — update our stored counts so next check has a baseline
    es.addEventListener('heartbeat', (e: MessageEvent) => {
      try {
        const data: { counts: Record<string, number> } = JSON.parse(e.data);
        if (data.counts) {
          countsRef.current = { ...countsRef.current, ...data.counts };
        }
      } catch {
        // ignore parse errors
      }
    });

    // onerror fires when server closes the stream (normal) or network error
    // We close and manually reconnect so we can pass updated counts in the URL
    es.onerror = () => {
      if (esRef.current === es) {
        es.close();
        esRef.current = null;
        if (isMountedRef.current) {
          timerRef.current = setTimeout(connect, 30000); // reconnect after 30s
        }
      }
    };
  }, [modules, enabled]); // modules array identity matters — use stable refs in callers

  useEffect(() => {
    if (!enabled) return;
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [connect, enabled]);
}
