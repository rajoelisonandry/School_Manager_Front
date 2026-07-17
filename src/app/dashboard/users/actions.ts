'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendUser {
  id: number
  username: string
  name: string
  email: string
  role: string
  createdAt: string
}

export interface UserInput {
  username: string
  password?: string
  name: string
  email: string
  role: string
}

function toFrontUser(user: BackendUser) {
  return {
    id: String(user.id),
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }
}

export async function getUsers() {
  const users = await backendFetch<BackendUser[]>('/users')
  return users.map(toFrontUser)
}

export async function createUser(data: Required<UserInput>) {
  await backendFetch('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  revalidatePath('/dashboard/users')
}

export async function updateUser(id: string, data: Partial<UserInput>) {
  const payload = { ...data }
  if (!payload.password) {
    delete payload.password
  }
  await backendFetch(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath('/dashboard/users')
}

export async function deleteUser(id: string) {
  await backendFetch(`/users/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/users')
}

export async function loginUser(username: string, password: string) {
  try {
    const user = await backendFetch<BackendUser>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    return toFrontUser(user)
  } catch {
    return null
  }
}
