'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendTeacher {
  id: number
  matricule: string
  lastName: string
  firstName: string
  gender: string
  status: string
  subjects: { id: number; name: string }[]
  classes: { id: number; name: string }[]
  email?: string
  phones: string[]
  createdAt: string
}

export interface TeacherInput {
  matricule: string
  firstName: string
  lastName: string
  gender: string
  status?: string
  subjectIds: string[]
  classIds: string[]
  email?: string
  phones: string[]
}

function toFrontTeacher(teacher: BackendTeacher) {
  return {
    id: String(teacher.id),
    matricule: teacher.matricule,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    gender: teacher.gender,
    status: teacher.status,
    subjectIds: (teacher.subjects ?? []).map((s) => String(s.id)),
    subjectNames: (teacher.subjects ?? []).map((s) => s.name),
    classIds: (teacher.classes ?? []).map((c) => String(c.id)),
    classNames: (teacher.classes ?? []).map((c) => c.name),
    email: teacher.email ?? '',
    phones: teacher.phones ?? [],
    createdAt: teacher.createdAt,
  }
}

function toBackendPayload(data: Partial<TeacherInput>) {
  const { subjectIds, classIds, ...rest } = data
  return {
    ...rest,
    ...(subjectIds !== undefined ? { subjectIds: subjectIds.map(Number) } : {}),
    ...(classIds !== undefined ? { classIds: classIds.map(Number) } : {}),
  }
}

export async function getTeachers() {
  const teachers = await backendFetch<BackendTeacher[]>('/teachers')
  return teachers.map(toFrontTeacher)
}

export async function createTeacher(data: TeacherInput) {
  await backendFetch('/teachers', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/teachers')
}

export async function updateTeacher(id: string, data: Partial<TeacherInput>) {
  await backendFetch(`/teachers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/teachers')
}

export async function deleteTeacher(id: string) {
  await backendFetch(`/teachers/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/teachers')
}
