'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendPaymentTypeRate {
  id: number
  paymentType: { id: number; name: string }
  schoolClass: { id: number; name: string }
  year: number
  amount: number
}

export interface PaymentTypeRateInput {
  paymentTypeId: string
  classId: string
  year: number
  amount: number
}

function toFrontRate(rate: BackendPaymentTypeRate) {
  return {
    id: String(rate.id),
    paymentTypeId: String(rate.paymentType.id),
    paymentTypeName: rate.paymentType.name,
    classId: String(rate.schoolClass.id),
    className: rate.schoolClass.name,
    year: rate.year,
    amount: rate.amount,
  }
}

function toBackendPayload(data: Partial<PaymentTypeRateInput>) {
  const { paymentTypeId, classId, ...rest } = data
  return {
    ...rest,
    ...(paymentTypeId !== undefined ? { paymentTypeId: Number(paymentTypeId) } : {}),
    ...(classId !== undefined ? { classId: Number(classId) } : {}),
  }
}

export async function getPaymentTypeRates() {
  const rates = await backendFetch<BackendPaymentTypeRate[]>('/payment-type-rates')
  return rates
    .map(toFrontRate)
    .sort((a, b) => b.year - a.year || a.className.localeCompare(b.className))
}

export async function createPaymentTypeRate(data: PaymentTypeRateInput) {
  await backendFetch('/payment-type-rates', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/payment-type-rates')
}

export async function updatePaymentTypeRate(id: string, data: Partial<PaymentTypeRateInput>) {
  await backendFetch(`/payment-type-rates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toBackendPayload(data)),
  })
  revalidatePath('/dashboard/payment-type-rates')
}

export async function deletePaymentTypeRate(id: string) {
  await backendFetch(`/payment-type-rates/${id}`, {
    method: 'DELETE',
  })
  revalidatePath('/dashboard/payment-type-rates')
}
