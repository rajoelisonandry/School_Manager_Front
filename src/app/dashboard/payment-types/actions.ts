'use server'

import { backendFetch } from '@/lib/backend/http'
import { revalidatePath } from 'next/cache'

interface BackendPaymentType {
  id: number
  name: string
  amount: number
  periodMonths: number | null
  schoolClasses: { id: number; name: string }[]
}

export interface PaymentTypeInput {
  name: string
  amount: number
  // Nombre de mois couverts (positionnement dans le carnet de correspondance).
  periodMonths?: number | null
  // Classes concernées ; tableau vide = toutes les classes.
  classIds: string[]
}

function toFrontPaymentType(pt: BackendPaymentType) {
  const schoolClasses = pt.schoolClasses ?? []
  return {
    id: String(pt.id),
    name: pt.name,
    amount: pt.amount,
    periodMonths: pt.periodMonths,
    classIds: schoolClasses.map((c) => String(c.id)),
    // Dérivé pour l'affichage dans la liste ("Toutes les classes" si vide).
    classNames: schoolClasses.map((c) => c.name),
  }
}

function toBackendPayload(data: Partial<PaymentTypeInput>) {
  const { classIds, periodMonths, ...rest } = data
  return {
    ...rest,
    ...(classIds !== undefined ? { classIds: classIds.map(Number) } : {}),
    ...(periodMonths !== undefined ? { periodMonths: periodMonths || null } : {}),
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
