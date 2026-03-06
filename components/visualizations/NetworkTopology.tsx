"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NetworkTopologyProps {
  peers: string[];
  event?: "broadcast" | "sync" | "mine" | "idle";
  className?: string;
}

const NODE_RADIUS = 20;
const PEER_RADIUS = 14;
const CENTER_X = 160;
const CENTER_Y = 120;
const ORBIT_RADIUS = 80;
const SVG_W = 320;
const SVG_H = 240;

function peerPosition(index: number, total: number) {
  const angle = (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2;
  return {
    x: CENTER_X + ORBIT_RADIUS * Math.cos(angle),
    y: CENTER_Y + ORBIT_RADIUS * Math.sin(angle),
  };
}

function extractLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.port ? `:${u.port}` : u.hostname.slice(0, 10);
  } catch {
    return url.slice(0, 10);
  }
}

/** Animated packet dot that travels between two points */
function Packet({
  x1,
  y1,
  x2,
  y2,
  delay,
  color,
  reverse,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  color: string;
  reverse?: boolean;
}) {
  const fromX = reverse ? x2 : x1;
  const fromY = reverse ? y2 : y1;
  const toX = reverse ? x1 : x2;
  const toY = reverse ? y1 : y2;

  return (
    <motion.circle
      cx={fromX}
      cy={fromY}
      r={3}
      fill={color}
      initial={{ cx: fromX, cy: fromY, opacity: 0 }}
      animate={{
        cx: [fromX, toX],
        cy: [fromY, toY],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1,
        delay,
        repeat: Infinity,
        repeatDelay: 1.5,
        ease: "easeInOut",
      }}
    >
      <animate
        attributeName="r"
        values="2;4;2"
        dur="1s"
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
    </motion.circle>
  );
}

export default function NetworkTopology({
  peers,
  event = "idle",
  className = "",
}: NetworkTopologyProps) {
  const peerPositions = useMemo(
    () => peers.map((_, i) => peerPosition(i, peers.length)),
    [peers]
  );

  const eventColor = useMemo(() => {
    switch (event) {
      case "broadcast":
        return "oklch(0.75 0.15 196)";
      case "sync":
        return "oklch(0.7 0.18 155)";
      case "mine":
        return "oklch(0.8 0.15 90)";
      default:
        return "oklch(0.75 0.15 196)";
    }
  }, [event]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          P2P Network Topology
        </span>
        <AnimatePresence mode="wait">
          {event !== "idle" && (
            <motion.span
              key={event}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`text-[10px] font-medium ${
                event === "broadcast"
                  ? "text-primary"
                  : event === "sync"
                  ? "text-emerald-400"
                  : "text-yellow-400"
              }`}
            >
              {event === "broadcast" && "Broadcasting TX →"}
              {event === "sync" && "← Syncing Chain"}
              {event === "mine" && "Broadcasting Block →"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full max-w-sm mx-auto"
        style={{ maxHeight: 220 }}
      >
        {/* Connection lines */}
        {peerPositions.map((pos, i) => (
          <g key={`line-${i}`}>
            {/* Dashed line */}
            <line
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={pos.x}
              y2={pos.y}
              stroke="oklch(1 0 0 / 0.08)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            >
              {event !== "idle" && (
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to={event === "sync" ? "14" : "-14"}
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              )}
            </line>

            {/* Animated packets */}
            {event === "broadcast" && (
              <Packet
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={pos.x}
                y2={pos.y}
                delay={i * 0.2}
                color={eventColor}
              />
            )}
            {event === "mine" && (
              <Packet
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={pos.x}
                y2={pos.y}
                delay={i * 0.15}
                color={eventColor}
              />
            )}
            {event === "sync" && i === 0 && (
              <Packet
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={pos.x}
                y2={pos.y}
                delay={0}
                color={eventColor}
                reverse
              />
            )}
          </g>
        ))}

        {/* Center node (user) */}
        <motion.circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={NODE_RADIUS}
          fill="oklch(0.75 0.15 196 / 0.15)"
          stroke="oklch(0.75 0.15 196)"
          strokeWidth={2}
          animate={
            event !== "idle"
              ? {
                  r: [NODE_RADIUS, NODE_RADIUS + 3, NODE_RADIUS],
                  strokeOpacity: [1, 0.5, 1],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: event !== "idle" ? Infinity : 0 }}
        />
        <text
          x={CENTER_X}
          y={CENTER_Y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[9px] font-bold fill-primary"
        >
          YOU
        </text>

        {/* Outer glow for active events */}
        {event !== "idle" && (
          <motion.circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={NODE_RADIUS + 6}
            fill="transparent"
            stroke={eventColor}
            strokeWidth={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0], r: [NODE_RADIUS + 4, NODE_RADIUS + 12, NODE_RADIUS + 4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Peer nodes */}
        {peerPositions.map((pos, i) => (
          <g key={`peer-${i}`}>
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={PEER_RADIUS}
              fill="oklch(1 0 0 / 0.05)"
              stroke="oklch(1 0 0 / 0.3)"
              strokeWidth={1.5}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, type: "spring" }}
            />
            {/* Green live indicator */}
            <circle
              cx={pos.x + PEER_RADIUS - 3}
              cy={pos.y - PEER_RADIUS + 3}
              r={3}
              fill="oklch(0.7 0.18 155)"
            />
            <text
              x={pos.x}
              y={pos.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[7px] fill-foreground/60 font-mono"
            >
              {extractLabel(peers[i])}
            </text>
          </g>
        ))}

        {/* No peers message */}
        {peers.length === 0 && (
          <text
            x={CENTER_X}
            y={CENTER_Y + 45}
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground"
          >
            No peers connected
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Your node</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border border-foreground/30" />
          <span>Peer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Online</span>
        </div>
      </div>
    </div>
  );
}
