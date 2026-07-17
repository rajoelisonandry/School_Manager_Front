'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendPaymentType {
  id: number
  name: string
  amount: number
  schoolClass?: { id: number; name: string } | null
}

export interface PaymentTypeInput {
  name: string
  amount: number
  classId?: string | null
}

function toFrontPaymentType(pt: BackendPaymentType) {
  return {
    id: String(pt.id),
    name: pt.name,
    amount: pt.amount,
    classId: pt.schoolClass ? String(pt.schoolClass.id) : null,
    className: pt.schoolClass?.name ?? null,
  }
}

function toBackendPayload(data: Partial<PaymentTypeInput>) {
  const { classId, ...rest } = data
  return {
    ...rest,
    ...(classId !== undefined
      ? { classId: classId === null || classId === '' ? null : Number(classId) }
      : {}),
  }
}

export async function getPaymentTypes() {
  const types = await backendFetch<BackendPaymentType[]>('/payment-types')
  return types.map(toFrontPaymentType).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createPaymentType(data: PaymentTypeInput) {
  await backendFetch('/payment-types', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/payment-types')
}

export async function updatePaymentType(id: string, data: Partial<PaymentTypeInput>) {
  await backendFetch(`/payment-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/payment-types')
}

export async function deletePaymentType(id: string) {
  await backendFetch(`/payment-types/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/payment-types')
}
