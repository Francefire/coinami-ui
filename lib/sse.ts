/**
 * SSE (Server-Sent Events) client for the Coinami node's /events endpoint.
 *
 * Provides typed event definitions and a connection wrapper around EventSource.
 */

// ---------------------------------------------------------------------------
// Event types matching backend EventBus emissions
// ---------------------------------------------------------------------------

export type SSEEventType =
  | "tx:received"
  | "tx:validated"
  | "tx:rejected"
  | "tx:broadcast"
  | "block:received"
  | "block:validated"
  | "block:rejected"
  | "block:broadcast"
  | "block:mining_started"
  | "block:mining_completed"
  | "claim:received"
  | "claim:validated"
  | "claim:rejected"
  | "peer:added"
  | "peer:sync_started"
  | "peer:sync_completed"
  | "peer:sync_replaced"
  | "mempool:updated"
  | "state:updated";

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Connection utility
// ---------------------------------------------------------------------------

export interface SSEConnection {
  close: () => void;
}

/**
 * Opens an EventSource to `${nodeUrl}/events` and delivers parsed events
 * to the `onEvent` callback. Returns a handle to close the connection.
 *
 * The browser-native EventSource automatically retries on network errors.
 */
export function createSSEConnection(
  nodeUrl: string,
  onEvent: (evt: SSEEvent) => void,
  onOpen?: () => void,
  onError?: () => void,
): SSEConnection {
  const url = `${nodeUrl}/events`;
  const source = new EventSource(url);

  source.onopen = () => {
    onOpen?.();
  };

  source.onerror = () => {
    onError?.();
  };

  source.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data);
      const evt: SSEEvent = {
        type: parsed.type ?? parsed.event,
        data: parsed.data ?? parsed,
        timestamp: parsed.timestamp ?? Date.now(),
      };
      if (evt.type) {
        onEvent(evt);
      }
    } catch {
      // Ignore malformed messages (e.g. heartbeat pings)
    }
  };

  return {
    close() {
      source.close();
    },
  };
}
