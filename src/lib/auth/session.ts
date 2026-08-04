'use server'

import { cookies } from 'next/headers'
import { backendFetch, AUTH_COOKIE_NAME } from '@/lib/backend/http'

interface BackendUser {
  id: number
  username: string
  name: string
  email: string
  role: string
  createdAt: string
}

export interface SessionUser {
  id: string
  username: string
  name: string
  email: string
  role: string
}

function toSessionUser(user: BackendUser): SessionUser {
  return {
    id: String(user.id),
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

// Aligné sur l'expiration du JWT côté backend (voir JWT_EXPIRES_IN).
const COOKIE_MAX_AGE = 60 * 60 * 8

// Authentifie contre le backend puis stocke le JWT dans un cookie httpOnly :
// le navigateur ne peut pas le lire (protection contre le vol via XSS), seules
// les Server Actions/Server Components de ce projet peuvent le récupérer.
export async function loginAction(
  username: string,
  password: string
): Promise<SessionUser | null> {
  try {
    const result = await backendFetch<{ accessToken: string; user: BackendUser }>(
      '/users/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    )

    const cookieStore = await cookies()
    cookieStore.set(AUTH_COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return toSessionUser(result.user)
  } catch {
    return null
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

// Revérifie l'identité auprès du backend (le JWT est validé côté serveur à
// chaque appel) plutôt que de faire confiance à un état client persisté.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null

  try {
    const user = await backendFetch<BackendUser>('/users/me')
    return toSessionUser(user)
  } catch {
    return null
  }
}
