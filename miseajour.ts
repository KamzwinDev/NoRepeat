// miseajour.ts
// Logique de l'assistant de mise à jour du deck :
// - construire le prompt d'analyse à envoyer à l'IA
// - lire la réponse de l'IA pour en extraire les sections à mettre à jour

import { SECTIONS } from "./storage";

const SEPARATEUR = "------------------------------------------------------------";

const INSTRUCTIONS_ANALYSE =
  "Tu es un assistant qui met à jour le contexte d'un projet. D'après la conversation fournie, mets à jour les sections suivantes : DÉJÀ FAIT (déplace-y ce qui a été terminé), EN COURS (sur quoi on bosse maintenant), BUGS CONNUS (nouveaux bugs ajoutés, bugs corrigés retirés), PROCHAINES ÉTAPES (les objectifs suivants). Ne modifie pas la DESCRIPTION ni les CONVENTIONS sauf si la conversation le justifie clairement. Réponds UNIQUEMENT avec ce format, sans rien ajouter autour : ###DÉJÀ FAIT### [contenu] ###EN COURS### [contenu] ###BUGS CONNUS### [contenu] ###PROCHAINES ÉTAPES### [contenu]";

type DeckPourPrompt = {
  nom: string;
  sections: Record<string, string>;
};

// Assemble : instructions + contenu actuel des sections + conversation collée.
export function construirePromptAnalyse(
  deck: DeckPourPrompt,
  conversation: string
): string {
  const sectionsActuelles = SECTIONS.map(({ cle, titre }) => {
    const texte = (deck.sections[cle] ?? "").trim() || "(vide)";
    return `${SEPARATEUR}\n## ${titre.toUpperCase()}\n${SEPARATEUR}\n${texte}`;
  }).join("\n\n");

  return [
    INSTRUCTIONS_ANALYSE,
    "",
    `# CONTENU ACTUEL DU DECK : ${deck.nom}`,
    sectionsActuelles,
    "",
    SEPARATEUR,
    "# CONVERSATION À ANALYSER",
    SEPARATEUR,
    conversation.trim(),
  ].join("\n");
}

// Table de correspondance : marqueur (sans accent) -> clé de section.
const MARQUEURS: Record<string, string> = {
  "DEJA FAIT": "dejaFait",
  "EN COURS": "enCours",
  "BUGS CONNUS": "bugs",
  "PROCHAINES ETAPES": "prochainesEtapes",
};

// Met un marqueur en majuscules, sans accents ni espaces en trop.
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Lit la réponse de l'IA. Renvoie les sections trouvées : { cle: nouveauTexte }.
// Exemple : "###EN COURS### Page de détail" => { enCours: "Page de détail" }
export function analyserReponse(reponse: string): Record<string, string> {
  const resultat: Record<string, string> = {};
  const regex = /###\s*([^#\n]+?)\s*###/g;
  const reperes: { cle: string; debut: number; fin: number }[] = [];

  let trouve: RegExpExecArray | null;
  while ((trouve = regex.exec(reponse)) !== null) {
    const cle = MARQUEURS[normaliser(trouve[1])];
    if (cle) {
      reperes.push({
        cle,
        debut: trouve.index,
        fin: trouve.index + trouve[0].length,
      });
    }
  }

  reperes.forEach((repere, i) => {
    const finTexte =
      i + 1 < reperes.length ? reperes[i + 1].debut : reponse.length;
    const texte = reponse
      .slice(repere.fin, finTexte)
      .trim()
      // Retire d'éventuelles balises ``` ajoutées par l'IA autour de la réponse.
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/, "")
      .trim();
    resultat[repere.cle] = texte;
  });

  return resultat;
}