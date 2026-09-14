// Barcha so'rovlar Vite va Nginx proksi orqali bitta portdan o'tadi
// Bu internet orqali tunnel (Cloudflare/Localtunnel) yoki lokal tarmoqda CORS va Mixed-Content xatolarini to'liq bartaraf qiladi
export const API_BASE = '/api/v1';

export class ApiClient {
  private static token: string | null = localStorage.getItem('access_token');

  static setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  static getToken(): string | null {
    return this.token || localStorage.getItem('access_token');
  }

  static logout() {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  static async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Server xatoligi yuz berdi');
    }

    return response.json();
  }
}
