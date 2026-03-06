"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EscrowEntry } from "@/lib/api";

interface EscrowStateMachineProps {
  entry?: EscrowEntry;
  className?: string;
}

type EscrowState = "created" | "locked" | "released" | "refunded";

interface StateNode {
  id: EscrowState;
  label: string;
  x: number;
  y: number;
  color: string;
  bgColor: string;
  description: string;
}

const STATES: StateNode[] = [
  {
    id: "created",
    label: "Created",
    x: 50,
    y: 60,
    color: "oklch(0.75 0.15 196)",
    bgColor: "oklch(0.75 0.15 196 / 0.12)",
    description: "Sender signs a create_escrow transaction",
  },
  {
    id: "locked",
    label: "Locked",
    x: 180,
    y: 60,
    color: "oklch(0.8 0.15 90)",
    bgColor: "oklch(0.8 0.15 90 / 0.12)",
    description: "Funds deducted from sender, held in escrow",
  },
  {
    id: "released",
    label: "Released",
    x: 310,
    y: 30,
    color: "oklch(0.7 0.18 155)",
    bgColor: "oklch(0.7 0.18 155 / 0.12)",
    description: "Receiver claims funds → transferred to receiver",
  },
  {
    id: "refunded",
    label: "Refunded",
    x: 310,
    y: 90,
    color: "oklch(0.6 0.05 0)",
    bgColor: "oklch(0.6 0.05 0 / 0.12)",
    description: "Sender cancels → funds returned to sender",
  },
];

interface Transition {
  from: EscrowState;
  to: EscrowState;
  label: string;
  actor: string;
}

const TRANSITIONS: Transition[] = [
  { from: "created", to: "locked", label: "Mine block", actor: "Network" },
  { from: "locked", to: "released", label: "release_escrow", actor: "Receiver" },
  { from: "locked", to: "refunded", label: "cancel_escrow", actor: "Sender" },
];

function stateIndex(status: EscrowEntry["status"]): number {
  switch (status) {
    case "locked":
      return 1;
    case "released":
      return 2;
    case "refunded":
      return 3;
    default:
      return 0;
  }
}

function isTransitionActive(
  t: Transition,
  currentState: EscrowState | null
): "past" | "active" | "future" {
  if (!currentState) return "future";
  const idx = STATES.findIndex((s) => s.id === currentState);
  const fromIdx = STATES.findIndex((s) => s.id === t.from);
  const toIdx = STATES.findIndex((s) => s.id === t.to);

  if (idx >= toIdx) return "past";
  if (idx >= fromIdx) return "active";
  return "future";
}

function CoinAnimation({
  fromX,
  fromY,
  toX,
  toY,
  active,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  active: boolean;
}) {
  if (!active) return null;
  return (
    <>
      {[0, 0.5, 1].map((delay) => (
        <motion.circle
          key={delay}
          r={3}
          fill="oklch(0.8 0.15 90)"
          initial={{ cx: fromX, cy: fromY, opacity: 0 }}
          animate={{
            cx: [fromX, toX],
            cy: [fromY, toY],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.2,
            delay,
            repeat: Infinity,
            repeatDelay: 1.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

export default function EscrowStateMachine({
  entry,
  className = "",
}: EscrowStateMachineProps) {
  const currentState: EscrowState | null = entry
    ? entry.status
    : null;

  const activeIndex = entry ? stateIndex(entry.status) : -1;

  const stateDescriptions = useMemo(() => {
    const descs: string[] = [];
    if (entry) {
      descs.push(
        `${entry.amount} COIN held between ${entry.sender.slice(0, 8)}… → ${entry.receiver.slice(0, 8)}…`
      );
      if (entry.status === "locked")
        descs.push("Waiting for receiver to release or sender to cancel");
      else if (entry.status === "released")
        descs.push("Funds successfully transferred to receiver");
      else if (entry.status === "refunded")
        descs.push("Funds returned to original sender");
    }
    return descs;
  }, [entry]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Escrow State Machine
      </span>

      <svg viewBox="0 0 370 120" className="w-full" style={{ maxHeight: 140 }}>
        {/* Transition arrows */}
        {TRANSITIONS.map((t) => {
          const from = STATES.find((s) => s.id === t.from)!;
          const to = STATES.find((s) => s.id === t.to)!;
          const status = isTransitionActive(t, currentState);
          const isPast = status === "past";
          const isActive = status === "active";

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / len;
          const ny = dy / len;
          const x1 = from.x + nx * 36;
          const y1 = from.y + ny * 12;
          const x2 = to.x - nx * 36;
          const y2 = to.y - ny * 12;

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2 - 8;

          return (
            <g key={`${t.from}-${t.to}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  isPast
                    ? "oklch(1 0 0 / 0.25)"
                    : isActive
                    ? "oklch(1 0 0 / 0.2)"
                    : "oklch(1 0 0 / 0.08)"
                }
                strokeWidth={isActive ? 2 : 1.5}
                strokeDasharray={isActive ? "6 3" : undefined}
                markerEnd="url(#arrow)"
              >
                {isActive && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-18"
                    dur="0.6s"
                    repeatCount="indefinite"
                  />
                )}
              </line>

              {/* Label */}
              <text
                x={midX}
                y={midY}
                textAnchor="middle"
                className="text-[6px] fill-muted-foreground"
              >
                {t.label}
              </text>
              <text
                x={midX}
                y={midY + 8}
                textAnchor="middle"
                className="text-[5px] fill-muted-foreground/60"
              >
                by {t.actor}
              </text>

              {/* Coin animation on active transition */}
              <CoinAnimation
                fromX={x1}
                fromY={y1}
                toX={x2}
                toY={y2}
                active={isActive}
              />
            </g>
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(1 0 0 / 0.3)" />
          </marker>
        </defs>

        {/* State nodes */}
        {STATES.map((s, i) => {
          const isCurrentOrPast = activeIndex >= i;
          const isCurrent = STATES[activeIndex]?.id === s.id;
          // Skip "created" as current if we're showing a real escrow (they go straight to locked)
          const isReachable =
            s.id === "released" || s.id === "refunded"
              ? currentState === "locked" || currentState === s.id
              : true;

          return (
            <g key={s.id}>
              {/* Glow for current state */}
              {isCurrent && (
                <motion.rect
                  x={s.x - 34}
                  y={s.y - 16}
                  width={68}
                  height={32}
                  rx={10}
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth={1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              <rect
                x={s.x - 30}
                y={s.y - 12}
                width={60}
                height={24}
                rx={8}
                fill={isCurrentOrPast ? s.bgColor : "oklch(0.15 0 0)"}
                stroke={
                  isCurrent
                    ? s.color
                    : isCurrentOrPast
                    ? s.color + "80"
                    : "oklch(1 0 0 / 0.1)"
                }
                strokeWidth={isCurrent ? 2 : 1}
                opacity={isReachable || isCurrentOrPast ? 1 : 0.4}
              />
              <text
                x={s.x}
                y={s.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[8px] font-medium"
                fill={isCurrentOrPast ? s.color : "oklch(1 0 0 / 0.4)"}
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Description below diagram */}
      <AnimatePresence mode="wait">
        {entry ? (
          <motion.div
            key={entry.status}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground space-y-1"
          >
            {stateDescriptions.map((d, i) => (
              <p key={i}>{d}</p>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="generic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground space-y-1"
          >
            <p>
              Escrow locks funds in a smart contract until the receiver releases
              them or the sender cancels.
            </p>
            <p className="flex gap-3 flex-wrap">
              {STATES.map((s) => (
                <span key={s.id} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}: {s.description}
                </span>
              ))}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
