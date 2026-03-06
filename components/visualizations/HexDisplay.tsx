"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface HexDisplayProps {
  value: string;
  label?: string;
  animate?: boolean;
  highlightColor?: string;
  truncate?: number;
  className?: string;
}

export default function HexDisplay({
  value,
  label,
  animate = true,
  highlightColor = "var(--color-primary)",
  truncate: truncateAt,
  className = "",
}: HexDisplayProps) {
  const displayed = useMemo(
    () => (truncateAt && value.length > truncateAt ? value.slice(0, truncateAt) + "…" : value),
    [value, truncateAt]
  );

  const chars = useMemo(() => displayed.split(""), [displayed]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <div
        className="font-mono text-xs break-all rounded-md bg-background/80 border border-border px-2 py-1.5 leading-relaxed"
        style={{ color: highlightColor }}
      >
        {animate ? (
          <motion.span
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.008 } },
            }}
          >
            {chars.map((char, i) => (
              <motion.span
                key={`${i}-${char}`}
                variants={{
                  hidden: { opacity: 0, y: 4 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.1 }}
              >
                {char}
              </motion.span>
            ))}
          </motion.span>
        ) : (
          <span>{displayed}</span>
        )}
      </div>
    </div>
  );
}
