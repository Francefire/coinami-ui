"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, X } from "lucide-react";

interface VisualizationToggleProps {
  children: React.ReactNode;
  label?: string;
}

export default function VisualizationToggle({
  children,
  label = "Show How It Works",
}: VisualizationToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-primary/80 hover:text-primary transition-colors self-start group"
      >
        {open ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <GraduationCap className="h-3.5 w-3.5" />
        )}
        <span className="group-hover:underline underline-offset-2">
          {open ? "Hide Visualization" : label}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
