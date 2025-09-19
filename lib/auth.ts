// lib/auth.ts

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

export function setToken(t: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', t);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
