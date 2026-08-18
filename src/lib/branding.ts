// Identité de l'établissement, extraite en configuration pour pouvoir déployer la
// même application pour une autre école sans toucher au code : il suffit de définir
// ces variables d'environnement (NEXT_PUBLIC_* car utilisées aussi bien côté serveur
// que côté client — génération de PDF, mise en page, page de connexion). Sans elles,
// l'app garde le comportement actuel (Au Bel Enfant) par défaut.
export const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Au Bel Enfant";
export const SCHOOL_TAGLINE =
  process.env.NEXT_PUBLIC_SCHOOL_TAGLINE || "Ambition - Motivation - Réussite";
// Petit libellé affiché au-dessus du nom (ex: "LYCÉE PRIVÉ", "COLLÈGE", "GROUPE SCOLAIRE").
export const SCHOOL_LEVEL_LABEL = process.env.NEXT_PUBLIC_SCHOOL_LEVEL_LABEL || "LYCÉE PRIVÉ";
export const SCHOOL_ADDRESS =
  process.env.NEXT_PUBLIC_SCHOOL_ADDRESS || "Lot 077 G Bis Ambohibao Antehiroka";
export const SCHOOL_PHONE = process.env.NEXT_PUBLIC_SCHOOL_PHONE || "+261 34 01 332 78";
// Identifiants fiscaux/statistiques de l'établissement, affichés sur les documents
// officiels (reçus, certificats...).
export const SCHOOL_NIF = process.env.NEXT_PUBLIC_SCHOOL_NIF || "4016760914";
export const SCHOOL_STAT = process.env.NEXT_PUBLIC_SCHOOL_STAT || "85101 11 1995 0 06023";
// Utilisé sur les documents officiels (certificats, bulletins) : bloc signature.
export const SCHOOL_DIRECTOR_NAME =
  process.env.NEXT_PUBLIC_SCHOOL_DIRECTOR_NAME || "Mme RAKOTOARIZAO Voahangy";
export const SCHOOL_DIRECTOR_TITLE =
  process.env.NEXT_PUBLIC_SCHOOL_DIRECTOR_TITLE || "La Directrice";
