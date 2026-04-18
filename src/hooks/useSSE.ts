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
 * - Connects to /api/events with the last known row counts AND last-modified timestamps
 * - Server reads the ID column (count) AND a meta timestamp cell per module
 * - If EITHER count OR timestamp changed → onUpdate() is called → SWR mutate() refetches
 * - This means field-level edits (status changes, etc.) are detected, not just add/delete
 * - Connection closes after each check (Lambda-safe), auto-reconnects after 15s
 *
 * Detects: new records, deleted records, AND field-level updates (status, dates, etc.)
 */
export function useSSE({ modules, onUpdate, enabled = true }: UseSSEOptions) {
  const countsRef = useRef<Record<string, number>>({});
  const timestampsRef = useRef<Record<string, number>>({});
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
      timestamps: JSON.stringify(timestampsRef.current),
    });

    const es = new EventSource(`/api/events?${params}`);
    esRef.current = es;

    // Server detected a change (row count OR timestamp) in one or more modules
    es.addEventListener('change', (e: MessageEvent) => {
      try {
        const data: {
          modules: string[];
          counts: Record<string, number>;
          timestamps: Record<string, number>;
        } = JSON.parse(e.data);

        if (data.counts) {
          countsRef.current = { ...countsRef.current, ...data.counts };
        }
        if (data.timestamps) {
          timestampsRef.current = { ...timestampsRef.current, ...data.timestamps };
        }
        if (data.modules?.length > 0) {
          onUpdateRef.current(data.modules);
        }
      } catch {
        // ignore parse errors
      }
    });

    // No changes — update our stored counts & timestamps so next check has a baseline
    es.addEventListener('heartbeat', (e: MessageEvent) => {
      try {
        const data: {
          counts: Record<string, number>;
          timestamps: Record<string, number>;
        } = JSON.parse(e.data);

        if (data.counts) {
          countsRef.current = { ...countsRef.current, ...data.counts };
        }
        if (data.timestamps) {
          timestampsRef.current = { ...timestampsRef.current, ...data.timestamps };
        }
      } catch {
        // ignore parse errors
      }
    });

    // onerror fires when server closes the stream (normal) or network error.
    // We close and manually reconnect so we can pass updated state in the URL.
    es.onerror = () => {
      if (esRef.current === es) {
        es.close();
        esRef.current = null;
        if (isMountedRef.current) {
          timerRef.current = setTimeout(connect, 15000); // reconnect every 15s
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
