// API client configuration for authentication and CORS
// Use localhost:3000 in dev (Codespaces), empty in prod (Replit proxy handles it)
const API_BASE_URL =
  import.meta.env.MODE === 'development'
    ? 'https://upgraded-broccoli-rwrgrgqr6g2xxg9-3000.app.github.dev'
    : ''


export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// League data structure (matches LeagueCardProps from components)
export interface League {
  id: number
  image_url?: string
  tag: string
  title: string
  description: string
  users: number
  trending: boolean
}

// Leagues API response structure
export interface LeaguesResponse {
  leagues: League[]
  count: number
  source: string
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
    return this.request(`/api/admin/toggle-flag/${flag}`, {
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

  // Leagues endpoint (Phase 2.1 - CSV Integration)
  async getLeagues(): Promise<ApiResponse<LeaguesResponse>> {
    console.log("Phase 2.1: getLeagues API client method available")
    return this.request<LeaguesResponse>('/api/leagues')
  }

  // League membership endpoints
  async joinLeague(leagueId: number) {
    console.log("LeagueMembershipService API client initialized")
    return this.request(`/api/leagues/${leagueId}/memberships`, {
      method: 'POST',
    })
  }

  async leaveLeague(leagueId: number) {
    return this.request(`/api/leagues/${leagueId}/memberships`, {
      method: 'DELETE',
    })
  }

  async getLeagueMembership(leagueId: number) {
    return this.request(`/api/leagues/${leagueId}/membership`)
  }

  // Health check
  async health() {
    return this.request('/health')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()