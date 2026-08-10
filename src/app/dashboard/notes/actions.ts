'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendGrade {
  id: number
  schoolYear: string
  trimester: number
  type: string
  label: string
  value: number
  student: { id: number }
  subject: { id: number }
  schoolClass: { id: number }
}

export interface Grade {
  id: string
  studentId: string
  subjectId: string
  classId: string
  schoolYear: string
  trimester: number
  type: string
  label: string
  value: number
}

function toFrontGrade(grade: BackendGrade): Grade {
  return {
    id: String(grade.id),
    studentId: String(grade.student.id),
    subjectId: String(grade.subject.id),
    classId: String(grade.schoolClass.id),
    schoolYear: grade.schoolYear,
    trimester: grade.trimester,
    type: grade.type,
    label: grade.label,
    value: grade.value,
  }
}

export interface GetGradesFilters {
  classId?: string
  subjectId?: string
  schoolYear?: string
  trimester?: number
  type?: string
  label?: string
}

export async function getGrades(filters: GetGradesFilters): Promise<Grade[]> {
  const params = new URLSearchParams()
  if (filters.classId) params.set('classId', filters.classId)
  if (filters.subjectId) params.set('subjectId', filters.subjectId)
  if (filters.schoolYear) params.set('schoolYear', filters.schoolYear)
  if (filters.trimester !== undefined) params.set('trimester', String(filters.trimester))
  if (filters.type) params.set('type', filters.type)
  if (filters.label) params.set('label', filters.label)
  const grades = await backendFetch<BackendGrade[]>(`/grades?${params.toString()}`)
  return grades.map(toFrontGrade)
}

export interface GetSessionsFilters {
  classId: string
  subjectId: string
  schoolYear: string
  trimester: number
  type: string
}

// Libellés déjà utilisés (ex: ["DS1", "DS2"]) pour cette matière/classe/trimestre/type,
// afin de proposer de reprendre une session existante plutôt que d'en recréer une.
export async function getGradeSessions(filters: GetSessionsFilters): Promise<string[]> {
  const params = new URLSearchParams({
    classId: filters.classId,
    subjectId: filters.subjectId,
    schoolYear: filters.schoolYear,
    trimester: String(filters.trimester),
    type: filters.type,
  })
  return backendFetch<string[]>(`/grades/sessions?${params.toString()}`)
}

export interface UpsertGradesInput {
  classId: string
  subjectId: string
  schoolYear: string
  trimester: number
  type: string
  label: string
  entries: { studentId: string; value: number }[]
}

export async function upsertGrades(data: UpsertGradesInput) {
  await backendFetch('/grades/bulk', {
    method: 'POST',
    body: JSON.stringify({
      classId: Number(data.classId),
      subjectId: Number(data.subjectId),
      schoolYear: data.schoolYear,
      trimester: data.trimester,
      type: data.type,
      label: data.label,
      entries: data.entries.map((e) => ({ studentId: Number(e.studentId), value: e.value })),
    }),
  })
  revalidatePath('/dashboard/notes')
}

export async function deleteGrade(id: string) {
  await backendFetch(`/grades/${id}`, { method: 'DELETE' })
  revalidatePath('/dashboard/notes')
}

export interface BulletinGradeDetail {
  label: string
  type: string
  value: number
}

export interface BulletinSubjectRow {
  subjectId: string
  subjectName: string
  coefficient: number
  dsAverage: number | null
  examValue: number | null
  subjectAverage: number | null
  classSubjectAverage: number | null
  // Chaque note individuelle (un par DS + l'examen), pour le détail complet du bulletin.
  grades: BulletinGradeDetail[]
}

export interface Bulletin {
  studentId: string
  matricule: string
  firstName: string
  lastName: string
  subjects: BulletinSubjectRow[]
  generalAverage: number | null
  classGeneralAverage: number | null
  rank: number | null
  totalStudents: number
}

interface BackendBulletin {
  studentId: number
  matricule: string
  firstName: string
  lastName: string
  subjects: {
    subjectId: number
    subjectName: string
    coefficient: number
    dsAverage: number | null
    examValue: number | null
    subjectAverage: number | null
    classSubjectAverage: number | null
    grades: BulletinGradeDetail[]
  }[]
  generalAverage: number | null
  classGeneralAverage: number | null
  rank: number | null
  totalStudents: number
}

// Moyennes par matière, moyenne générale pondérée et rang, calculés côté backend
// pour chaque élève de la classe sur un trimestre donné.
export async function getBulletins(
  classId: string,
  schoolYear: string,
  trimester: number
): Promise<Bulletin[]> {
  const params = new URLSearchParams({ classId, schoolYear, trimester: String(trimester) })
  const bulletins = await backendFetch<BackendBulletin[]>(`/grades/bulletins?${params.toString()}`)
  return bulletins.map((b) => ({
    studentId: String(b.studentId),
    matricule: b.matricule,
    firstName: b.firstName,
    lastName: b.lastName,
    subjects: b.subjects.map((s) => ({ ...s, subjectId: String(s.subjectId) })),
    generalAverage: b.generalAverage,
    classGeneralAverage: b.classGeneralAverage,
    rank: b.rank,
    totalStudents: b.totalStudents,
  }))
}
