import { prisma } from '@/lib/db'

export async function getClasses() {
  return await prisma.class.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function getClassById(id: string) {
  return await prisma.class.findUnique({
    where: { id },
    include: {
      students: true,
      teachers: {
        include: {
          teacher: true
        }
      }
    }
  })
}

export async function createClass(data: {
  name: string
  level: string
  capacity: number
}) {
  return await prisma.class.create({
    data
  })
}

export async function updateClass(id: string, data: {
  name?: string
  level?: string
  capacity?: number
  currentStudents?: number
}) {
  return await prisma.class.update({
    where: { id },
    data
  })
}

export async function deleteClass(id: string) {
  return await prisma.class.delete({
    where: { id }
  })
}
