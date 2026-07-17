'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendStudent {
  id: number
  matricule: string
  lastName: string
  firstName: string
  dateOfBirth: string
  placeOfBirth: string
  gender: string
  status: string
  fatherName?: string
  fatherProfession?: string
  motherName?: string
  motherProfession?: string
  address: string
  phones: string[]
  schoolClass?: { id: number }
}

export interface StudentInput {
  matricule: string
  firstName: string
  lastName: string
  dateOfBirth: string
  placeOfBirth: string
  gender: string
  status?: string
  address: string
  phones: string[]
  fatherName?: string
  fatherProfession?: string
  motherName?: string
  motherProfession?: string
  classId: string
}

function toFrontStudent(student: BackendStudent) {
  return {
    id: String(student.id),
    matricule: student.matricule,
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth,
    placeOfBirth: student.placeOfBirth,
    gender: student.gender,
    status: student.status,
    address: student.address,
    phones: student.phones ?? [],
    fatherName: student.fatherName ?? '',
    fatherProfession: student.fatherProfession ?? '',
    motherName: student.motherName ?? '',
    motherProfession: student.motherProfession ?? '',
    classId: student.schoolClass ? String(student.schoolClass.id) : '',
  }
}

function toBackendPayload(data: Partial<StudentInput>) {
  const { classId, ...rest } = data
  return {
    ...rest,
    ...(classId !== undefined ? { classId: Number(classId) } : {}),
  }
}

export async function getStudents() {
  const students = await backendFetch<BackendStudent[]>('/students')
  return students
    .map(toFrontStudent)
    .sort((a, b) => a.lastName.localeCompare(b.lastName))
}

export async function createStudent(data: StudentInput) {
  await backendFetch('/students', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/students')
}

export async function updateStudent(id: string, data: Partial<StudentInput>) {
  await backendFetch(`/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/students')
}

export async function deleteStudent(id: string) {
  await backendFetch(`/students/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/students')
}
