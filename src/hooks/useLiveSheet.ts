"use client";

import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

interface LiveOptions<T> {
  module: string;
  fetcher: () => Promise<T[]>;
}

export function useLiveSheet<T extends { id: string | number }>(options: LiveOptions<T>) {
  const { module, fetcher } = options;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(module, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Only process changes for this module
        if (payload.module === module) {
          console.log(`[SSE] Received update for ${module}:`, payload.action);
          
          // Granular update: Update the SWR cache locally without a full refetch
          mutate(module, (currentData: T[] | undefined) => {
            if (!currentData) return currentData;

            if (payload.action === 'UPDATE') {
              return currentData.map(item => 
                item.id === payload.data.id ? payload.data : item
              );
            } else if (payload.action === 'ADD') {
              // Avoid duplicates
              if (currentData.some(item => item.id === payload.data.id)) return currentData;
              return [payload.data, ...currentData];
            } else if (payload.action === 'DELETE') {
              return currentData.filter(item => item.id !== payload.data.id);
            }
            return currentData;
          }, false); // Set 'revalidate' to false to avoid immediate refetch
        }
      } catch (err) {
        console.error("[SSE] Error parsing message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [module, mutate]);

  return { data, error, isLoading };
}
