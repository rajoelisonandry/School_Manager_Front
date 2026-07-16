import { prisma } from '@/lib/db'

export async function getTeachers() {
  return await prisma.teacher.findMany({
    include: {
      classes: {
        include: {
          class: true
        }
      }
    },
    orderBy: { lastName: 'asc' }
  })
}

export async function getTeacherById(id: string) {
  return await prisma.teacher.findUnique({
    where: { id },
    include: {
      classes: {
        include: {
          class: true
        }
      }
    }
  })
}

export async function createTeacher(data: {
  firstName: string
  lastName: string
  email: string
  phone: string
  specialty: string
  hourlyRate: number
  hireDate: Date
}) {
  return await prisma.teacher.create({
    data
  })
}

export async function updateTeacher(id: string, data: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  specialty?: string
  hourlyRate?: number
  status?: string
}) {
  return await prisma.teacher.update({
    where: { id },
    data
  })
}

export async function deleteTeacher(id: string) {
  return await prisma.teacher.delete({
    where: { id }
  })
}

export async function assignTeacherToClass(teacherId: string, classId: string) {
  return await prisma.teacherClass.create({
    data: {
      teacherId,
      classId
    }
  })
}

export async function removeTeacherFromClass(teacherId: string, classId: string) {
  return await prisma.teacherClass.deleteMany({
    where: {
      teacherId,
      classId
    }
  })
}
