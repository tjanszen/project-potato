// API client configuration for authentication and CORS
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}`,
          message: data.message || 'An error occurred',
        }
      }

      return data
    } catch (error) {
      return {
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Failed to connect to server',
      }
    }
  }

  // Authentication endpoints
  async signup(email: string, password: string, timezone: string) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, timezone }),
    })
  }

  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getProfile() {
    return this.request('/api/me')
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    })
  }

  // Feature flag endpoints
  async getFeatureFlag(flag: string) {
    return this.request(`/api/feature-flags/${flag}`)
  }

  async toggleFeatureFlag(flag: string) {
    return this.request(`/api/feature-flags/${flag}/toggle`, {
      method: 'POST',
    })
  }

  // Calendar endpoints (for future phases)
  async getCalendar(month: string) {
    return this.request(`/api/calendar?month=${month}`)
  }

  async markDay(date: string) {
    return this.request(`/api/days/${date}/no-drink`, {
      method: 'POST',
    })
  }

  async getEvents(limit?: number) {
    const queryParam = limit ? `?limit=${limit}` : ''
    return this.request(`/api/events${queryParam}`)
  }

  // V2 Totals endpoint (Phase 7C-1)
  async getTotals() {
    return this.request('/api/v2/totals')
  }

  // Health check
  async health() {
    return this.request('/health')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()