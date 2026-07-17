// URL du backend accessible depuis le navigateur (pour afficher les fichiers uploadés)
export const BACKEND_PUBLIC_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

export function backendFileUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${BACKEND_PUBLIC_URL}${path}`;
}
