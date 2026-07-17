'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendClass {
  id: number
  name: string
  level: string
  capacity: number
  students?: unknown[]
}

function toFrontClass(cls: BackendClass) {
  return {
    id: String(cls.id),
    name: cls.name,
    level: cls.level,
    capacity: cls.capacity,
    _count: { students: cls.students?.length ?? 0 },
  }
}

export async function getClasses() {
  const classes = await backendFetch<BackendClass[]>('/classes')
  return classes.map(toFrontClass).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createClass(data: {
  name: string
  level: string
  capacity: number
}) {
  await backendFetch('/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  revalidatePath('/dashboard/classes')
}

export async function updateClass(id: string, data: {
  name?: string
  level?: string
  capacity?: number
}) {
  await backendFetch(`/classes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  revalidatePath('/dashboard/classes')
}

export async function deleteClass(id: string) {
  await backendFetch(`/classes/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/classes')
}
