'use server'

import { backendFetch, backendUpload } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendUser {
  id: number
  username: string
  name: string
  gender: string | null
  email: string
  role: string
  profilePhotoUrl: string | null
  createdAt: string
}

export interface UserInput {
  username: string
  password?: string
  name: string
  gender?: string
  email: string
  role: string
  profilePhotoUrl?: string
}

function toFrontUser(user: BackendUser) {
  return {
    id: String(user.id),
    username: user.username,
    name: user.name,
    gender: user.gender ?? '',
    email: user.email,
    role: user.role,
    profilePhotoUrl: user.profilePhotoUrl ?? '',
    createdAt: user.createdAt,
  }
}

export async function getUsers() {
  const users = await backendFetch<BackendUser[]>('/users')
  return users.map(toFrontUser)
}

export async function createUser(data: Required<UserInput>) {
  const payload: Partial<UserInput> = { ...data }
  if (!payload.gender) {
    delete payload.gender
  }
  await backendFetch('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  revalidatePath('/dashboard/users')
}

export async function updateUser(id: string, data: Partial<UserInput>) {
  const payload = { ...data }
  if (!payload.password) {
    delete payload.password
  }
  if (!payload.gender) {
    delete payload.gender
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

export async function uploadUserPhoto(formData: FormData) {
  return backendUpload('/uploads', formData)
}
