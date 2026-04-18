export const dynamic = 'force-dynamic';

import { delegationService } from '@/lib/delegation-sheets';
import { ticketService } from '@/lib/ticket-sheets';
import { imsService } from '@/lib/ims-sheets';
import { i2rService } from '@/lib/i2r-sheets';
import { partyManagementService } from '@/lib/party-management-sheets';
import { checklistService } from '@/lib/checklist-sheets';

// Map module names to their sheet services (all extend BaseSheetsService)
const SERVICES: Record<string, {
  getLatestIds: () => Promise<(string | number)[]>;
  getLastModified: () => Promise<number>;
}> = {
  delegations: delegationService,
  tickets: ticketService,
  ims: imsService,
  i2r: i2rService,
  'party-management': partyManagementService,
  checklists: checklistService,
};

/**
 * SSE endpoint — Lambda-safe design:
 * 1. Client connects with ?modules=...&counts={...}&timestamps={...}
 *    (last known row counts AND last-modified timestamps per module)
 * 2. Server reads the ID column (for count) AND the meta cell (last-modified timestamp)
 * 3. If EITHER the row count OR the timestamp changed → sends a "change" event
 *    This means field-level edits (status changes, date updates) are now detected!
 * 4. Closes the stream immediately (Lambda-safe — no long-lived connections)
 * 5. Client's onerror handler reconnects after 15s with updated state
 *
 * Data savings: on unchanged data, response is ~100 bytes instead of 300KB.
 * Full data is only fetched by the client when a "change" event is received.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modulesParam = searchParams.get('modules') || '';
  const countsParam = searchParams.get('counts') || '{}';
  const timestampsParam = searchParams.get('timestamps') || '{}';

  const requestedModules = modulesParam.split(',').filter((m) => m in SERVICES);
  let lastCounts: Record<string, number> = {};
  let lastTimestamps: Record<string, number> = {};
  try { lastCounts = JSON.parse(countsParam); } catch { lastCounts = {}; }
  try { lastTimestamps = JSON.parse(timestampsParam); } catch { lastTimestamps = {}; }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Read ID column + last-modified timestamp for each module in parallel
        const results = await Promise.all(
          requestedModules.map(async (mod) => {
            try {
              const [ids, lastModified] = await Promise.all([
                SERVICES[mod].getLatestIds(),
                SERVICES[mod].getLastModified(),
              ]);
              return { mod, count: ids.length, lastModified };
            } catch {
              return {
                mod,
                count: lastCounts[mod] ?? 0,
                lastModified: lastTimestamps[mod] ?? 0,
              };
            }
          })
        );

        const newCounts: Record<string, number> = {};
        const newTimestamps: Record<string, number> = {};
        const changed: string[] = [];

        for (const { mod, count, lastModified } of results) {
          newCounts[mod] = count;
          newTimestamps[mod] = lastModified;

          // Detect row-count change (add / delete)
          const countChanged = mod in lastCounts && lastCounts[mod] !== count;
          // Detect field-level edit via timestamp change (update)
          const timestampChanged =
            lastModified > 0 &&
            mod in lastTimestamps &&
            lastTimestamps[mod] !== lastModified;

          if (countChanged || timestampChanged) {
            changed.push(mod);
          }
        }

        const eventType = changed.length > 0 ? 'change' : 'heartbeat';
        const payload = JSON.stringify({
          modules: changed,
          counts: newCounts,
          timestamps: newTimestamps,
        });

        // retry:15000 → client auto-reconnects after 15s if our manual reconnect fails
        controller.enqueue(
          encoder.encode(`retry: 15000\nevent: ${eventType}\ndata: ${payload}\n\n`)
        );
      } catch {
        controller.enqueue(
          encoder.encode(
            `retry: 15000\nevent: heartbeat\ndata: {"modules":[],"counts":{},"timestamps":{}}\n\n`
          )
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // Disable nginx buffering on Amplify
    },
  });
}
