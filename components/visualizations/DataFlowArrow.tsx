"use client";

import { motion } from "framer-motion";

interface DataFlowArrowProps {
  /** "right" | "down" | "left" | "up" */
  direction?: "right" | "down" | "left" | "up";
  active?: boolean;
  color?: string;
  length?: number;
  className?: string;
}

export default function DataFlowArrow({
  direction = "right",
  active = true,
  color = "var(--color-primary)",
  length = 48,
  className = "",
}: DataFlowArrowProps) {
  const isHorizontal = direction === "right" || direction === "left";
  const isReversed = direction === "left" || direction === "up";

  const containerStyle: React.CSSProperties = isHorizontal
    ? { width: length, height: 16 }
    : { width: 16, height: length };

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={containerStyle}
    >
      {/* Track */}
      <div
        className="rounded-full opacity-30"
        style={{
          background: color,
          ...(isHorizontal
            ? { width: "100%", height: 2 }
            : { width: 2, height: "100%" }),
        }}
      />

      {/* Flowing dots */}
      {active && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 5,
                height: 5,
                background: color,
                boxShadow: `0 0 6px 1px ${color}`,
              }}
              animate={
                isHorizontal
                  ? {
                      x: isReversed
                        ? [length / 2, -length / 2]
                        : [-length / 2, length / 2],
                      opacity: [0, 1, 1, 0],
                    }
                  : {
                      y: isReversed
                        ? [length / 2, -length / 2]
                        : [-length / 2, length / 2],
                      opacity: [0, 1, 1, 0],
                    }
              }
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "linear",
              }}
            />
          ))}
        </>
      )}

      {/* Arrowhead */}
      <div
        className="absolute"
        style={{
          ...(direction === "right" && {
            right: 0,
            borderLeft: `6px solid ${color}`,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
          }),
          ...(direction === "left" && {
            left: 0,
            borderRight: `6px solid ${color}`,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
          }),
          ...(direction === "down" && {
            bottom: 0,
            borderTop: `6px solid ${color}`,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
          }),
          ...(direction === "up" && {
            top: 0,
            borderBottom: `6px solid ${color}`,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
          }),
          opacity: 0.7,
        }}
      />
    </div>
  );
}
