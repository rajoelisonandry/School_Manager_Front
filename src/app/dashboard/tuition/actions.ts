'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getTuitions() {
  return await prisma.tuition.findMany({
    include: {
      student: {
        include: {
          class: true
        }
      },
      payments: {
        orderBy: { month: 'asc' }
      }
    },
    orderBy: { schoolYear: 'desc' }
  })
}

export async function getStudents() {
  return await prisma.student.findMany({
    include: {
      class: true
    },
    orderBy: { lastName: 'asc' }
  })
}

export async function updatePayment(paymentId: string, data: {
  status: string
  paymentDate: Date
}) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data
  })

  // Recalculate total paid for the tuition
  const tuition = await prisma.tuition.findUnique({
    where: { id: payment.tuitionId },
    include: { payments: true }
  })

  if (tuition) {
    const totalPaid = tuition.payments
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + p.amount, 0)

    await prisma.tuition.update({
      where: { id: payment.tuitionId },
      data: { totalPaid }
    })
  }

  revalidatePath('/dashboard/tuition')
  return payment
}
