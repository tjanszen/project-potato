import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '../lib/api'

interface User {
  id: string
  email: string
  timezone: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, timezone: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = user !== null

  // Check authentication status on app load and store in state
  const checkAuth = async () => {
    try {
      const response = await apiClient.getProfile()
      if (!response.error && (response as any).user) {
        setUser((response as any).user)
      } else {
        setUser(null)
      }
    } catch (error) {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Login function with proper error handling
  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password)
      
      if (response.error) {
        return { success: false, error: response.error }
      }

      // After successful login, fetch user profile
      await checkAuth()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    }
  }

  // Signup function with automatic login
  const signup = async (email: string, password: string, timezone: string) => {
    try {
      const response = await apiClient.signup(email, password, timezone)
      
      if (response.error) {
        return { success: false, error: response.error }
      }

      // After successful signup, user is automatically logged in
      await checkAuth()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Signup failed' 
      }
    }
  }

  // Logout function with proper session destruction
  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      // Even if logout API fails, clear client state
      console.error('Logout API error:', error)
    } finally {
      // Always clear client state
      setUser(null)
    }
  }

  // Check authentication on app load
  useEffect(() => {
    checkAuth()
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}