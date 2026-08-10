'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendSubject {
  id: number
  name: string
  classCoefficients: { id: number; coefficient: number; schoolClass: { id: number } }[]
}

export interface ClassCoefficient {
  classId: string
  coefficient: number
}

export interface SubjectInput {
  name: string
  // Coefficient propre à chaque classe où la matière est enseignée (une même
  // matière peut peser différemment selon la classe).
  classCoefficients: ClassCoefficient[]
}

function toFrontSubject(subject: BackendSubject) {
  const classCoefficients = (subject.classCoefficients ?? []).map((cc) => ({
    classId: String(cc.schoolClass.id),
    coefficient: cc.coefficient,
  }))
  return {
    id: String(subject.id),
    name: subject.name,
    classCoefficients,
    // Dérivé pour les usages qui n'ont besoin que de la liste des classes (emploi
    // du temps, saisie des notes), sans se soucier du coefficient.
    classIds: classCoefficients.map((cc) => cc.classId),
  }
}

function toBackendPayload(data: Partial<SubjectInput>) {
  const { classCoefficients, ...rest } = data
  return {
    ...rest,
    ...(classCoefficients !== undefined
      ? {
          classCoefficients: classCoefficients.map((cc) => ({
            classId: Number(cc.classId),
            coefficient: cc.coefficient,
          })),
        }
      : {}),
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
