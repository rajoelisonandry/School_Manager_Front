'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

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

export async function getClasses() {
  return await prisma.class.findMany({
    orderBy: { name: 'asc' }
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
  classIds: string[]
}) {
  const teacher = await prisma.teacher.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      specialty: data.specialty,
      hourlyRate: data.hourlyRate,
      hireDate: data.hireDate,
      classes: {
        create: data.classIds.map(classId => ({
          classId
        }))
      }
    }
  })
  revalidatePath('/dashboard/teachers')
  return teacher
}

export async function updateTeacher(id: string, data: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  specialty?: string
  hourlyRate?: number
  status?: string
  classIds?: string[]
}) {
  // Update teacher basic info
  const teacher = await prisma.teacher.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      specialty: data.specialty,
      hourlyRate: data.hourlyRate,
      status: data.status
    }
  })

  // Update class assignments if provided
  if (data.classIds !== undefined) {
    // Delete existing class assignments
    await prisma.teacherClass.deleteMany({
      where: { teacherId: id }
    })

    // Create new class assignments
    if (data.classIds.length > 0) {
      await prisma.teacherClass.createMany({
        data: data.classIds.map(classId => ({
          teacherId: id,
          classId
        }))
      })
    }
  }

  revalidatePath('/dashboard/teachers')
  return teacher
}

export async function deleteTeacher(id: string) {
  await prisma.teacher.delete({
    where: { id }
  })
  revalidatePath('/dashboard/teachers')
}
