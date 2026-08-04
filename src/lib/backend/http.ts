import { cookies } from 'next/headers';

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3001';
export const AUTH_COOKIE_NAME = 'token';

export class BackendError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function backendFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new BackendError(
      `Backend request failed (${res.status}): ${body}`,
      res.status,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function backendUpload(
  path: string,
  formData: FormData,
): Promise<{ url: string }> {
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
    },
    body: formData,
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new BackendError(
      `Backend request failed (${res.status}): ${body}`,
      res.status,
    );
  }

  return res.json() as Promise<{ url: string }>;
}
