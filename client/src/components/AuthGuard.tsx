import { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <LoadingSpinner />
      </div>
    )
  }

  // Redirect to authentication page if not logged in
  if (!isAuthenticated) {
    return fallback || (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>
            Authentication Required
          </h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Please sign in to access this page.
          </p>
          <button
            onClick={() => window.location.href = '/auth'}
            data-testid="button-redirect-auth"
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  // Render protected content if authenticated
  return <>{children}</>
}