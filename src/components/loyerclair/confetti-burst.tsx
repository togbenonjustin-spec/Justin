"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface ConfettiPiece {
  id: number;
  dx: number;
  dy: number;
  color: string;
  rot: number;
}

const COLORS = ["#F5B83D", "#12946E", "#0B6B4F", "#E85D75", "#3B82F6"];

export function ConfettiBurst({ active }: { active: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active || prefersReducedMotion) return;

    const generated: ConfettiPiece[] = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      dx: (Math.random() - 0.5) * 340,
      dy: Math.random() * 280 - 130,
      color: COLORS[i % COLORS.length],
      rot: Math.round(Math.random() * 540),
    }));

    setPieces(generated);
    const t = setTimeout(() => setPieces([]), 1600);
    return () => clearTimeout(t);
  }, [active, prefersReducedMotion]);

  if (pieces.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: "50%",
            top: "38%",
            backgroundColor: p.color,
            transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg)`,
            transition:
              "transform 1.35s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1.35s ease-out",
          }}
          className="fixed h-3.5 w-2.5 rounded-sm opacity-90"
        />
      ))}
    </div>
  );
}

export function AnimatedSuccessCheck() {
  return (
    <svg
      className="mx-auto h-24 w-24"
      viewBox="0 0 100 100"
      aria-label="Paiement réussi"
    >
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="var(--ok)"
        strokeWidth="5"
        strokeLinecap="round"
        className="svg-check-circle"
      />
      <path
        d="M30 52l14 14 27-30"
        fill="none"
        stroke="var(--ok)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="svg-check-path"
      />
    </svg>
  );
}
