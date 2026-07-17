'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendPayment {
  id: number
  student: {
    id: number
    firstName: string
    lastName: string
    matricule: string
  }
  paymentType: {
    id: number
    name: string
  }
  recordedBy: {
    id: number
    name: string
  } | null
  month: string
  year: number
  amountPaid: number
  amountDue: number
  paymentDate: string
}

export interface PaymentInput {
  studentId: string
  paymentTypeId: string
  recordedByUserId?: string
  month: string
  year: number
  amountPaid: number
  amountDue: number
  paymentDate: string
}

function toFrontPayment(payment: BackendPayment) {
  return {
    id: String(payment.id),
    studentId: String(payment.student.id),
    studentName: `${payment.student.firstName} ${payment.student.lastName}`,
    studentMatricule: payment.student.matricule,
    paymentTypeId: String(payment.paymentType.id),
    paymentTypeName: payment.paymentType.name,
    recordedByName: payment.recordedBy?.name ?? null,
    month: payment.month,
    year: payment.year,
    amountPaid: payment.amountPaid,
    amountDue: payment.amountDue,
    paymentDate: payment.paymentDate,
  }
}

function toBackendPayload(data: Partial<PaymentInput>) {
  const { studentId, paymentTypeId, recordedByUserId, ...rest } = data
  return {
    ...rest,
    ...(studentId !== undefined ? { studentId: Number(studentId) } : {}),
    ...(paymentTypeId !== undefined ? { paymentTypeId: Number(paymentTypeId) } : {}),
    ...(recordedByUserId !== undefined ? { recordedByUserId: Number(recordedByUserId) } : {}),
  }
}

export async function getPayments() {
  const payments = await backendFetch<BackendPayment[]>('/payments')
  return payments
    .map(toFrontPayment)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
}

export async function createPayment(data: PaymentInput) {
  const payment = await backendFetch<BackendPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/payments')
  return toFrontPayment(payment)
}

export async function deletePayment(id: string) {
  await backendFetch(`/payments/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/payments')
}
