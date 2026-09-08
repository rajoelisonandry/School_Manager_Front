// Cache mémoire très simple, partagé entre toutes les pages du dashboard : sert
// à afficher instantanément les données de la dernière visite (le temps qu'un
// rafraîchissement silencieux se termine en arrière-plan) au lieu de remontrer
// le squelette de chargement à chaque entrée sur une page déjà visitée durant
// cette session — c'est ce délai répété (~3s) qui était perçu comme un
// chargement inutile quand rien n'avait changé.
//
// Volontairement simple : un Map en mémoire (donc réinitialisé au rechargement
// complet de l'onglet, jamais partagé entre onglets/utilisateurs), sans TTL ni
// invalidation par entité — chaque page écrase l'entrée après un chargement ou
// une mutation réussie, ce qui suffit ici (pas de données sensibles à la
// fraîcheur à la seconde près).
const cache = new Map<string, unknown>();

export function getCachedData<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCachedData<T>(key: string, value: T): void {
  cache.set(key, value);
}
