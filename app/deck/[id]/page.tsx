// app/deck/[id]/page.tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  SECTIONS,
  trouverDeck,
  mettreAJourSection,
  supprimerDeck,
} from "../../../storage";
import { construirePromptAnalyse, analyserReponse } from "../../../miseajour";

type Deck = {
  id: string;
  nom: string;
  creeLe: string;
  sections: Record<string, string>;
};

type EtatCopie = "repos" | "copie" | "erreur";

const SEPARATEUR = "------------------------------------------------------------";

// Assemble les sections remplies en un seul bloc de texte structuré.
function construirePrompt(deck: Deck): string {
  const blocs = SECTIONS.map(({ cle, titre }) => ({
    titre,
    texte: (deck.sections[cle] ?? "").trim(),
  }))
    .filter((bloc) => bloc.texte.length > 0)
    .map((bloc) => `${SEPARATEUR}\n## ${bloc.titre.toUpperCase()}\n${SEPARATEUR}\n${bloc.texte}`);

  return [
    `# CONTEXTE DU PROJET : ${deck.nom}`,
    "Voici le contexte de mon projet, organisé en sections. Lis-le attentivement avant de répondre.",
    "",
    blocs.join("\n\n"),
    "",
    SEPARATEUR,
    "# FIN DU CONTEXTE",
  ].join("\n");
}

// Copie du texte dans le presse-papier (avec une solution de secours).
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

// ---------- Icônes ----------

// Couleur de l'icône de chaque section.
const COULEURS_SECTIONS: Record<string, string> = {
  description: "bg-accent/10 text-accent",
  dejaFait: "bg-green-500/10 text-green-400",
  enCours: "bg-amber-500/10 text-amber-400",
  bugs: "bg-red-500/10 text-red-400",
  conventions: "bg-purple-500/10 text-purple-400",
  prochainesEtapes: "bg-cyan-500/10 text-cyan-400",
};

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconeSection({ cle }: { cle: string }) {
  let dessin: React.ReactNode;
  switch (cle) {
    case "description":
      dessin = (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </>
      );
      break;
    case "dejaFait":
      dessin = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </>
      );
      break;
    case "enCours":
      dessin = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
      break;
    case "bugs":
      dessin = (
        <>
          <path d="M8 8a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V8Z" />
          <path d="M12 10v8M4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2" />
        </>
      );
      break;
    case "conventions":
      dessin = (
        <>
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
          <path d="M4 19a2 2 0 0 1 2-2h13" />
        </>
      );
      break;
    default:
      dessin = (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
  }
  return <Svg>{dessin}</Svg>;
}

// ---------- Styles réutilisés ----------

const BOUTON_SECONDAIRE =
  "cursor-pointer rounded-lg border border-bordure bg-carte px-4 py-2.5 font-semibold text-texte transition duration-150 hover:border-accent hover:bg-survol active:scale-95";

const BOUTON_PRINCIPAL =
  "cursor-pointer rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition duration-150 hover:bg-accent-survol active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

const LABEL_ASSISTANT = "mb-1.5 block text-sm font-semibold";

function ContenuDeck() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [charge, setCharge] = useState(false);
  const [etatCopie, setEtatCopie] = useState<EtatCopie>("repos");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Assistant de mise à jour ---
  const [assistantOuvert, setAssistantOuvert] = useState(false);
  const [conversation, setConversation] = useState("");
  const [promptAnalyse, setPromptAnalyse] = useState("");
  const [etatCopieAnalyse, setEtatCopieAnalyse] = useState<EtatCopie>("repos");
  const [reponseIA, setReponseIA] = useState("");
  const [messageMaj, setMessageMaj] = useState<{
    type: "ok" | "erreur";
    texte: string;
  } | null>(null);
  const minuteurAnalyse = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minuteurMaj = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anciennes valeurs des sections modifiées par la dernière mise à jour.
  const [sauvegardeAvant, setSauvegardeAvant] = useState<Record<
    string,
    string
  > | null>(null);

  // Au premier affichage, on retrouve le deck dans le navigateur.
  useEffect(() => {
    setDeck(trouverDeck(id));
    setCharge(true);
  }, [id]);

  // On annule les minuteurs si on quitte la page.
  useEffect(() => {
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
      if (minuteurAnalyse.current) clearTimeout(minuteurAnalyse.current);
      if (minuteurMaj.current) clearTimeout(minuteurMaj.current);
    };
  }, []);

  // À chaque frappe : on met à jour l'écran et on sauvegarde.
  function modifierSection(cle: string, texte: string) {
    if (!deck) return;
    setDeck({ ...deck, sections: { ...deck.sections, [cle]: texte } });
    mettreAJourSection(deck.id, cle, texte);
  }

  // Génère le prompt, le copie, et affiche la confirmation 2 secondes.
  async function genererPrompt() {
    if (!deck) return;
    const ok = await copierTexte(construirePrompt(deck));
    setEtatCopie(ok ? "copie" : "erreur");
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setEtatCopie("repos"), 2000);
  }

  // Construit le prompt d'analyse à partir du deck actuel et de la conversation.
  function genererPromptAnalyse() {
    if (!deck || !conversation.trim()) return;
    setPromptAnalyse(construirePromptAnalyse(deck, conversation));
    setEtatCopieAnalyse("repos");
    setMessageMaj(null);
  }

  // Copie le prompt d'analyse.
  async function copierPromptAnalyse() {
    const ok = await copierTexte(promptAnalyse);
    setEtatCopieAnalyse(ok ? "copie" : "erreur");
    if (minuteurAnalyse.current) clearTimeout(minuteurAnalyse.current);
    minuteurAnalyse.current = setTimeout(
      () => setEtatCopieAnalyse("repos"),
      2000
    );
  }

  // Lit la réponse de l'IA et remplace le contenu des sections trouvées.
  function appliquerMiseAJour() {
    if (!deck) return;
    const nouvelles = analyserReponse(reponseIA);
    const cles = Object.keys(nouvelles);

    if (minuteurMaj.current) clearTimeout(minuteurMaj.current);

    if (cles.length === 0) {
      setMessageMaj({
        type: "erreur",
        texte:
          "Aucune section reconnue. Vérifie que la réponse contient les marqueurs ###DÉJÀ FAIT###, ###EN COURS###, etc.",
      });
      return;
    }

    // On mémorise l'état d'avant, pour pouvoir annuler.
    const avant: Record<string, string> = {};
    for (const cle of cles) {
      avant[cle] = deck.sections[cle] ?? "";
    }

    let sections = { ...deck.sections };
    for (const cle of cles) {
      mettreAJourSection(deck.id, cle, nouvelles[cle]);
      sections = { ...sections, [cle]: nouvelles[cle] };
    }
    setDeck({ ...deck, sections });
    setSauvegardeAvant(avant);
    setMessageMaj({ type: "ok", texte: "✓ Deck mis à jour !" });
    setReponseIA("");
    minuteurMaj.current = setTimeout(() => setMessageMaj(null), 4000);
  }

  // Restaure les sections telles qu'elles étaient avant la dernière mise à jour.
  function annulerMiseAJour() {
    if (!deck || !sauvegardeAvant) return;
    let sections = { ...deck.sections };
    for (const [cle, texte] of Object.entries(sauvegardeAvant)) {
      mettreAJourSection(deck.id, cle, texte);
      sections = { ...sections, [cle]: texte };
    }
    setDeck({ ...deck, sections });
    setSauvegardeAvant(null);
    if (minuteurMaj.current) clearTimeout(minuteurMaj.current);
    setMessageMaj({ type: "ok", texte: "↩ Mise à jour annulée." });
    minuteurMaj.current = setTimeout(() => setMessageMaj(null), 4000);
  }

  // Suppression avec confirmation, puis retour à l'accueil.
  function supprimer() {
    if (!deck) return;
    const ok = window.confirm(
      `Supprimer définitivement le deck « ${deck.nom} » ?`
    );
    if (!ok) return;
    supprimerDeck(deck.id);
    router.push("/");
  }

  const boutonRetour = (
    <Link
      href="/"
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-doux transition-colors duration-150 hover:text-texte"
    >
      <span aria-hidden="true">←</span> Retour aux decks
    </Link>
  );

  // Pendant le chargement, on n'affiche rien (évite un clignotement).
  if (!charge) {
    return <main className="p-8" />;
  }

  // Deck introuvable (identifiant inconnu ou deck déjà supprimé).
  if (!deck) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        {boutonRetour}
        <h1 className="text-2xl font-bold">Deck introuvable</h1>
        <p className="mt-2 text-doux">
          Ce deck n&apos;existe pas ou a été supprimé.
        </p>
      </main>
    );
  }

  const auMoinsUneSection = SECTIONS.some(
    ({ cle }) => (deck.sections[cle] ?? "").trim().length > 0
  );

  const texteBouton =
    etatCopie === "copie"
      ? "✓ Copié !"
      : etatCopie === "erreur"
      ? "Échec de la copie"
      : "Générer mon prompt";

  const classeBoutonPrompt =
    etatCopie === "copie"
      ? "bg-green-600 shadow-green-600/30"
      : etatCopie === "erreur"
      ? "bg-danger shadow-danger/30"
      : "bg-accent shadow-accent/30 hover:bg-accent-survol";

  const texteBoutonCopieAnalyse =
    etatCopieAnalyse === "copie"
      ? "✓ Copié !"
      : etatCopieAnalyse === "erreur"
      ? "Échec de la copie"
      : "Copier";

  const classeBoutonCopieAnalyse =
    etatCopieAnalyse === "copie"
      ? "border-green-600 bg-green-600 text-white"
      : etatCopieAnalyse === "erreur"
      ? "border-danger bg-danger text-white"
      : "border-bordure bg-carte text-texte hover:border-accent hover:bg-survol";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-12">
      {boutonRetour}

      {/* En-tête : nom du deck + suppression */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">
            {deck.nom}
          </h1>
          <div className="mt-1 text-sm text-doux">
            Créé le {new Date(deck.creeLe).toLocaleDateString("fr-FR")}
          </div>
        </div>
        <button
          onClick={supprimer}
          className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-danger/60 px-4 py-2 text-sm font-medium text-danger transition duration-150 hover:bg-danger hover:text-white active:scale-95"
        >
          Supprimer
        </button>
      </header>

      {/* Bouton principal : génère et copie le prompt */}
      <div className="mb-4">
        <button
          onClick={genererPrompt}
          disabled={!auMoinsUneSection}
          aria-live="polite"
          className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-lg font-semibold text-white shadow-lg transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:translate-y-0 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${classeBoutonPrompt}`}
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
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
          </svg>
          {texteBouton}
        </button>
        {!auMoinsUneSection && (
          <p className="mt-2 text-sm text-doux">
            Remplis au moins une section pour pouvoir générer ton prompt.
          </p>
        )}
      </div>

      {/* Bandeau d'annulation de la dernière mise à jour */}
      {sauvegardeAvant && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-accent bg-carte px-4 py-3">
          <span className="text-sm">
            Mise à jour appliquée (
            {SECTIONS.filter(({ cle }) => cle in sauvegardeAvant)
              .map(({ titre }) => titre)
              .join(", ")}
            ).
          </span>
          <button
            onClick={annulerMiseAJour}
            className={`${BOUTON_SECONDAIRE} whitespace-nowrap`}
          >
            ↩ Annuler
          </button>
        </div>
      )}

      {/* Bouton qui ouvre / ferme l'assistant de mise à jour */}
      <button
        onClick={() => setAssistantOuvert(!assistantOuvert)}
        aria-expanded={assistantOuvert}
        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border border-bordure bg-carte px-5 py-3.5 font-semibold transition duration-150 hover:border-accent hover:bg-survol ${
          assistantOuvert ? "mb-3" : "mb-10"
        }`}
      >
        <span>🔄 Mettre à jour le deck</span>
        <span
          className={`text-doux transition-transform duration-200 ${
            assistantOuvert ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {assistantOuvert && (
        <div className="mb-10 rounded-2xl border border-accent/40 bg-accent/5 p-5 shadow-lg shadow-black/20">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
            <span aria-hidden="true">✦</span> Assistant de mise à jour
          </div>

          {/* 1. La conversation à analyser */}
          <label htmlFor="conversation" className={LABEL_ASSISTANT}>
            Colle ici ta dernière conversation avec l&apos;IA
          </label>
          <textarea
            id="conversation"
            value={conversation}
            onChange={(e) => setConversation(e.target.value)}
            rows={10}
            placeholder="Colle la conversation…"
            className="w-full resize-y bg-fond px-3 py-2.5"
          />
          <button
            onClick={genererPromptAnalyse}
            disabled={!conversation.trim()}
            className={`mt-3 ${BOUTON_PRINCIPAL}`}
          >
            Générer le prompt d&apos;analyse
          </button>

          {/* 2. Le prompt d'analyse généré + bouton Copier */}
          {promptAnalyse && (
            <div className="mt-6 border-t border-bordure pt-6">
              <label htmlFor="prompt-analyse" className={LABEL_ASSISTANT}>
                Prompt d&apos;analyse (à coller dans ton IA)
              </label>
              <textarea
                id="prompt-analyse"
                value={promptAnalyse}
                readOnly
                rows={8}
                className="w-full resize-y bg-fond px-3 py-2.5 text-doux"
              />
              <button
                onClick={copierPromptAnalyse}
                aria-live="polite"
                className={`mt-3 cursor-pointer rounded-lg border px-4 py-2.5 font-semibold transition duration-150 active:scale-95 ${classeBoutonCopieAnalyse}`}
              >
                {texteBoutonCopieAnalyse}
              </button>

              {/* 3. La réponse de l'IA + bouton Appliquer */}
              <div className="mt-6 border-t border-bordure pt-6">
                <label htmlFor="reponse-ia" className={LABEL_ASSISTANT}>
                  Colle ici la réponse de l&apos;IA
                </label>
                <textarea
                  id="reponse-ia"
                  value={reponseIA}
                  onChange={(e) => setReponseIA(e.target.value)}
                  rows={8}
                  placeholder="###DÉJÀ FAIT### …"
                  className="w-full resize-y bg-fond px-3 py-2.5"
                />
                <button
                  onClick={appliquerMiseAJour}
                  disabled={!reponseIA.trim()}
                  className={`mt-3 ${BOUTON_PRINCIPAL}`}
                >
                  Appliquer la mise à jour
                </button>
              </div>
            </div>
          )}

          {/* Message de confirmation ou d'erreur */}
          {messageMaj && (
            <p
              role="status"
              className={`mt-4 font-semibold ${
                messageMaj.type === "ok" ? "text-green-400" : "text-danger"
              }`}
            >
              {messageMaj.texte}
            </p>
          )}
        </div>
      )}

      {/* Les 6 sections modifiables */}
      <div className="flex flex-col gap-6">
        {SECTIONS.map(({ cle, titre }) => (
          <section key={cle}>
            <label
              htmlFor={cle}
              className="mb-2 flex items-center gap-2.5 font-semibold"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-md ${
                  COULEURS_SECTIONS[cle] ?? COULEURS_SECTIONS.description
                }`}
              >
                <IconeSection cle={cle} />
              </span>
              {titre}
            </label>
            <textarea
              id={cle}
              value={deck.sections[cle] ?? ""}
              onChange={(e) => modifierSection(cle, e.target.value)}
              rows={5}
              placeholder={`${titre}…`}
              className="w-full resize-y px-3 py-2.5 leading-relaxed"
            />
          </section>
        ))}
      </div>
    </main>
  );
}

// Enveloppe obligatoire avec Next 16 (useParams demande un Suspense).
export default function PageDeck() {
  return (
    <Suspense fallback={<main className="p-8" />}>
      <ContenuDeck />
    </Suspense>
  );
}