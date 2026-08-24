'use server'

import { backendFetch, backendUpload, BackendError } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

export interface ProfileInput {
  username?: string
  name?: string
  gender?: string
  email?: string
  profilePhotoUrl?: string
}

// Auto-édition du profil de l'utilisateur connecté (route /users/me, sans "role" :
// un contributeur ne peut pas se l'attribuer par ce biais, le backend le refuserait
// de toute façon). Pas de mot de passe ici : voir changeMyPassword, sur son propre
// écran pour raison de sécurité (exige le mot de passe actuel).
export async function updateMyProfile(data: ProfileInput) {
  const payload: Omit<ProfileInput, 'gender'> & { gender?: string | null } = { ...data }
  // Envoyé explicitement à `null` (plutôt que supprimé du payload) quand l'utilisateur
  // choisit "Non renseigné", pour effacer un genre déjà enregistré côté backend —
  // un champ absent du PATCH est laissé tel quel, il ne suffit pas à le vider.
  payload.gender = payload.gender || null
  await backendFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath('/dashboard')
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

// Écran dédié (pas le formulaire de profil) : le backend vérifie currentPassword
// avant d'accepter newPassword, voir ChangePasswordDto côté API.
// Retourne un résultat plutôt que de laisser l'erreur remonter telle quelle : passée
// la frontière "use server", Next.js ne transmet au client que le message d'une
// exception (pas les propriétés custom comme `status`), donc c'est ici, côté
// serveur, qu'on peut encore distinguer "mot de passe actuel incorrect" (401) d'une
// autre panne pour renvoyer un message adapté.
export async function changeMyPassword(
  data: ChangePasswordInput
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await backendFetch('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return { success: true }
  } catch (err) {
    if (err instanceof BackendError && err.status === 401) {
      return { success: false, error: 'Mot de passe actuel incorrect.' }
    }
    return { success: false, error: 'Échec du changement de mot de passe. Réessayez.' }
  }
}

export async function uploadProfilePhoto(formData: FormData) {
  return backendUpload('/uploads', formData)
}
