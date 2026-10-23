export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}
export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  year: number;
  fuel: string;
  color: string;
  createdAt: string;
}
export const categories = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Truck', 'Convertible', 'Wagon'];
export const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('forecourt-token');
  const response = await fetch('/api' + path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && token && !path.startsWith('/auth/login'))
      window.dispatchEvent(new Event('session-expired'));
    throw new Error(
      data.details?.length
        ? data.details
            .map((d: { field: string; message: string }) => `${d.field}: ${d.message}`)
            .join(' · ')
        : (data.error ?? 'Something went wrong. Please try again.'),
    );
  }
  return data as T;
}
