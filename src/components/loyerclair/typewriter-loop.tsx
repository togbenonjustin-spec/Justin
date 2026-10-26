"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TypewriterSegment {
  text: string;
  className?: string;
}

interface TypewriterLoopProps {
  /**
   * Segments de la phrase à écrire lettre par lettre puis effacer lettre par lettre.
   * Permet de conserver les couleurs ou le gras sur certains mots tout en animant caractère par caractère.
   */
  segments: TypewriterSegment[];
  /** Vitesse d'écriture par caractère (ms) */
  typeSpeedMs?: number;
  /** Vitesse d'effacement par caractère (ms) */
  deleteSpeedMs?: number;
  /** Pause une fois la phrase complète (ms) */
  holdCompleteMs?: number;
  /** Pause une fois la phrase effacée avant de ré-écrire (ms) */
  holdEmptyMs?: number;
  /** Délai initial avant de commencer (ms) */
  initialDelayMs?: number;
  /** Classes CSS du conteneur */
  className?: string;
  /** Couleur/classe du curseur clignotant */
  cursorClassName?: string;
}

export function TypewriterLoop({
  segments,
  typeSpeedMs = 38,
  deleteSpeedMs = 20,
  holdCompleteMs = 2600,
  holdEmptyMs = 450,
  initialDelayMs = 0,
  className,
  cursorClassName = "text-acc",
}: TypewriterLoopProps) {
  const prefersReducedMotion = useReducedMotion();
  const fullText = segments.map((s) => s.text).join("");
  const totalLength = fullText.length;

  const [charCount, setCharCount] = useState<number>(
    prefersReducedMotion ? totalLength : 0
  );
  const [phase, setPhase] = useState<
    "initial" | "typing" | "holding" | "deleting" | "resting"
  >("initial");

  useEffect(() => {
    if (prefersReducedMotion) {
      setCharCount(totalLength);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    if (phase === "initial") {
      timer = setTimeout(() => {
        setPhase("typing");
      }, initialDelayMs);
    } else if (phase === "typing") {
      if (charCount < totalLength) {
        timer = setTimeout(() => {
          setCharCount((c) => Math.min(totalLength, c + 1));
        }, typeSpeedMs);
      } else {
        setPhase("holding");
      }
    } else if (phase === "holding") {
      timer = setTimeout(() => {
        setPhase("deleting");
      }, holdCompleteMs);
    } else if (phase === "deleting") {
      if (charCount > 0) {
        timer = setTimeout(() => {
          setCharCount((c) => Math.max(0, c - 1));
        }, deleteSpeedMs);
      } else {
        setPhase("resting");
      }
    } else if (phase === "resting") {
      timer = setTimeout(() => {
        setPhase("typing");
      }, holdEmptyMs);
    }

    return () => clearTimeout(timer);
  }, [
    charCount,
    phase,
    totalLength,
    typeSpeedMs,
    deleteSpeedMs,
    holdCompleteMs,
    holdEmptyMs,
    initialDelayMs,
    prefersReducedMotion,
  ]);

  // Découpe les segments selon le nombre de caractères actuellement visibles
  let remaining = charCount;
  const visibleSegments = segments.map((seg, idx) => {
    if (remaining <= 0) {
      return <React.Fragment key={idx} />;
    }
    const slice = seg.text.slice(0, remaining);
    remaining -= slice.length;
    return (
      <span key={idx} className={seg.className}>
        {slice}
      </span>
    );
  });

  return (
    <span className={cn("relative inline-block", className)}>
      {/* Texte complet accessible aux lecteurs d'écran et moteurs de recherche */}
      <span className="sr-only">{fullText}</span>

      {/* Réserve la hauteur exacte pour éviter tout saut de mise en page (CLS = 0) */}
      <span
        aria-hidden="true"
        className="invisible block select-none pointer-events-none"
      >
        {segments.map((seg, idx) => (
          <span key={idx} className={seg.className}>
            {seg.text}
          </span>
        ))}
      </span>

      {/* Calque animé lettre par lettre par-dessus */}
      <span aria-hidden="true" className="absolute inset-0 block">
        {visibleSegments}
        {!prefersReducedMotion && (
          <span
            className={cn(
              "ml-0.5 inline-block animate-pulse font-light",
              cursorClassName
            )}
          >
            |
          </span>
        )}
      </span>
    </span>
  );
}
