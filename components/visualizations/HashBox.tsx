"use client";

import { motion, AnimatePresence } from "framer-motion";

interface HashBoxProps {
  input: string;
  output: string;
  active: boolean;
  label?: string;
  className?: string;
}

export default function HashBox({
  input,
  output,
  active,
  label = "SHA-256",
  className = "",
}: HashBoxProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Input value */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-mono text-muted-foreground bg-background/80 border border-border rounded px-2 py-1 max-w-full truncate"
          >
            {input.length > 40 ? input.slice(0, 40) + "…" : input}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hash processor box */}
      <motion.div
        animate={
          active
            ? {
                boxShadow: [
                  "0 0 0px 0px oklch(0.75 0.15 196 / 0)",
                  "0 0 16px 4px oklch(0.75 0.15 196 / 0.3)",
                  "0 0 0px 0px oklch(0.75 0.15 196 / 0)",
                ],
              }
            : {}
        }
        transition={{ duration: 1.5, repeat: active ? Infinity : 0 }}
        className="relative flex items-center justify-center rounded-lg border-2 border-primary/50 bg-primary/5 px-4 py-2"
      >
        <span className="text-xs font-bold text-primary tracking-wider">
          {label}
        </span>

        {/* Shimmer overlay */}
        {active && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, oklch(0.75 0.15 196 / 0.08) 50%, transparent 100%)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>

      {/* Output value */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-[10px] font-mono text-primary bg-primary/5 border border-primary/30 rounded px-2 py-1 max-w-full truncate"
          >
            {output.length > 40 ? output.slice(0, 40) + "…" : output}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
