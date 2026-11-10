// app/page.tsx
"use client";

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import {
  chargerDecks,
  creerDeck,
  exporterDecksJson,
  importerDecksJson,
} from "../storage";

type Deck = {
  id: string;
  nom: string;
  creeLe: string;
};

type Message = { type: "ok" | "erreur"; texte: string };

// Logo NoRepeat : même dessin que app/icon.svg (version A).
function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient
          id="logo-contour"
          gradientUnits="userSpaceOnUse"
          x1="5"
          y1="0"
          x2="59"
          y2="0"
        >
          <stop offset="0" stopColor="#9f00ff" />
          <stop offset="0.35" stopColor="#9f00ff" />
          <stop offset="0.65" stopColor="#00e5ff" />
          <stop offset="1" stopColor="#00e5ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0a0816" />
      <rect
        x="5"
        y="5"
        width="54"
        height="54"
        rx="12"
        fill="none"
        stroke="url(#logo-contour)"
        strokeWidth="1.6"
      />
      <path
        fill="#9f00ff"
        d="M14 21Q14 15.2 19 15.2H24.9Q26.5 15.2 27.6 16.4L35.2 24.4L28.7 30.9L24.5 26.7Q23.4 25.9 23.4 27.3V36.3L14.4 44.8Q14 45 14 44Z"
      />
      <path
        fill="#9f00ff"
        d="M49.1 21.3Q50.2 22 50.2 23.6V44.5Q50.2 49.5 43.5 49.5H43Q41.9 49.5 41.2 48.8L31.2 38.9Z"
      />
      <path
        fill="#00e5ff"
        d="M12.7 49.5L47 16.2Q47.8 15.6 48.8 15.6H51.4L17.6 48.8Q16.9 49.5 15.8 49.5Z"
      />
    </svg>
  );
}

// Une carte de deck cliquable, qui mène vers /deck/[id].
function CarteDeck({ deck }: { deck: Deck }) {
  return (
    <li>
      <Link
        href={`/deck/${deck.id}`}
        className="group flex items-center justify-between gap-4 rounded-xl border border-bordure bg-carte px-5 py-4 text-texte transition duration-200 ease-out hover:-translate-y-0.5 hover:border-cyan hover:bg-survol hover:shadow-lueur-cyan"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-clair transition-colors duration-200 group-hover:bg-cyan group-hover:text-sur-cyan">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3 3 8l9 5 9-5-9-5Z" />
              <path d="m3 13 9 5 9-5" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{deck.nom}</div>
            <div className="text-sm text-doux">
              Créé le {new Date(deck.creeLe).toLocaleDateString("fr-FR")}
            </div>
          </div>
        </div>
        <span
          className="text-xl text-doux transition duration-200 group-hover:translate-x-1 group-hover:text-cyan-clair"
          aria-hidden="true"
        >
          →
        </span>
      </Link>
    </li>
  );
}

const BOUTON_OUTIL =
  "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-bordure bg-carte px-3.5 py-2 text-sm font-medium text-texte transition duration-150 hover:border-cyan hover:bg-survol hover:text-cyan-clair active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-bordure disabled:hover:bg-carte disabled:hover:text-texte";

export default function PageAccueil() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [nom, setNom] = useState("");
  const [charge, setCharge] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);
  const minuteurMessage = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Au premier affichage, on lit les decks sauvegardés dans le navigateur.
  useEffect(() => {
    setDecks(chargerDecks());
    setCharge(true);
  }, []);

  // On annule le minuteur si on quitte la page.
  useEffect(() => {
    return () => {
      if (minuteurMessage.current) clearTimeout(minuteurMessage.current);
    };
  }, []);

  // Quand on valide le formulaire : on crée le deck et on vide le champ.
  function validerFormulaire(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nom.trim()) return;
    setDecks(creerDeck(nom));
    setNom("");
  }

  // Affiche un message pendant 6 secondes.
  function afficherMessage(m: Message) {
    setMessage(m);
    if (minuteurMessage.current) clearTimeout(minuteurMessage.current);
    minuteurMessage.current = setTimeout(() => setMessage(null), 6000);
  }

  // Télécharge tous les decks dans un fichier JSON.
  function exporter() {
    const contenu = exporterDecksJson();
    const blob = new Blob([contenu], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    lien.href = url;
    lien.download = `promptdeck-decks-${date}.json`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
    afficherMessage({
      type: "ok",
      texte: `✓ ${decks.length} deck${decks.length > 1 ? "s" : ""} exporté${
        decks.length > 1 ? "s" : ""
      }.`,
    });
  }

  // Lit le fichier choisi et fusionne ses decks avec ceux du navigateur.
  async function importer(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    // On vide le champ pour pouvoir réimporter le même fichier plus tard.
    e.target.value = "";
    if (!fichier) return;
    try {
      const texte = await fichier.text();
      const resultat = importerDecksJson(texte);
      setDecks(resultat.decks);
      const morceaux = [
        `${resultat.ajoutes} ajouté${resultat.ajoutes > 1 ? "s" : ""}`,
        `${resultat.remplaces} remplacé${resultat.remplaces > 1 ? "s" : ""}`,
      ];
      if (resultat.ignores > 0) {
        morceaux.push(
          `${resultat.ignores} ignoré${resultat.ignores > 1 ? "s" : ""}`
        );
      }
      afficherMessage({
        type: "ok",
        texte: `✓ Import terminé : ${morceaux.join(", ")}.`,
      });
    } catch (erreur) {
      afficherMessage({
        type: "erreur",
        texte:
          erreur instanceof Error ? erreur.message : "Import impossible.",
      });
    }
  }

  const peutCreer = nom.trim().length > 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      {/* En-tête : logo + nom + tagline */}
            <header className="mb-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              NoRepeat
            </h1>
          </div>
          <Link
            href="/extension"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-bordure bg-carte px-3.5 py-2 text-sm font-medium text-texte transition duration-150 hover:border-cyan hover:bg-survol hover:text-cyan-clair active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v6h-3a2 2 0 1 0 0 4h3v8h-6v-3a2 2 0 1 0-4 0v3H3v-8h3a2 2 0 1 0 0-4H3V3h7Z" />
            </svg>
            Extension
          </Link>
        </div>
        <p className="text-lg text-cyan-clair">
          Ne réexplique plus jamais ton projet à ton IA
        </p>
      </header>

      {/* Formulaire de création */}
      <form
        onSubmit={validerFormulaire}
        className="mb-6 flex gap-2 rounded-xl border border-bordure bg-carte p-2"
      >
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom du nouveau deck"
          className="min-w-0 flex-1 border-transparent bg-transparent px-3 py-2.5"
        />
        <button
          type="submit"
          disabled={!peutCreer}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition duration-150 hover:bg-accent-survol active:scale-95 active:bg-accent-actif enabled:cursor-pointer enabled:hover:shadow-lueur-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Créer
        </button>
      </form>

      {/* Sauvegarde : export / import JSON */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={exporter}
          disabled={decks.length === 0}
          className={BOUTON_OUTIL}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
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
          Exporter
        </button>
        <button
          type="button"
          onClick={() => champFichier.current?.click()}
          className={BOUTON_OUTIL}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 15V3" />
            <path d="m7 8 5-5 5 5" />
            <path d="M5 21h14" />
          </svg>
          Importer
        </button>
        <input
          ref={champFichier}
          type="file"
          accept=".json,application/json"
          onChange={importer}
          className="hidden"
        />
        {message && (
          <span
            role="status"
            className={`text-sm font-medium ${
              message.type === "ok" ? "text-cyan-clair" : "text-danger"
            }`}
          >
            {message.texte}
          </span>
        )}
      </div>

      {/* État vide */}
      {charge && decks.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-bordure-cyan px-6 py-14 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan/10 text-cyan-clair">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3 3 8l9 5 9-5-9-5Z" />
              <path d="m3 13 9 5 9-5" />
              <path d="m3 18 9 5 9-5" />
            </svg>
          </span>
          <h2 className="mb-1 text-lg font-semibold">
            Aucun deck pour l&apos;instant
          </h2>
          <p className="max-w-sm text-doux">
            Un deck regroupe le contexte d&apos;un projet. Donne un nom au tien
            dans le champ ci-dessus pour créer le premier, ou importe une
            sauvegarde.
          </p>
        </div>
      )}

      {/* Liste des decks */}
      {decks.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-doux">
            Mes decks
          </h2>
          <ul className="flex flex-col gap-3">
            {decks.map((deck) => (
              <CarteDeck key={deck.id} deck={deck} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}