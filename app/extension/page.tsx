// app/extension/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const ETAPES: { titre: string; detail: React.ReactNode }[] = [
  {
    titre: "Téléchargez et décompressez le fichier zip",
    detail: "Clic droit sur le fichier téléchargé, puis « Extraire tout… » (Windows) ou double-clic (Mac).",
  },
  {
    titre: "Ouvrez chrome://extensions dans Chrome",
    detail: (
      <>
        Copiez{" "}
        <code className="rounded bg-fond px-1.5 py-0.5 text-cyan-clair">
          chrome://extensions
        </code>{" "}
        dans la barre d&apos;adresse. Chrome bloque les clics sur ce lien : il faut le coller à la main.
      </>
    ),
  },
  {
    titre: "Activez le « Mode développeur »",
    detail: "C'est l'interrupteur en haut à droite de la page des extensions.",
  },
  {
    titre: "Cliquez sur « Charger l'extension non empaquetée »",
    detail: "Le bouton apparaît en haut à gauche, une fois le mode développeur activé.",
  },
  {
    titre: "Sélectionnez le dossier décompressé",
    detail: "Choisissez le dossier qui contient directement le fichier manifest.json. Le bouton « Copier la conversation » apparaît ensuite sur claude.ai et Lumo.",
  },
];

// Copie dans le presse-papier, avec une solution de secours.
async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    try {
      const zone = document.createElement("textarea");
      zone.value = texte;
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(zone);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function PageExtension() {
  const reduit = useReducedMotion();
  const [etatLien, setEtatLien] = useState<"repos" | "copie" | "erreur">("repos");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  async function copierLienApp() {
    const ok = await copierTexte(window.location.origin + "/");
    setEtatLien(ok ? "copie" : "erreur");
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setEtatLien("repos"), 2000);
  }

  // Apparition en fondu, décalée de 40 ms entre chaque carte.
  function apparition(i: number) {
    return {
      initial: reduit ? false : { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.22, ease: "easeOut" as const, delay: i * 0.04 },
    };
  }

  const classeLien =
    etatLien === "copie"
      ? "border-cyan bg-cyan text-sur-cyan shadow-lueur-cyan"
      : etatLien === "erreur"
      ? "border-danger bg-danger text-white"
      : "border-bordure bg-carte text-texte hover:border-cyan hover:bg-survol hover:text-cyan-clair";

  const texteLien =
    etatLien === "copie"
      ? "✓ Lien copié !"
      : etatLien === "erreur"
      ? "Échec de la copie"
      : "Copier le lien de l'app";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-doux transition-colors duration-150 hover:text-texte"
      >
        <span aria-hidden="true">←</span> Retour aux decks
      </Link>

      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Extension Chrome
        </h1>
        <p className="text-lg text-cyan-clair">
          Copie tes conversations claude.ai et Lumo en un clic, puis colle-les
          dans NoRepeat.
        </p>
      </header>

      {/* Boutons principaux */}
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <a
          href="/extension.zip"
          download
          className="inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-lg font-semibold text-white shadow-lueur-accent transition duration-200 hover:-translate-y-0.5 hover:bg-accent-survol hover:shadow-lueur-accent-forte active:translate-y-0 active:bg-accent-actif"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          Télécharger l&apos;extension (.zip)
        </a>
        <button
          type="button"
          onClick={copierLienApp}
          aria-live="polite"
          className={`cursor-pointer rounded-xl border px-5 py-3.5 font-semibold transition duration-150 active:scale-95 ${classeLien}`}
        >
          {texteLien}
        </button>
      </div>

      {/* Tutoriel */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-doux">
        Installation en 5 étapes
      </h2>
      <ol className="mb-10 flex flex-col gap-3">
        {ETAPES.map((etape, i) => (
          <motion.li
            key={etape.titre}
            {...apparition(i)}
            className="flex gap-4 rounded-xl border border-bordure bg-carte p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white shadow-lueur-accent">
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="font-semibold">{etape.titre}</div>
              <div className="mt-0.5 text-sm text-doux">{etape.detail}</div>
            </div>
          </motion.li>
        ))}
      </ol>

      {/* Note Chrome Web Store */}
      <motion.div
        {...apparition(ETAPES.length)}
        className="flex items-start gap-3 rounded-xl border border-bordure-cyan bg-cyan/5 p-4"
      >
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan-clair"
          aria-hidden="true"
        >
          ✦
        </span>
        <p className="text-sm text-doux">
          <span className="font-semibold text-cyan-clair">Bientôt :</span>{" "}
          l&apos;extension sera disponible directement sur le Chrome Web Store,
          avec une installation en 1 clic. Plus besoin de ces étapes.
        </p>
      </motion.div>
    </main>
  );
}