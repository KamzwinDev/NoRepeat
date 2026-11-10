// app/FondAnime.tsx
"use client";

import { useEffect, useRef } from "react";

// ---- Réglages faciles à modifier ----
const AMPLITUDE_VIOLET = 20; // px de décalage max (le plus "proche")
const AMPLITUDE_CYAN = 10; // px de décalage max (le plus "lointain")
const LISSAGE = 0.06; // 0.01 = très lent, 0.2 = réactif
// -------------------------------------

export default function FondAnime() {
  const violet = useRef<HTMLDivElement>(null);
  const cyan = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduit.matches) return; // fond statique

    // Position cible de la souris, entre -1 et 1 (0 = centre de l'écran).
    let cibleX = 0;
    let cibleY = 0;
    // Position actuelle, qui rattrape progressivement la cible (lerp).
    let x = 0;
    let y = 0;
    let rafId = 0;

    function surSouris(e: MouseEvent) {
      cibleX = (e.clientX / window.innerWidth) * 2 - 1;
      cibleY = (e.clientY / window.innerHeight) * 2 - 1;
    }

    // Une seule boucle rAF : on ne touche au DOM qu'une fois par image.
    function boucle() {
      x += (cibleX - x) * LISSAGE;
      y += (cibleY - y) * LISSAGE;

      if (violet.current) {
        violet.current.style.transform = `translate3d(${x * AMPLITUDE_VIOLET}px, ${y * AMPLITUDE_VIOLET}px, 0)`;
      }
      if (cyan.current) {
        // Sens inverse et amplitude plus faible : effet de profondeur.
        cyan.current.style.transform = `translate3d(${-x * AMPLITUDE_CYAN}px, ${-y * AMPLITUDE_CYAN}px, 0)`;
      }
      rafId = requestAnimationFrame(boucle);
    }

    window.addEventListener("mousemove", surSouris, { passive: true });
    rafId = requestAnimationFrame(boucle);

    return () => {
      window.removeEventListener("mousemove", surSouris);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
           className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Blob violet : en haut à gauche */}
      <div
        ref={violet}
        className="absolute -left-40 -top-40 h-[36rem] w-[36rem] will-change-transform"
      >
        <div className="fond-blob fond-blob-violet h-full w-full rounded-full" />
      </div>

      {/* Blob cyan : en bas à droite */}
      <div
        ref={cyan}
        className="absolute -bottom-48 -right-40 h-[32rem] w-[32rem] will-change-transform"
      >
        <div className="fond-blob fond-blob-cyan h-full w-full rounded-full" />
      </div>
    </div>
  );
}