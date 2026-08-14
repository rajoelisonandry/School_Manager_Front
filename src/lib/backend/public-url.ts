// URL du backend accessible depuis le navigateur (pour afficher les fichiers uploadés
// avant la bascule vers Cloudflare R2 — voir plus bas)
export const BACKEND_PUBLIC_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

// Les fichiers uploadés après la bascule vers R2 ont une URL absolue (le domaine
// public du bucket) et n'ont besoin d'aucun préfixe. Les anciens fichiers, uploadés
// avant, ont un chemin relatif ("/uploads/xxx.jpg") servi par le backend lui-même —
// ceux-là restent préfixés par BACKEND_PUBLIC_URL pour rester compatibles.
export function backendFileUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_PUBLIC_URL}${path}`;
}
