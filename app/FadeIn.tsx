// app/FadeIn.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Délai avant le début du fondu, en secondes. */
  delay?: number;
};

// Fondu d'apparition discret : opacité 0 → 1 en 220 ms, ease-out.
// Si l'utilisateur a demandé moins de mouvement, aucune animation n'est jouée.
export default function FadeIn({ children, className, delay = 0 }: Props) {
  const reduit = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduit ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}