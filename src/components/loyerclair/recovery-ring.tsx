"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AnimatedAmount } from "./animated-amount";

interface RecoveryRingProps {
  percentage: number;
  collected: number;
  expected: number;
  paidCount: number;
  totalCount: number;
}

export function RecoveryRing({
  percentage,
  paidCount,
  totalCount,
}: RecoveryRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const circumference = 2 * Math.PI * 34; // 213.628
  const targetOffset =
    circumference * (1 - Math.min(100, Math.max(0, percentage)) / 100);

  const [offset, setOffset] = useState<number>(
    prefersReducedMotion ? targetOffset : circumference
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setOffset(targetOffset);
      return;
    }
    const timer = requestAnimationFrame(() => {
      setOffset(targetOffset);
    });
    return () => cancelAnimationFrame(timer);
  }, [targetOffset, prefersReducedMotion]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[84px] w-[84px] shrink-0">
        <svg
          width="84"
          height="84"
          viewBox="0 0 84 84"
          className="-rotate-90 transform"
          aria-label={`Taux de recouvrement ${percentage}%`}
        >
          <circle
            cx="42"
            cy="42"
            r="34"
            fill="none"
            stroke="var(--line)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <circle
            cx="42"
            cy="42"
            r="34"
            fill="none"
            stroke="var(--pri)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: prefersReducedMotion
                ? "none"
                : "stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          />
        </svg>
        <div className=" inset-0 absolute flex items-center justify-center text-xs font-extrabold text-pri">
          {paidCount}/{totalCount}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium text-mut">Taux de recouvrement</div>
        <div className="mt-0.5 text-2xl font-extrabold text-ink">
          <AnimatedAmount value={percentage} isPercent />
        </div>
        <p className="mt-0.5 text-xs text-mut">
          {paidCount} loyer{paidCount > 1 ? "s" : ""} soldé
          {paidCount > 1 ? "s" : ""} sur {totalCount} ce mois
        </p>
      </div>
    </div>
  );
}
