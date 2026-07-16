import { prisma } from '@/lib/db'

export async function getTuitions() {
  return await prisma.tuition.findMany({
    include: {
      student: {
        include: {
          class: true
        }
      },
      payments: true
    },
    orderBy: { schoolYear: 'desc' }
  })
}

export async function getTuitionById(id: string) {
  return await prisma.tuition.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          class: true
        }
      },
      payments: true
    }
  })
}

export async function getTuitionByStudent(studentId: string) {
  return await prisma.tuition.findMany({
    where: { studentId },
    include: {
      payments: true
    },
    orderBy: { schoolYear: 'desc' }
  })
}

export async function createTuition(data: {
  studentId: string
  schoolYear: string
  totalAmount: number
  payments?: Array<{
    month: string
    amount: number
    status: string
    paymentDate?: Date
  }>
}) {
  return await prisma.tuition.create({
    data: {
      studentId: data.studentId,
      schoolYear: data.schoolYear,
      totalAmount: data.totalAmount,
      payments: data.payments ? {
        create: data.payments
      } : undefined
    }
  })
}

export async function updatePayment(paymentId: string, data: {
  status?: string
  paymentDate?: Date
}) {
  return await prisma.payment.update({
    where: { id: paymentId },
    data
  })
}

export async function updateTuitionTotal(tuitionId: string, totalPaid: number) {
  return await prisma.tuition.update({
    where: { id: tuitionId },
    data: { totalPaid }
  })
}
