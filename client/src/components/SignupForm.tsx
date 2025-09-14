import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface SignupFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

interface FormData {
  email: string
  password: string
  timezone: string
}

interface ValidationErrors {
  email?: string
  password?: string
  timezone?: string
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const { signup } = useAuth()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    timezone: 'America/New_York'
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Timezone validation
    if (!formData.timezone) {
      newErrors.timezone = 'Timezone is required'
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

    const result = await signup(formData.email, formData.password, formData.timezone)

    if (result.success) {
      showSuccess('Account Created!', 'Welcome to Potato No Drink Tracker! You are now logged in.')
      setFormData({ email: '', password: '', timezone: 'America/New_York' })
      setErrors({})
      onSuccess?.()
    } else {
      showError('Signup Failed', result.error || 'Unable to create account. Please try again.')
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

  const timezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'UTC'
  ]

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Create Account
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
            data-testid="input-signup-email"
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
            placeholder="Enter password (min 6 characters)"
            data-testid="input-signup-password"
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

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Timezone:
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            data-testid="select-signup-timezone"
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${errors.timezone ? '#dc3545' : '#ddd'}`,
              borderRadius: '6px',
              fontSize: '16px'
            }}
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          {errors.timezone && (
            <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
              {errors.timezone}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="button-signup-submit"
          style={{
            padding: '12px',
            backgroundColor: isSubmitting ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>


        {onSwitchToLogin && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: '#666' }}>Already have an account? </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              data-testid="button-switch-login"
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign in here
            </button>
          </div>
        )}
      </form>
    </div>
  )
}