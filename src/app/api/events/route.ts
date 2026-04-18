export const dynamic = 'force-dynamic';

import { delegationService } from '@/lib/delegation-sheets';
import { ticketService } from '@/lib/ticket-sheets';
import { imsService } from '@/lib/ims-sheets';
import { i2rService } from '@/lib/i2r-sheets';
import { partyManagementService } from '@/lib/party-management-sheets';
import { checklistService } from '@/lib/checklist-sheets';

// Map module names to their sheet services (all extend BaseSheetsService)
const SERVICES: Record<string, { getLatestIds: () => Promise<(string | number)[]> }> = {
  delegations: delegationService,
  tickets: ticketService,
  ims: imsService,
  i2r: i2rService,
  'party-management': partyManagementService,
  checklists: checklistService,
};

/**
 * SSE endpoint — Lambda-safe design:
 * 1. Client connects with ?modules=...&counts={...} (last known row counts)
 * 2. Server reads only the ID column for each module (fast, 1 column per sheet)
 * 3. Compares counts — if different, sends a "change" event; else sends "heartbeat"
 * 4. Closes the stream immediately (Lambda-safe — no long-lived connections)
 * 5. Client's onerror handler reconnects after 30s with updated counts
 *
 * Data savings: on unchanged data, response is ~100 bytes instead of 300KB.
 * Full data is only fetched by the client when a "change" event is received.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modulesParam = searchParams.get('modules') || '';
  const countsParam = searchParams.get('counts') || '{}';

  const requestedModules = modulesParam.split(',').filter((m) => m in SERVICES);
  let lastCounts: Record<string, number> = {};
  try {
    lastCounts = JSON.parse(countsParam);
  } catch {
    lastCounts = {};
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Read only the ID column for each module — runs in parallel
        const results = await Promise.all(
          requestedModules.map(async (mod) => {
            try {
              const ids = await SERVICES[mod].getLatestIds();
              return { mod, count: ids.length };
            } catch {
              return { mod, count: lastCounts[mod] ?? 0 };
            }
          })
        );

        const newCounts: Record<string, number> = {};
        const changed: string[] = [];

        for (const { mod, count } of results) {
          newCounts[mod] = count;
          // Only flag as changed if we had a previous count to compare against
          if (mod in lastCounts && lastCounts[mod] !== count) {
            changed.push(mod);
          }
        }

        const eventType = changed.length > 0 ? 'change' : 'heartbeat';
        const payload = JSON.stringify({ modules: changed, counts: newCounts });
        // retry:30000 tells EventSource to wait 30s before auto-reconnecting,
        // but we manually reconnect (to update counts in URL), so this is a fallback.
        controller.enqueue(
          encoder.encode(`retry: 30000\nevent: ${eventType}\ndata: ${payload}\n\n`)
        );
      } catch {
        controller.enqueue(
          encoder.encode(`retry: 30000\nevent: heartbeat\ndata: {"modules":[],"counts":{}}\n\n`)
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
