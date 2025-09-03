import { useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../contexts/AuthContext'
import { LoginForm } from '../components/LoginForm'
import { SignupForm } from '../components/SignupForm'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const [, setLocation] = useLocation()
  const { isAuthenticated } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')

  // Redirect to home if already authenticated
  if (isAuthenticated) {
    setLocation('/')
    return null
  }

  const handleAuthSuccess = () => {
    // Redirect to home page after successful authentication
    setLocation('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#333',
            marginBottom: '10px'
          }}>
            🥔 Potato No Drink Tracker
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Track your alcohol-free days
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <button
              onClick={() => setMode('login')}
              data-testid="button-auth-mode-login"
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: mode === 'login' ? 'white' : 'transparent',
                color: mode === 'login' ? '#333' : '#666',
                boxShadow: mode === 'login' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              data-testid="button-auth-mode-signup"
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: mode === 'signup' ? 'white' : 'transparent',
                color: mode === 'signup' ? '#333' : '#666',
                boxShadow: mode === 'signup' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              Sign Up
            </button>
          </div>
        </div>

        {mode === 'login' ? (
          <LoginForm 
            onSuccess={handleAuthSuccess}
            onSwitchToSignup={() => setMode('signup')}
          />
        ) : (
          <SignupForm 
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  )
}