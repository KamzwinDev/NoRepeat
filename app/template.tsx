// app/template.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// ---- Réglages faciles à modifier ----
const DUREE_ENTREE = 0.6; // secondes
const DECALAGE = 40; // pixels (30 à 50 conseillé)
const COURBE = "easeOut";
// -------------------------------------

// Remonté à chaque navigation : la nouvelle page arrive depuis la droite, en fondu.
export default function Template({ children }: { children: ReactNode }) {
  const reduit = useReducedMotion();

  return (
    <motion.div
      initial={reduit ? false : { opacity: 0, x: DECALAGE }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: DUREE_ENTREE, ease: COURBE }}
    >
      {children}
    </motion.div>
  );
}