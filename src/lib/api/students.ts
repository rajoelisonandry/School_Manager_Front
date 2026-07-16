import { prisma } from '@/lib/db'

export async function getStudents() {
  return await prisma.student.findMany({
    include: {
      class: true
    },
    orderBy: { lastName: 'asc' }
  })
}

export async function getStudentById(id: string) {
  return await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      tuitions: {
        include: {
          payments: true
        }
      }
    }
  })
}

export async function getStudentsByClass(classId: string) {
  return await prisma.student.findMany({
    where: { classId },
    include: {
      class: true
    },
    orderBy: { lastName: 'asc' }
  })
}

export async function createStudent(data: {
  matricule: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  placeOfBirth: string
  gender: string
  address: string
  phones: string[]
  fatherName: string
  fatherProfession: string
  motherName: string
  motherProfession: string
  enrollmentDate: Date
  classId: string
}) {
  return await prisma.student.create({
    data
  })
}

export async function updateStudent(id: string, data: {
  matricule?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  placeOfBirth?: string
  gender?: string
  address?: string
  phones?: string[]
  fatherName?: string
  fatherProfession?: string
  motherName?: string
  motherProfession?: string
  enrollmentDate?: Date
  classId?: string
  status?: string
}) {
  return await prisma.student.update({
    where: { id },
    data
  })
}

export async function deleteStudent(id: string) {
  return await prisma.student.delete({
    where: { id }
  })
}
