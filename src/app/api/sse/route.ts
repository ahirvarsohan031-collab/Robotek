import { NextRequest, NextResponse } from "next/server";

// Dynamic map to store active stream controllers
const clients = new Set<ReadableStreamDefaultController>();

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      
      // Send initial keep-alive
      const heartbeat = `data: ${JSON.stringify({ type: 'HEARTBEAT' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(heartbeat));

      req.signal.onabort = () => {
        clients.delete(controller);
      };
    },
    cancel() {
      // Clean up on stream cancellation
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Broadcasts a change event to all connected clients.
 * This is used by Sheet Services to notify the frontend about updates.
 */
export function broadcast(payload: { module: string; action: string; data: any }) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  const encodedMessage = new TextEncoder().encode(message);

  clients.forEach((client) => {
    try {
      client.enqueue(encodedMessage);
    } catch (e) {
      // Client probably disconnected
      clients.delete(client);
    }
  });
  
  console.log(`[SSE] Broadcasted ${payload.action} for ${payload.module}`);
}
