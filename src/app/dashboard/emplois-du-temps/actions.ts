'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendTimetableEntry {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
  room?: string
  schoolClass: { id: number; name: string }
  teacher: { id: number; firstName: string; lastName: string } | null
  subject: { id: number; name: string }
}

export interface TimetableEntryInput {
  classId: string
  teacherId?: string
  subjectId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room?: string
}

function toFrontEntry(entry: BackendTimetableEntry) {
  return {
    id: String(entry.id),
    classId: String(entry.schoolClass.id),
    teacherId: entry.teacher ? String(entry.teacher.id) : '',
    teacherName: entry.teacher ? `${entry.teacher.lastName} ${entry.teacher.firstName}` : '',
    subjectId: String(entry.subject.id),
    subjectName: entry.subject.name,
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    room: entry.room ?? '',
  }
}

function toBackendPayload(data: Partial<TimetableEntryInput>) {
  const { classId, teacherId, subjectId, ...rest } = data
  return {
    ...rest,
    ...(classId !== undefined ? { classId: Number(classId) } : {}),
    ...(teacherId !== undefined ? { teacherId: teacherId ? Number(teacherId) : null } : {}),
    ...(subjectId !== undefined ? { subjectId: Number(subjectId) } : {}),
  }
}

export async function getTimetableEntries() {
  const entries = await backendFetch<BackendTimetableEntry[]>('/timetable-entries')
  return entries.map(toFrontEntry)
}

export async function createTimetableEntry(data: TimetableEntryInput) {
  await backendFetch('/timetable-entries', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/emplois-du-temps')
}

export async function updateTimetableEntry(id: string, data: Partial<TimetableEntryInput>) {
  await backendFetch(`/timetable-entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/emplois-du-temps')
}

export async function deleteTimetableEntry(id: string) {
  await backendFetch(`/timetable-entries/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/emplois-du-temps')
}

export interface UnfilledSlot {
  classId: string
  className: string
  dayOfWeek: string
  startTime: string
  endTime: string
}

export interface GenerateResult {
  createdCount: number
  unfilled: UnfilledSlot[]
}

interface BackendGenerateResult {
  createdCount: number
  unfilled: {
    classId: number
    className: string
    dayOfWeek: string
    startTime: string
    endTime: string
  }[]
}

// Régénère entièrement l'emploi du temps des classes de collège/lycée à partir des
// disponibilités des professeurs : repart de zéro puis remplit chaque créneau.
export async function generateTimetable(): Promise<GenerateResult> {
  const result = await backendFetch<BackendGenerateResult>('/timetable-entries/generate', {
    method: 'POST',
  })
  revalidatePath('/dashboard/emplois-du-temps')
  return {
    createdCount: result.createdCount,
    unfilled: result.unfilled.map((u) => ({ ...u, classId: String(u.classId) })),
  }
}

interface BackendAvailability {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
  teacher: { id: number }
}

export interface AvailabilityInput {
  dayOfWeek: string
  startTime: string
  endTime: string
}

export interface TeacherAvailabilityEntry extends AvailabilityInput {
  teacherId: string
}

export async function getTeacherAvailabilities(): Promise<TeacherAvailabilityEntry[]> {
  const availabilities = await backendFetch<BackendAvailability[]>('/teacher-availabilities')
  return availabilities.map((a) => ({
    teacherId: String(a.teacher.id),
    dayOfWeek: a.dayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
  }))
}

export async function replaceTeacherAvailabilities(
  teacherId: string,
  availabilities: AvailabilityInput[]
) {
  await backendFetch(`/teacher-availabilities/teacher/${teacherId}`, {
    method: 'PUT',
    body: JSON.stringify({ availabilities }),
  })
  revalidatePath('/dashboard/emplois-du-temps')
}
