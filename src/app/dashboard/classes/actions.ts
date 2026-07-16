'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getClasses() {
  return await prisma.class.findMany({
    include: {
      _count: {
        select: { students: true }
      }
    },
    orderBy: { name: 'asc' }
  })
}

export async function createClass(data: {
  name: string
  level: string
  capacity: number
}) {
  await prisma.class.create({
    data
  })
  revalidatePath('/dashboard/classes')
}

export async function updateClass(id: string, data: {
  name?: string
  level?: string
  capacity?: number
}) {
  await prisma.class.update({
    where: { id },
    data
  })
  revalidatePath('/dashboard/classes')
}

export async function deleteClass(id: string) {
  await prisma.class.delete({
    where: { id }
  })
  revalidatePath('/dashboard/classes')
}
