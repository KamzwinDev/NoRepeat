// storage.js
// Gère la sauvegarde des decks dans le localStorage du navigateur.

const CLE_DECKS = "decks";

// Les 6 sections de chaque deck, dans l'ordre d'affichage.
export const SECTIONS = [
  { cle: "description", titre: "Description" },
  { cle: "dejaFait", titre: "Déjà fait" },
  { cle: "enCours", titre: "En cours" },
  { cle: "bugs", titre: "Bugs connus" },
  { cle: "conventions", titre: "Conventions" },
  { cle: "prochainesEtapes", titre: "Prochaines étapes" },
];

// Renvoie un objet de sections complet (les sections manquantes sont vides).
function sectionsCompletes(sections = {}) {
  const resultat = {};
  for (const { cle } of SECTIONS) {
    resultat[cle] = sections[cle] || "";
  }
  return resultat;
}

// Lit tous les decks. Renvoie un tableau (vide si rien n'est sauvegardé).
export function chargerDecks() {
  try {
    const brut = localStorage.getItem(CLE_DECKS);
    const decks = brut ? JSON.parse(brut) : [];
    return decks.map((deck) => ({
      ...deck,
      sections: sectionsCompletes(deck.sections),
    }));
  } catch (erreur) {
    console.error("Impossible de lire les decks :", erreur);
    return [];
  }
}

// Sauvegarde le tableau complet des decks.
export function sauvegarderDecks(decks) {
  try {
    localStorage.setItem(CLE_DECKS, JSON.stringify(decks));
  } catch (erreur) {
    console.error("Impossible de sauvegarder les decks :", erreur);
  }
}

// Crée un nouveau deck, l'ajoute à la liste et renvoie la liste à jour.
export function creerDeck(nom) {
  const decks = chargerDecks();
  const nouveauDeck = {
    id: crypto.randomUUID(),
    nom: nom.trim(),
    creeLe: new Date().toISOString(),
    sections: sectionsCompletes(),
  };
  const misAJour = [nouveauDeck, ...decks];
  sauvegarderDecks(misAJour);
  return misAJour;
}

// Trouve un deck par son identifiant (renvoie null s'il n'existe pas).
export function trouverDeck(id) {
  return chargerDecks().find((deck) => deck.id === id) || null;
}

// Modifie le texte d'une section d'un deck.
export function mettreAJourSection(id, cle, texte) {
  const decks = chargerDecks().map((deck) =>
    deck.id === id
      ? { ...deck, sections: { ...deck.sections, [cle]: texte } }
      : deck
  );
  sauvegarderDecks(decks);
}

// Supprime un deck et renvoie la liste à jour.
export function supprimerDeck(id) {
  const misAJour = chargerDecks().filter((deck) => deck.id !== id);
  sauvegarderDecks(misAJour);
  return misAJour;
}
// ---------- Export / import JSON ----------

// Produit le texte JSON de tous les decks (avec un petit en-tête de version).
export function exporterDecksJson() {
  const contenu = {
    application: "PromptDeck",
    version: 1,
    exporteLe: new Date().toISOString(),
    decks: chargerDecks(),
  };
  return JSON.stringify(contenu, null, 2);
}

// Lit un texte JSON et fusionne les decks avec ceux déjà présents.
// - Un deck dont l'id existe déjà est remplacé par la version importée.
// - Un deck dont l'id est nouveau est ajouté.
// Renvoie { ajoutes, remplaces, ignores, decks } ou lève une erreur lisible.
export function importerDecksJson(texte) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }

  // On accepte l'export complet ({ decks: [...] }) ou directement un tableau.
  const liste = Array.isArray(donnees) ? donnees : donnees && donnees.decks;
  if (!Array.isArray(liste)) {
    throw new Error("Format non reconnu : aucun deck trouvé dans ce fichier.");
  }

  const existants = chargerDecks();
  const parId = new Map(existants.map((deck) => [deck.id, deck]));
  let ajoutes = 0;
  let remplaces = 0;
  let ignores = 0;

  for (const brut of liste) {
    // Un deck valide a au minimum un nom texte.
    if (!brut || typeof brut.nom !== "string" || !brut.nom.trim()) {
      ignores++;
      continue;
    }
    const deck = {
      id: typeof brut.id === "string" && brut.id ? brut.id : crypto.randomUUID(),
      nom: brut.nom.trim(),
      creeLe:
        typeof brut.creeLe === "string" && brut.creeLe
          ? brut.creeLe
          : new Date().toISOString(),
      sections: sectionsCompletes(brut.sections),
    };
    if (parId.has(deck.id)) remplaces++;
    else ajoutes++;
    parId.set(deck.id, deck);
  }

  const decks = Array.from(parId.values());
  sauvegarderDecks(decks);
  return { ajoutes, remplaces, ignores, decks };
}