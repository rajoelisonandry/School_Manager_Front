'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendSubject {
  id: number
  name: string
  classes: { id: number }[]
}

export interface SubjectInput {
  name: string
  classIds: string[]
}

function toFrontSubject(subject: BackendSubject) {
  return {
    id: String(subject.id),
    name: subject.name,
    classIds: (subject.classes ?? []).map((c) => String(c.id)),
  }
}

function toBackendPayload(data: Partial<SubjectInput>) {
  const { classIds, ...rest } = data
  return {
    ...rest,
    ...(classIds !== undefined ? { classIds: classIds.map(Number) } : {}),
  }
}

export async function getSubjects() {
  const subjects = await backendFetch<BackendSubject[]>('/subjects')
  return subjects.map(toFrontSubject).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createSubject(data: SubjectInput) {
  await backendFetch('/subjects', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/subjects')
}

export async function updateSubject(id: string, data: Partial<SubjectInput>) {
  await backendFetch(`/subjects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/subjects')
}

export async function deleteSubject(id: string) {
  await backendFetch(`/subjects/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/subjects')
}
