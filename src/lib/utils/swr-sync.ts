/**
 * Utility to surgically merge incremental updates into a local array.
 */
export function applyIncrementalUpdate<T extends { id: string | number }>(
  current: T[] | undefined | null,
  upserts: T[],
  currentIds: (string | number)[]
): T[] {
  if (!current) return upserts || [];
  
  const next = [...current];
  const currentIdsSet = new Set(currentIds.map(String));

  // 1. Merge Upserts (Update existing or add new)
  if (upserts && upserts.length > 0) {
    upserts.forEach((item) => {
      const idx = next.findIndex((d) => String(d.id) === String(item.id));
      if (idx !== -1) {
        next[idx] = item;
      } else {
        // Only unshift if the ID doesn't exist at all
        next.unshift(item);
      }
    });
  }

  // 2. Filter out Deletions
  return next.filter((item) => currentIdsSet.has(String(item.id)));
}

/**
 * Utility for merging incremental updates into a paginated SWR response object.
 */
export function applyPaginatedIncrementalUpdate<T extends { id: string | number }, P extends { data: T[] }>(
  current: P | undefined | null,
  upserts: T[],
  currentIds: (string | number)[]
): P {
  if (!current?.data) return current as P;
  
  return {
    ...current,
    data: applyIncrementalUpdate(current.data, upserts, currentIds)
  };
}
