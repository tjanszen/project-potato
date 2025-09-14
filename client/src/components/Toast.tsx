import React, { useState, useEffect } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface ToastProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Auto-remove after duration
    const duration = toast.duration || 4000
    const timer = setTimeout(() => {
      handleRemove()
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.duration])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // Match animation duration
  }

  const getToastStyles = () => {
    const baseStyles = {
      transform: isVisible && !isRemoving ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible && !isRemoving ? 1 : 0,
      transition: 'all 0.3s ease-in-out',
      marginBottom: '12px',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      maxWidth: '400px',
      wordWrap: 'break-word' as const,
      position: 'relative' as const,
      cursor: 'pointer'
    }

    const typeStyles = {
      success: {
        backgroundColor: '#d4f4dd',
        border: '1px solid #4caf50',
        color: '#2e7d32'
      },
      error: {
        backgroundColor: '#ffeaea',
        border: '1px solid #f44336',
        color: '#d32f2f'
      },
      warning: {
        backgroundColor: '#fff3cd',
        border: '1px solid #ff9800',
        color: '#f57c00'
      },
      info: {
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        color: '#1976d2'
      }
    }

    return { ...baseStyles, ...typeStyles[toast.type] }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  return (
    <div
      style={getToastStyles()}
      onClick={handleRemove}
      data-testid={`toast-${toast.type}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>
          {getIcon()}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: toast.message ? '4px' : 0 }}>
            {toast.title}
          </div>
          {toast.message && (
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              {toast.message}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleRemove()
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0',
            opacity: 0.6,
            flexShrink: 0
          }}
          data-testid="toast-close"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default Toast