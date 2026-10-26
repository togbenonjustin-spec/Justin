"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { formatFCFA } from "@/lib/utils";

interface AnimatedAmountProps {
  value: number;
  isPercent?: boolean;
  className?: string;
  durationMs?: number;
}

export function AnimatedAmount({
  value,
  isPercent = false,
  className = "",
  durationMs = 850,
}: AnimatedAmountProps) {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState<number>(
    prefersReducedMotion ? value : 0
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs, prefersReducedMotion]);

  return (
    <span className={`tabular-nums ${className}`}>
      {isPercent ? `${display} %` : formatFCFA(display)}
    </span>
  );
}
