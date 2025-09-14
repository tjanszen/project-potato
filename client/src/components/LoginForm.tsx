import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToSignup?: () => void
}

interface FormData {
  email: string
  password: string
}

interface ValidationErrors {
  email?: string
  password?: string
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const { login } = useAuth()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showError('Validation Error', 'Please fix the errors above before submitting')
      return
    }

    setIsSubmitting(true)

    const result = await login(formData.email, formData.password)

    if (result.success) {
      showSuccess('Login Successful!', 'Welcome back!')
      setFormData({ email: '', password: '' })
      setErrors({})
      onSuccess?.()
    } else {
      showError('Login Failed', result.error || 'Unable to log in. Please check your credentials.')
    }

    setIsSubmitting(false)
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Sign In
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Email:
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
            data-testid="input-login-email"
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${errors.email ? '#dc3545' : '#ddd'}`,
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
          {errors.email && (
            <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
              {errors.email}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Password:
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter your password"
            data-testid="input-login-password"
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${errors.password ? '#dc3545' : '#ddd'}`,
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
          {errors.password && (
            <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
              {errors.password}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="button-login-submit"
          style={{
            padding: '12px',
            backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>


        {onSwitchToSignup && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: '#666' }}>Don't have an account? </span>
            <button
              type="button"
              onClick={onSwitchToSignup}
              data-testid="button-switch-signup"
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign up here
            </button>
          </div>
        )}
      </form>
    </div>
  )
}