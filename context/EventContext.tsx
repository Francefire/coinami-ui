"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createSSEConnection,
  type SSEConnection,
  type SSEEvent,
  type SSEEventType,
} from "@/lib/sse";
import { useWallet } from "./WalletContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Callback = (evt: SSEEvent) => void;

interface EventContextValue {
  /** Most recent SSE event (null until first event arrives) */
  lastEvent: SSEEvent | null;
  /** Rolling buffer of recent events */
  eventHistory: SSEEvent[];
  /** Whether the SSE connection is currently open */
  isSSEConnected: boolean;
  /**
   * Subscribe to one or more event types. Returns an unsubscribe function.
   * Pass `"*"` to subscribe to ALL event types.
   */
  subscribe: (
    types: SSEEventType | SSEEventType[] | "*",
    callback: Callback,
  ) => () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const EventContext = createContext<EventContextValue | null>(null);

const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EventProvider({ children }: { children: React.ReactNode }) {
  const { nodeUrl } = useWallet();
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<SSEEvent[]>([]);
  const [isSSEConnected, setIsSSEConnected] = useState(false);

  // Subscriber registry: Map<eventType | "*", Set<callback>>
  const subsRef = useRef(new Map<string, Set<Callback>>());

  // Stable reference for dispatching to subscribers
  const dispatch = useCallback((evt: SSEEvent) => {
    setLastEvent(evt);
    setEventHistory((prev) => {
      const next = [evt, ...prev];
      return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
    });

    // Notify type-specific subscribers
    const typeSubs = subsRef.current.get(evt.type);
    if (typeSubs) typeSubs.forEach((cb) => cb(evt));

    // Notify wildcard subscribers
    const wildcard = subsRef.current.get("*");
    if (wildcard) wildcard.forEach((cb) => cb(evt));
  }, []);

  // ------ SSE connection lifecycle ------
  const connRef = useRef<SSEConnection | null>(null);

  useEffect(() => {
    if (!nodeUrl) return;

    connRef.current = createSSEConnection(
      nodeUrl,
      dispatch,
      () => setIsSSEConnected(true),
      () => setIsSSEConnected(false),
    );

    return () => {
      connRef.current?.close();
      connRef.current = null;
      setIsSSEConnected(false);
    };
  }, [nodeUrl, dispatch]);

  // ------ subscribe API ------
  const subscribe = useCallback(
    (types: SSEEventType | SSEEventType[] | "*", callback: Callback) => {
      const keys = types === "*" ? ["*"] : Array.isArray(types) ? types : [types];

      for (const key of keys) {
        if (!subsRef.current.has(key)) {
          subsRef.current.set(key, new Set());
        }
        subsRef.current.get(key)!.add(callback);
      }

      // Return unsubscribe
      return () => {
        for (const key of keys) {
          subsRef.current.get(key)?.delete(callback);
        }
      };
    },
    [],
  );

  return (
    <EventContext.Provider
      value={{ lastEvent, eventHistory, isSSEConnected, subscribe }}
    >
      {children}
    </EventContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEvents(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvents must be used inside <EventProvider>");
  return ctx;
}

/**
 * Convenience hook — subscribes to specific SSE event type(s) and invokes
 * the callback. Automatically unsubscribes on unmount.
 */
export function useSSEEvent(
  types: SSEEventType | SSEEventType[] | "*",
  callback: Callback,
) {
  const { subscribe } = useEvents();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    return subscribe(types, (evt) => cbRef.current(evt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, ...(Array.isArray(types) ? types : [types])]);
}
