import { useState } from 'react'

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

const SignupForm = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    timezone: 'America/New_York'
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
    setMessage(null)

    // Block invalid input client-side before submission
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors above before submitting' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `✅ User created successfully! User ID: ${result.user.id}` 
        })
        // Reset form on success
        setFormData({ email: '', password: '', timezone: 'America/New_York' })
        setErrors({})
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${result.error || 'Signup failed'}` 
        })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '❌ Network error - make sure the backend server is running on port 3000' 
      })
    } finally {
      setIsSubmitting(false)
    }
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
    'Asia/Tokyo',
    'Australia/Sydney',
    'UTC'
  ]

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Email:
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="test@example.com"
          style={{
            width: '100%',
            padding: '8px',
            border: `1px solid ${errors.email ? '#dc3545' : '#ddd'}`,
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        {errors.email && (
          <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
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
          style={{
            width: '100%',
            padding: '8px',
            border: `1px solid ${errors.password ? '#dc3545' : '#ddd'}`,
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        {errors.password && (
          <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
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
          style={{
            width: '100%',
            padding: '8px',
            border: `1px solid ${errors.timezone ? '#dc3545' : '#ddd'}`,
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {timezones.map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
        {errors.timezone && (
          <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
            {errors.timezone}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '12px',
          backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginTop: '10px'
        }}
      >
        {isSubmitting ? 'Creating User...' : 'Sign Up'}
      </button>

      {message && (
        <div
          style={{
            padding: '12px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            color: message.type === 'success' ? '#155724' : '#721c24',
            fontSize: '14px',
            marginTop: '10px'
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }}>
        <strong>Testing Notes:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
          <li>Make sure feature flag is enabled above</li>
          <li>Check browser dev tools for API request logs</li>
          <li>Check database for user creation after successful signup</li>
        </ul>
      </div>
    </form>
  )
}

export default SignupForm